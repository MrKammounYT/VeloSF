import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ErreurApi } from '../api';
import { Icone } from '../icones';
import { Alerte, Champ, EnTete, PiedDePage, jjmmaaaa, useDonnees, versIso } from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

interface Reponse {
  debut: string; jours: string[];
  reparations: { id: number; date_prevue: string; technicien_id: number; reclamation_id: number; statut: string; numero_serie: string }[];
  techniciens: { id: number; nom: string }[];
  reclamations: { id: number; diagnostic: string; statut: string; numero_serie: string; date_prevue: string | null; technicien_id: number | null }[];
}
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const ajouter = (iso: string, n: number) => {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Écran 08 – CU4 planifier une réparation. */
export function Planification() {
  const [params] = useSearchParams();
  const rafraichirResume = useRafraichirResume();
  const [semaine, setSemaine] = useState(aujourdhui());
  const { donnees, erreur, recharger } = useDonnees(() => api.get<Reponse>(`/planification?semaine=${semaine}`), [semaine]);
  const [choix, setChoix] = useState<number | null>(params.get('reclamation') ? Number(params.get('reclamation')) : null);
  const [date, setDate] = useState('');
  const [tech, setTech] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string; champ?: string } | null>(null);

  useEffect(() => {
    if (!donnees) return;
    if (choix == null && donnees.reclamations.length) setChoix(donnees.reclamations[0].id);
    if (!tech && donnees.techniciens.length) setTech(String(donnees.techniciens[0].id));
  }, [donnees, choix, tech]);

  // Planification existante : pré-remplir (scénario alternatif « modifier une planification »)
  useEffect(() => {
    const r = donnees?.reclamations.find((x) => x.id === choix);
    if (r?.date_prevue) {
      setDate(jjmmaaaa(r.date_prevue));
      if (r.technicien_id) setTech(String(r.technicien_id));
    }
  }, [choix, donnees]);

  const planifier = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!choix) return setMsg({ type: 'bad', texte: 'Choisissez une réclamation.' });
    const iso = versIso(date);
    if (!iso) return setMsg({ type: 'bad', texte: 'Date invalide : utilisez le format JJ/MM/AAAA.', champ: 'date' });
    try {
      await api.post('/reparations', { reclamation_id: choix, date: iso, technicien_id: Number(tech) });
      const r = donnees?.reclamations.find((x) => x.id === choix);
      setMsg({ type: 'ok', texte: `Réparation du vélo ${r?.numero_serie} planifiée le ${date}.` });
      setSemaine(iso);
      recharger();
      rafraichirResume();
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };

  const auj = aujourdhui();
  return (
    <>
      <EnTete titre="Planifier une réparation" sousTitre="Affecter une date à une réclamation." />
      <Alerte>{erreur}</Alerte>
      <div className="g12">
        <form className="card" onSubmit={planifier} noValidate>
          <h3>Réclamation</h3>
          {donnees?.reclamations.length === 0 && <span className="mut">Aucune réclamation à planifier.</span>}
          {donnees?.reclamations.map((r) => (
            <button type="button" key={r.id} className={`li${choix === r.id ? ' on' : ''}`} aria-pressed={choix === r.id}
              onClick={() => { setChoix(r.id); setMsg(null); if (!r.date_prevue) setDate(''); }}>
              {r.numero_serie} · {r.diagnostic}
              {r.statut === 'planifiee' && <span className="chip ok">Planifiée</span>}
            </button>
          ))}
          <Champ libelle="Date de réparation" erreur={msg?.type === 'bad' && msg.champ === 'date' ? msg.texte : null}>
            <span className="in"><input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="JJ/MM/AAAA" /></span>
          </Champ>
          <Champ libelle="Technicien" erreur={msg?.type === 'bad' && msg.champ === 'technicien_id' ? msg.texte : null}>
            <span className="in"><select value={tech} onChange={(e) => setTech(e.target.value)}>
              {donnees?.techniciens.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select></span>
          </Champ>
          {msg && (msg.type === 'ok' || !msg.champ) && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns"><button type="submit" className="btn p" disabled={!choix}>Planifier</button></div>
        </form>
        <section className="card">
          <div className="row">
            <h3>Semaine du {jjmmaaaa(donnees?.debut)}</h3>
            <div className="btns">
              <button type="button" className="btn" aria-label="Semaine précédente" onClick={() => setSemaine(ajouter(donnees!.debut, -7))}><Icone nom="gauche" taille={14} /></button>
              <button type="button" className="btn" onClick={() => setSemaine(auj)}>Cette semaine</button>
              <button type="button" className="btn" aria-label="Semaine suivante" onClick={() => setSemaine(ajouter(donnees!.debut, 7))}><Icone nom="droite" taille={14} /></button>
            </div>
          </div>
          <table className="cal">
            <thead><tr><th></th>{donnees?.jours.map((j, i) => <th key={j} className={j === auj ? 'auj' : ''}>{JOURS[i]} {j.slice(8)}</th>)}</tr></thead>
            <tbody>
              {donnees?.techniciens.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.nom}</b></td>
                  {donnees.jours.map((j) => (
                    <td key={j} className={j === auj ? 'auj' : ''} onClick={() => { if (j >= auj) { setDate(jjmmaaaa(j)); setTech(String(t.id)); } }}
                      style={{ cursor: j >= auj ? 'pointer' : 'default' }} title={j >= auj ? 'Choisir ce jour et ce technicien' : undefined}>
                      {donnees.reparations.filter((r) => r.date_prevue === j && r.technicien_id === t.id).map((r) => (
                        <span key={r.id} className={`chip ${r.reclamation_id === choix ? 'warn' : r.statut === 'traitee' ? '' : 'ok'}`}>{r.numero_serie}</span>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <span className="mut">Cliquez sur une case pour choisir la date et le technicien. Un technicien déjà occupé ce jour-là ne peut pas être affecté (hypothèse H6).</span>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
