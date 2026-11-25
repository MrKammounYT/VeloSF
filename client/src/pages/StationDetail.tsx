import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Station } from '../api';
import { Alerte, ChipVelo, Dialogue, EnTete, Pagination, PiedDePage, Stat, couleurCarre, libelleStatutStation, useDonnees, usePagination } from '../composants/commun';
import { CarteSchematique } from '../composants/CarteSchematique';
import { useRafraichirResume } from '../composants/Coquille';

interface VeloStation { id: number; numero_serie: string; type: string; couleur: string; etat: string; reclamation_ouverte: number }

/** Écran 04 – CU1 détail d'une station. */
export function StationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees, erreur } = useDonnees(() => api.get<{ station: Station; velos: VeloStation[] }>(`/stations/${id}`), [id]);
  const tous = useDonnees(() => api.get<{ stations: Station[] }>('/stations'));
  const [confirmer, setConfirmer] = useState(false);
  const [erreurSup, setErreurSup] = useState<string | null>(null);
  const pag = usePagination(donnees?.velos ?? [], 6);

  const supprimer = async () => {
    try {
      await api.del(`/stations/${id}`);
      rafraichirResume();
      navigate('/stations');
    } catch (e) {
      setErreurSup((e as Error).message);
      setConfirmer(false);
    }
  };

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!donnees) return <div className="chargement">Chargement…</div>;
  const s = donnees.station;
  return (
    <>
      <EnTete titre={`Station ${s.nom}`} sousTitre={s.adresse} actions={<>
        <Link to={`/stations/${s.id}/modifier`} className="btn">Modifier</Link>
        <button type="button" className="btn danger" onClick={() => { setErreurSup(null); setConfirmer(true); }}>Supprimer</button>
      </>} />
      <Alerte onFermer={() => setErreurSup(null)}>{erreurSup}</Alerte>
      <div className="g3">
        <Stat libelle="Capacité" valeur={s.capacite} />
        <Stat libelle="Vélos présents" valeur={s.nb_velos} />
        <Stat libelle="État" valeur={libelleStatutStation(s.statut)} />
      </div>
      <div className="g21">
        <section className="card">
          <div className="row"><h3>Vélos présents</h3><span className="mut">{s.velos_disponibles} disponible(s) à la location · {s.places_libres} place(s) libre(s)</span></div>
          <table>
            <thead><tr><th>N° de série</th><th>Type</th><th>Couleur</th><th>État</th></tr></thead>
            <tbody>
              {pag.visibles.map((v) => (
                <tr key={v.id}>
                  <td><span className="sq" style={{ background: couleurCarre(v.id) }} /><span className="nm">{v.numero_serie}</span></td>
                  <td>{v.type}</td><td>{v.couleur}</td>
                  <td><ChipVelo etat={v.etat} reclamation={v.reclamation_ouverte} /></td>
                </tr>
              ))}
              {donnees.velos.length === 0 && <tr><td colSpan={4} className="vide">Aucun vélo dans cette station.</td></tr>}
            </tbody>
          </table>
          <Pagination {...pag} />
        </section>
        <section className="card">
          <h3>Emplacement</h3>
          <CarteSchematique hauteur={210} stations={tous.donnees?.stations ?? [s]} surligner={s.id} />
          <div className="bar"><i style={{ width: `${s.occupation}%` }} /></div>
          <span className="mut">Occupation : {s.occupation} %</span>
        </section>
      </div>
      <PiedDePage />
      {confirmer && (
        <Dialogue titre="Supprimer la station" onFermer={() => setConfirmer(false)} actions={<>
          <button type="button" className="btn p" onClick={supprimer}>Supprimer</button>
          <button type="button" className="btn" onClick={() => setConfirmer(false)}>Annuler</button>
        </>}>
          <span>Voulez-vous supprimer la station « {s.nom} » ? {s.nb_velos > 0 && 'Elle contient encore des vélos : la suppression sera refusée.'}</span>
        </Dialogue>
      )}
    </>
  );
}
