import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Station } from '../api';
import { Icone } from '../icones';
import { Alerte, EnTete, PiedDePage, useDonnees } from '../composants/commun';
import { CarteSchematique } from '../composants/CarteSchematique';

type TypeEtape = 'prise' | 'depot' | 'collecte';
interface Etape { type: TypeEtape; station_id: number | null; nb_velos: number | null }
interface ItineraireListe {
  id: number; libelle: string; date_creation: string; etapes: (Etape & { id: number })[]; ordre: { id: number; statut: string } | null;
}
const LIB_TYPE: Record<TypeEtape, string> = { prise: 'Prendre', depot: 'Déposer', collecte: 'Collecter (panne)' };
const STATUT_ORDRE: Record<string, string> = { brouillon: 'ordre en brouillon', envoye: 'ordre envoyé', en_cours: 'mission en cours', termine: 'mission terminée' };

/** Écran 10 – CU10 préparer un itinéraire. */
export function Itineraire() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const stations = useDonnees(() => api.get<{ stations: Station[] }>('/stations'));
  const liste = useDonnees(() => api.get<{ itineraires: ItineraireListe[] }>('/itineraires'));
  const [courant, setCourant] = useState<number | 'nouveau' | null>(params.get('nouveau') ? 'nouveau' : null);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [modifie, setModifie] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad' | 'info'; texte: string } | null>(null);

  const proposer = async () => {
    const p = await api.get<{ etapes: Etape[]; message?: string }>('/itineraires/proposition');
    setEtapes(p.etapes.map(({ type, station_id, nb_velos }) => ({ type, station_id, nb_velos })));
    setModifie(true);
    setMsg(p.message ? { type: 'info', texte: p.message } : { type: 'info', texte: 'Proposition du plus plein au plus vide : modifiez-la si besoin puis enregistrez.' });
  };

  // Choix initial : nouvel itinéraire (depuis l'écran 09) ou le plus récent
  useEffect(() => {
    if (!liste.donnees || courant !== null) return;
    setCourant(liste.donnees.itineraires[0]?.id ?? 'nouveau');
  }, [liste.donnees, courant]);
  useEffect(() => {
    if (courant === 'nouveau') { proposer(); return; }
    const it = liste.donnees?.itineraires.find((i) => i.id === courant);
    if (it) { setEtapes(it.etapes.map(({ type, station_id, nb_velos }) => ({ type, station_id, nb_velos }))); setModifie(false); setMsg(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courant]);

  const it = typeof courant === 'number' ? liste.donnees?.itineraires.find((i) => i.id === courant) : undefined;
  const verrouille = !!it?.ordre && ['en_cours', 'termine'].includes(it.ordre.statut);
  const nomStation = (id: number | null) => stations.donnees?.stations.find((s) => s.id === id)?.nom;

  // Contrôle immédiat de la cohérence (le serveur revérifie)
  const charges = useMemo(() => {
    let c = 0;
    return etapes.map((e) => (c += e.type === 'prise' ? e.nb_velos ?? 0 : e.type === 'depot' ? -(e.nb_velos ?? 0) : 0));
  }, [etapes]);
  const incoherente = charges.findIndex((c) => c < 0);

  const maj = (i: number, champ: Partial<Etape>) => { setEtapes(etapes.map((e, j) => (j === i ? { ...e, ...champ } : e))); setModifie(true); };
  const deplacer = (i: number, d: number) => {
    const t = [...etapes];
    [t[i], t[i + d]] = [t[i + d], t[i]];
    setEtapes(t);
    setModifie(true);
  };
  const ajouter = (type: TypeEtape) => { setEtapes([...etapes, { type, station_id: null, nb_velos: type === 'collecte' ? null : 1 }]); setModifie(true); };

  const enregistrer = async (): Promise<number | null> => {
    setMsg(null);
    try {
      const corps = { etapes };
      const r = typeof courant === 'number' ? await api.put<{ id: number }>(`/itineraires/${courant}`, corps) : await api.post<{ id: number }>('/itineraires', corps);
      await liste.recharger();
      setCourant(r.id);
      setModifie(false);
      setMsg({ type: 'ok', texte: 'Itinéraire enregistré.' });
      return r.id;
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message });
      return null;
    }
  };
  const ordre = async () => {
    const id = modifie || courant === 'nouveau' ? await enregistrer() : (courant as number);
    if (id) navigate(`/ordres?itineraire=${id}`);
  };

  const trajet = etapes.map((e) => e.station_id);
  return (
    <>
      <EnTete titre="Préparer un itinéraire" sousTitre="Du plus rempli au plus vide, avec collecte des vélos en panne." />
      <div className="g12">
        <section className="card">
          <h3>Étapes</h3>
          <label className="flt large">
              <select value={courant ?? ''} aria-label="Itinéraire" onChange={(e) => setCourant(e.target.value === 'nouveau' ? 'nouveau' : Number(e.target.value))}>
                <option value="nouveau">Nouvel itinéraire</option>
                {liste.donnees?.itineraires.map((i) => (
                  <option key={i.id} value={i.id}>N° {i.id} · {i.libelle}{i.ordre ? ` (${STATUT_ORDRE[i.ordre.statut]})` : ''}</option>
                ))}
              </select>
            <Icone nom="bas" taille={14} />
          </label>
          <div className="li"><span className="n">1</span>Entrepôt · départ du camion</div>
          {etapes.map((e, i) => (
            <div className="etape" key={i}>
              <span className="n" style={incoherente === i ? { background: '#b91c1c' } : undefined}>{i + 2}</span>
              <span className="in e-type"><select value={e.type} disabled={verrouille} aria-label={`Type de l’étape ${i + 2}`}
                onChange={(ev) => maj(i, { type: ev.target.value as TypeEtape, nb_velos: ev.target.value === 'collecte' ? null : e.nb_velos ?? 1 })}>
                {(Object.keys(LIB_TYPE) as TypeEtape[]).map((t) => <option key={t} value={t}>{LIB_TYPE[t]}</option>)}
              </select></span>
              <span className="in e-station"><select value={e.station_id ?? ''} disabled={verrouille} aria-label={`Station de l’étape ${i + 2}`}
                onChange={(ev) => maj(i, { station_id: ev.target.value ? Number(ev.target.value) : null })}>
                <option value="">{e.type === 'collecte' ? 'Toutes les stations' : 'Choisir une station…'}</option>
                {stations.donnees?.stations.map((s) => <option key={s.id} value={s.id}>{s.nom} ({s.nb_velos}/{s.capacite})</option>)}
              </select></span>
              <span className="in e-nb"><input type="number" min={1} disabled={verrouille} aria-label={`Nombre de vélos de l’étape ${i + 2}`}
                value={e.nb_velos ?? ''} placeholder={e.type === 'collecte' ? 'Tous' : ''}
                onChange={(ev) => maj(i, { nb_velos: ev.target.value === '' ? null : Number(ev.target.value) })} /></span>
              <span className="ordre">
                <button type="button" aria-label="Monter" disabled={verrouille || i === 0} onClick={() => deplacer(i, -1)}><Icone nom="haut" taille={14} /></button>
                <button type="button" aria-label="Descendre" disabled={verrouille || i === etapes.length - 1} onClick={() => deplacer(i, 1)}><Icone nom="bas" taille={14} /></button>
              </span>
            </div>
          ))}
          {!verrouille && (
            <div className="btns">
              <button type="button" className="btn" onClick={() => ajouter('prise')}>+ Prise</button>
              <button type="button" className="btn" onClick={() => ajouter('depot')}>+ Dépôt</button>
              <button type="button" className="btn" onClick={() => ajouter('collecte')}>+ Collecte</button>
              {etapes.length > 0 && <button type="button" className="btn" onClick={() => { setEtapes(etapes.slice(0, -1)); setModifie(true); }}>Retirer la dernière</button>}
              <button type="button" className="btn" onClick={proposer}>Proposer</button>
            </div>
          )}
          <span className="mut">
            Résumé : {etapes.map((e, i) => (e.type === 'collecte' ? `collecter ${e.nb_velos ?? 'les'} vélo(s) en panne${e.station_id ? ` à ${nomStation(e.station_id)}` : ''}`
              : `${i + 2}. ${nomStation(e.station_id) ?? '?'} · ${e.type === 'prise' ? 'prendre' : 'déposer'} ${e.nb_velos ?? '?'}`)).join(' ; ') || 'aucune étape'}
          </span>
          {incoherente >= 0 && <Alerte type="warn">Étape {incoherente + 2} : plus de vélos déposés que de vélos pris.</Alerte>}
          {verrouille && <Alerte type="info">Cet itinéraire est déjà exécuté par un technicien : il ne peut plus être modifié.</Alerte>}
          {msg && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns">
            <button type="button" className="btn p" onClick={enregistrer} disabled={verrouille}>Enregistrer</button>
            <button type="button" className="btn g" onClick={ordre} disabled={!etapes.length}>Donner un ordre de mission</button>
          </div>
        </section>
        <section className="card">
          <h3>Parcours</h3>
          <CarteSchematique hauteur={480} stations={stations.donnees?.stations ?? []} trajet={trajet} />
          <span className="mut">Les numéros sur la carte suivent l’ordre des étapes. Couleurs : vert équilibrée, orange pleine, rouge vide.</span>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
