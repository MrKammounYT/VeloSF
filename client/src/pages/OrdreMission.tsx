import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ErreurApi } from '../api';
import { Alerte, Champ, EnTete, PiedDePage, heure, jjmmaaaa, useDonnees, versIso } from '../composants/commun';

interface Ordre {
  id: number; itineraire_id: number; technicien_id: number; camion_id: number | null; date_heure: string;
  consignes: string | null; statut: string; technicien: string; camion: string | null;
}
interface It { id: number; libelle: string; nb_etapes: number; velos: number }
const STATUT: Record<string, [string, string]> = {
  brouillon: ['Brouillon', ''], envoye: ['Envoyé', 'ok'], en_cours: ['En cours', 'warn'], termine: ['Terminé', 'ok'],
};

/** Écran 11 – CU11 donner un ordre de mission. */
export function OrdreMission() {
  const [params] = useSearchParams();
  const { donnees, recharger } = useDonnees(() =>
    api.get<{ ordres: Ordre[]; techniciens: { id: number; nom: string }[]; camions: { id: number; nom: string; capacite: number | null }[] }>('/ordres'));
  const its = useDonnees(() => api.get<{ itineraires: It[] }>('/itineraires'));
  const vide = { technicien_id: '', itineraire_id: params.get('itineraire') ?? '', camion_id: '', date: '', consignes: '' };
  const [f, setF] = useState(vide);
  const [edition, setEdition] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string; champ?: string } | null>(null);

  useEffect(() => {
    if (!donnees || !its.donnees) return;
    setF((x) => ({
      ...x,
      technicien_id: x.technicien_id || String(donnees.techniciens[0]?.id ?? ''),
      camion_id: x.camion_id || String(donnees.camions[0]?.id ?? ''),
      itineraire_id: x.itineraire_id || String(its.donnees!.itineraires[0]?.id ?? ''),
    }));
  }, [donnees, its.donnees]);

  const itineraire = its.donnees?.itineraires.find((i) => String(i.id) === f.itineraire_id);
  const technicien = donnees?.techniciens.find((t) => String(t.id) === f.technicien_id);
  const camion = donnees?.camions.find((c) => String(c.id) === f.camion_id);
  const statutApercu = 'brouillon';

  const dateIso = useMemo(() => {
    const m = f.date.trim().match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const j = versIso(m[1]);
    return j && +m[2] < 24 && +m[3] < 60 ? `${j}T${m[2].padStart(2, '0')}:${m[3]}` : null;
  }, [f.date]);

  const envoyer = async (envoi: boolean) => {
    setMsg(null);
    if (!dateIso) return setMsg({ type: 'bad', texte: 'Date et heure invalides : utilisez le format JJ/MM/AAAA hh:mm.', champ: 'date_heure' });
    const corps = {
      itineraire_id: Number(f.itineraire_id), technicien_id: Number(f.technicien_id),
      camion_id: f.camion_id ? Number(f.camion_id) : null, date_heure: dateIso, consignes: f.consignes, envoyer: envoi,
    };
    try {
      if (edition) await api.put(`/ordres/${edition}`, corps);
      else await api.post('/ordres', corps);
      setMsg({ type: 'ok', texte: envoi ? `Ordre envoyé à ${technicien?.nom} : il apparaît dans « Ma mission ».` : 'Ordre enregistré en brouillon.' });
      setEdition(null);
      setF({ ...vide, technicien_id: f.technicien_id, camion_id: f.camion_id, itineraire_id: f.itineraire_id });
      recharger();
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message, champ: (e as ErreurApi).champ });
    }
  };

  const reprendre = (o: Ordre) => {
    setEdition(o.id);
    setF({
      technicien_id: String(o.technicien_id), itineraire_id: String(o.itineraire_id), camion_id: o.camion_id ? String(o.camion_id) : '',
      date: `${jjmmaaaa(o.date_heure)} ${heure(o.date_heure)}`, consignes: o.consignes ?? '',
    });
    setMsg(null);
  };
  const annulerBrouillon = async (o: Ordre) => {
    if (!confirm('Supprimer ce brouillon ?')) return;
    await api.del(`/ordres/${o.id}`);
    if (edition === o.id) { setEdition(null); setF(vide); }
    recharger();
  };

  const set = (k: keyof typeof vide) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const err = (c: string) => (msg?.type === 'bad' && msg.champ === c ? msg.texte : null);
  return (
    <>
      <EnTete titre="Donner un ordre de mission" sousTitre="Confier un itinéraire à un technicien." />
      <div className="g21">
        <section className="card">
          <h3>{edition ? `Ordre n° ${edition} (brouillon)` : 'Ordre'}</h3>
          <Champ libelle="Technicien" erreur={err('technicien_id')}>
            <span className="in"><select value={f.technicien_id} onChange={set('technicien_id')}>
              {donnees?.techniciens.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select></span>
          </Champ>
          <Champ libelle="Itinéraire" erreur={err('itineraire_id')}>
            <span className="in"><select value={f.itineraire_id} onChange={set('itineraire_id')}>
              {its.donnees?.itineraires.length === 0 && <option value="">Aucun itinéraire : préparez-en un d’abord</option>}
              {its.donnees?.itineraires.map((i) => <option key={i.id} value={i.id}>N° {i.id} · {i.libelle}</option>)}
            </select></span>
          </Champ>
          <div className="g2">
            <Champ libelle="Camion" erreur={err('camion_id')}>
              <span className="in"><select value={f.camion_id} onChange={set('camion_id')}>
                {donnees?.camions.map((c) => <option key={c.id} value={c.id}>{c.nom}{c.capacite ? ` (${c.capacite} vélos)` : ''}</option>)}
              </select></span>
            </Champ>
            <Champ libelle="Date et heure" erreur={err('date_heure')}>
              <span className="in"><input type="text" value={f.date} onChange={set('date')} placeholder="JJ/MM/AAAA hh:mm" /></span>
            </Champ>
          </div>
          <label className="f">Consignes<textarea value={f.consignes} onChange={set('consignes')} placeholder="Instructions pour la mission" /></label>
          {msg && (msg.type === 'ok' || !msg.champ) && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns">
            <button type="button" className="btn p" onClick={() => envoyer(true)} disabled={!f.itineraire_id}>Envoyer l’ordre</button>
            <button type="button" className="btn" onClick={() => envoyer(false)} disabled={!f.itineraire_id}>Enregistrer en brouillon</button>
            <button type="button" className="btn" onClick={() => { setEdition(null); setF(vide); setMsg(null); }}>Annuler</button>
          </div>
        </section>
        <section className="card">
          <h3>Aperçu</h3>
          <div className="li"><b>Mission</b> · {technicien?.nom ?? '—'}</div>
          <div className="li">Départ : entrepôt{camion ? ` · ${camion.nom}` : ''}</div>
          <div className="li">{itineraire ? `${itineraire.nb_etapes} étapes · ${itineraire.velos} vélos à déplacer` : 'Aucun itinéraire choisi'}</div>
          {dateIso && <div className="li">Le {jjmmaaaa(dateIso)} à {heure(dateIso)}</div>}
          <span className={`chip ${STATUT[statutApercu][1]}`} style={{ alignSelf: 'flex-start' }}>{STATUT[statutApercu][0]}</span>
        </section>
      </div>
      <section className="card">
        <h3>Ordres de mission</h3>
        <table>
          <thead><tr><th>N°</th><th>Date</th><th>Technicien</th><th>Itinéraire</th><th>Camion</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            {donnees?.ordres.map((o) => (
              <tr key={o.id} className={edition === o.id ? 'sel' : ''}>
                <td>{o.id}</td>
                <td>{jjmmaaaa(o.date_heure)} {heure(o.date_heure)}</td>
                <td>{o.technicien}</td>
                <td>{its.donnees?.itineraires.find((i) => i.id === o.itineraire_id)?.libelle ?? `N° ${o.itineraire_id}`}</td>
                <td>{o.camion ?? '—'}</td>
                <td><span className={`chip ${STATUT[o.statut][1]}`}>{STATUT[o.statut][0]}</span></td>
                <td>
                  {o.statut === 'brouillon' ? (
                    <span className="acts">
                      <button type="button" className="al" onClick={() => reprendre(o)}>Modifier</button>
                      <button type="button" className="al" onClick={() => annulerBrouillon(o)}>Supprimer</button>
                    </span>
                  ) : <span className="mut">—</span>}
                </td>
              </tr>
            ))}
            {donnees?.ordres.length === 0 && <tr><td colSpan={7} className="vide">Aucun ordre de mission.</td></tr>}
          </tbody>
        </table>
      </section>
      <PiedDePage />
    </>
  );
}
