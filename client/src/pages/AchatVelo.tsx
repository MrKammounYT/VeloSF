import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ErreurApi, type Station } from '../api';
import { Alerte, Champ, EnTete, PiedDePage, useDonnees } from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

interface Reponse {
  derniers: { numero_serie: string; type: string; fournisseur: string }[];
  fournisseurs: { id: number; nom: string }[];
  stations: Station[];
  types: string[];
}

/** Écran 06 – CU2 acheter un vélo. */
export function AchatVelo() {
  const [params] = useSearchParams();
  const rafraichirResume = useRafraichirResume();
  const { donnees, erreur, recharger } = useDonnees(() => api.get<Reponse>('/velos/achat'));
  const vide = { numero_serie: '', fournisseur_id: '', type: '', couleur: '', station_id: params.get('station') ?? '' };
  const [form, setForm] = useState(vide);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string; champ?: string } | null>(null);

  useEffect(() => {
    if (!donnees) return;
    setForm((f) => ({
      ...f,
      fournisseur_id: f.fournisseur_id || String(donnees.fournisseurs[0]?.id ?? ''),
      type: f.type || donnees.types[0],
      station_id: f.station_id || String(donnees.stations.find((s) => s.places_libres > 0)?.id ?? ''),
    }));
  }, [donnees]);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/velos', { ...form, fournisseur_id: Number(form.fournisseur_id), station_id: Number(form.station_id) });
      setMsg({ type: 'ok', texte: `Vélo ${form.numero_serie} enregistré à l’état « disponible ».` });
      setForm((f) => ({ ...f, numero_serie: '', couleur: '' }));
      recharger();
      rafraichirResume();
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };

  const err = (c: string) => (msg?.type === 'bad' && msg.champ === c ? msg.texte : null);
  const set = (k: keyof typeof vide) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <EnTete titre="Acheter un vélo" sousTitre="Enregistrer un vélo acheté auprès d’un fournisseur." />
      <Alerte>{erreur}</Alerte>
      <div className="g21">
        <form className="card" onSubmit={enregistrer} noValidate>
          <h3>Nouveau vélo</h3>
          <div className="g2">
            <Champ libelle="Numéro de série" erreur={err('numero_serie')}>
              <span className="in"><input type="text" value={form.numero_serie} onChange={set('numero_serie')} placeholder="Ex. : VS-0301" /></span>
            </Champ>
            <Champ libelle="Fournisseur" erreur={err('fournisseur_id')}
              aide={<>Fournisseur absent ? <Link to="/fournisseurs">Ajouter un fournisseur</Link></>}>
              <span className="in"><select value={form.fournisseur_id} onChange={set('fournisseur_id')}>
                {donnees?.fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select></span>
            </Champ>
            <Champ libelle="Type">
              <span className="in"><select value={form.type} onChange={set('type')}>
                {donnees?.types.map((t) => <option key={t}>{t}</option>)}
              </select></span>
            </Champ>
            <Champ libelle="Couleur" erreur={err('couleur')}>
              <span className="in"><input type="text" value={form.couleur} onChange={set('couleur')} placeholder="Ex. : Bleu" /></span>
            </Champ>
          </div>
          <Champ libelle="Station d’affectation" erreur={err('station_id')}>
            <span className="in"><select value={form.station_id} onChange={set('station_id')}>
              {donnees?.stations.map((s) => (
                <option key={s.id} value={s.id}>{s.nom} — {s.places_libres > 0 ? `${s.places_libres} place(s) libre(s)` : 'pleine'}</option>
              ))}
            </select></span>
          </Champ>
          {msg && (msg.type === 'ok' || !msg.champ) && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns">
            <button type="submit" className="btn p">Enregistrer l’achat</button>
            <button type="button" className="btn" onClick={() => { setForm({ ...form, numero_serie: '', couleur: '' }); setMsg(null); }}>Annuler</button>
          </div>
        </form>
        <section className="card">
          <h3>Derniers achats</h3>
          <table>
            <thead><tr><th>Série</th><th>Type</th><th>Fournisseur</th></tr></thead>
            <tbody>{donnees?.derniers.map((d) => <tr key={d.numero_serie}><td>{d.numero_serie}</td><td>{d.type}</td><td>{d.fournisseur}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
