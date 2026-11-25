import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type StationLocation } from '../api';
import { Alerte, Champ, Dialogue, EnTete, PiedDePage, Stat, heure, jjmmaaaa, useDonnees } from '../composants/commun';
import { CarteSchematique } from '../composants/CarteSchematique';
import { useRafraichirResume } from '../composants/Coquille';

interface EtapeMission {
  id: number; ordre: number; type: 'prise' | 'depot' | 'collecte'; station_id: number | null; station: string | null; nb_velos: number | null;
  fait: boolean; non_realisable: boolean; commentaire: string | null; nb_velos_reel: number | null;
}
interface Mission {
  ordre: null | { id: number; statut: string; date_heure: string; consignes: string | null; camion: string | null; capacite_camion: number | null };
  libelle?: string; etapes?: EtapeMission[]; prochaine?: EtapeMission | null; dans_camion?: number;
}

function libelleEtape(e: EtapeMission) {
  if (e.type === 'collecte') return `${e.station ? `${e.station} · ` : ''}Collecter ${e.nb_velos ? `${e.nb_velos} ` : 'les '}vélo${e.nb_velos === 1 ? '' : 's'} en panne`;
  return `${e.station} · ${e.type === 'prise' ? `charger ${e.nb_velos} vélos` : `déposer ${e.nb_velos}`}`;
}

/** Écran 22 – CU9 ma mission. */
export function TechMission() {
  const rafraichirResume = useRafraichirResume();
  const { donnees: m, erreur, setDonnees } = useDonnees(() => api.get<Mission>('/tech/mission'));
  const [nb, setNb] = useState('');
  const [nonRealisable, setNonRealisable] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const marquer = async (non: boolean) => {
    if (!m?.prochaine) return;
    setMsg(null);
    try {
      const r = await api.post<Mission>('/tech/mission/etape', {
        etape_id: m.prochaine.id, nb_velos: !non && nb !== '' ? Number(nb) : null, non_realisable: non, commentaire: non ? commentaire : '',
      });
      setDonnees(r);
      setNb('');
      setCommentaire('');
      setNonRealisable(false);
      rafraichirResume();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!m) return <div className="chargement">Chargement…</div>;
  if (!m.ordre) {
    return (
      <>
        <EnTete titre="Ma mission" sousTitre="Ordre reçu du Responsable." />
        <section className="card"><h3>Aucune mission</h3><div className="mut">Vous n’avez pas d’ordre de mission en attente. Le Responsable vous en enverra un quand des stations seront déséquilibrées.</div></section>
      </>
    );
  }
  const etapes = m.etapes ?? [];
  const p = m.prochaine;
  const enCours = m.ordre.statut === 'en_cours';
  const indexCourant = p ? etapes.indexOf(etapes.find((e) => e.id === p.id)!) : undefined;
  return (
    <>
      <EnTete titre="Ma mission" sousTitre="Ordre reçu du Responsable." />
      <div className="g12">
        <section className="card">
          <h3>Étapes</h3>
          <span className="mut">{jjmmaaaa(m.ordre.date_heure)} à {heure(m.ordre.date_heure)} · {m.ordre.camion ?? 'sans camion'}{m.ordre.capacite_camion ? ` (${m.dans_camion}/${m.ordre.capacite_camion} vélos à bord)` : ` · ${m.dans_camion} vélo(s) à bord`}</span>
          {m.ordre.consignes && <Alerte type="info">Consignes : {m.ordre.consignes}</Alerte>}
          <div className={`li${enCours ? ' fait' : ''}`}><span className="n">1</span>Entrepôt · prendre le camion{enCours && <span className="chip ok">Fait</span>}</div>
          {etapes.map((e, i) => (
            <div key={e.id} className={`li${p?.id === e.id ? ' on' : ''}${e.fait ? ' fait' : ''}${e.non_realisable ? ' saute' : ''}`}>
              <span className="n">{i + 2}</span>
              <span>{libelleEtape(e)}{e.commentaire && <span className="mut"> · {e.commentaire}</span>}</span>
              {e.fait && <span className="chip ok">Fait · {e.nb_velos_reel}</span>}
              {e.non_realisable && <span className="chip warn">Non réalisable</span>}
            </div>
          ))}
          <Alerte onFermer={() => setMsg(null)}>{msg}</Alerte>
          {p ? (
            <>
              {p.type !== 'collecte' && (
                <Champ libelle="Nombre de vélos réellement déplacés" aide={`Prévu : ${p.nb_velos}. Laisser vide si conforme.`}>
                  <span className="in"><input type="number" min={0} value={nb} onChange={(e) => setNb(e.target.value)} placeholder={String(p.nb_velos ?? '')} /></span>
                </Champ>
              )}
              <div className="btns">
                <button type="button" className="btn p" onClick={() => marquer(false)}>Marquer l’étape faite</button>
                <button type="button" className="btn" onClick={() => setNonRealisable(true)}>Étape non réalisable</button>
              </div>
            </>
          ) : (
            <Link to="/fin-mission" className="btn g">Toutes les étapes sont faites · Fin de mission</Link>
          )}
        </section>
        <section className="card">
          <h3>Parcours</h3>
          <CarteMission etapes={etapes} indexCourant={indexCourant} />
        </section>
      </div>
      <PiedDePage />
      {nonRealisable && (
        <Dialogue titre="Étape non réalisable" onFermer={() => setNonRealisable(false)} actions={<>
          <button type="button" className="btn p" onClick={() => marquer(true)} disabled={!commentaire.trim()}>Valider</button>
          <button type="button" className="btn" onClick={() => setNonRealisable(false)}>Annuler</button>
        </>}>
          <label className="f">Commentaire<textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. : station pleine, accès bloqué…" /></label>
        </Dialogue>
      )}
    </>
  );
}

/** Carte du parcours de la mission, étape courante mise en évidence. */
function CarteMission({ etapes, indexCourant }: { etapes: EtapeMission[]; indexCourant?: number }) {
  const { donnees } = useDonnees(() => api.get<{ stations: StationLocation[] }>('/stations-location'));
  return <CarteSchematique hauteur={420} stations={donnees?.stations ?? []} trajet={etapes.map((e) => e.station_id)} etapeCourante={indexCourant} />;
}

/** Écran 23 – CU9 fin de mission. */
export function TechFinMission() {
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees: r, erreur } = useDonnees(() =>
    api.get<{ velos_deplaces: number; velos_collectes: number; etapes_terminees: number; etapes_total: number; non_realisables: number; dans_camion: number }>('/tech/mission/recap'));
  const [commentaire, setCommentaire] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);
  const [fini, setFini] = useState(false);

  const terminer = async () => {
    setMsg(null);
    try {
      await api.post('/tech/mission/cloturer', { commentaire });
      setFini(true);
      setMsg({ type: 'ok', texte: 'Mission terminée. Les vélos en panne collectés sont déposés à l’entrepôt pour réparation.' });
      rafraichirResume();
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message });
    }
  };

  if (erreur && !fini) {
    return (
      <>
        <EnTete titre="Fin de mission" sousTitre="Récapitulatif avant clôture." />
        <section className="card"><h3>Aucune mission en cours</h3><Link to="/mission" className="btn" style={{ alignSelf: 'flex-start' }}>Ma mission</Link></section>
      </>
    );
  }
  const restantes = r ? r.etapes_total - r.etapes_terminees : 0;
  return (
    <>
      <EnTete titre="Fin de mission" sousTitre="Récapitulatif avant clôture." />
      <div className="g3">
        <Stat libelle="Vélos déplacés" valeur={r?.velos_deplaces ?? '…'} />
        <Stat libelle="Vélos en panne collectés" valeur={r?.velos_collectes ?? '…'} />
        <Stat libelle="Étapes terminées" valeur={r ? `${r.etapes_terminees}/${r.etapes_total}` : '…'} />
      </div>
      {restantes > 0 && !fini && <Alerte type="warn">Il reste {restantes} étape(s) à réaliser. <Link to="/mission">Retour à la mission</Link></Alerte>}
      {r && r.non_realisables > 0 && <Alerte type="info">{r.non_realisables} étape(s) signalée(s) non réalisable(s).</Alerte>}
      {msg && <Alerte type={msg.type}>{msg.texte}</Alerte>}
      <section className="card">
        <h3>Clôture</h3>
        <label className="f">Commentaire<textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Remarques éventuelles" disabled={fini} /></label>
        <div className="btns">
          {fini
            ? <button type="button" className="btn p" onClick={() => navigate('/controle')}>Retour au contrôle quotidien</button>
            : <button type="button" className="btn g" onClick={terminer} disabled={restantes > 0}>Terminer la mission</button>}
        </div>
      </section>
      <PiedDePage />
    </>
  );
}
