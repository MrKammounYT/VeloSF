import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Station } from '../api';
import {
  BoutonExport, ChipStation, EnTete, Filtre, Pagination, PiedDePage, PlusActions, Recherche, Stat, Alerte,
  classeOccupation, couleurCarre, exporterCSV, libelleStatutStation, norm, useDonnees, usePagination,
} from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

interface Reponse { stations: Station[]; totaux: { stations: number; capacite: number; velos: number; a_reparer: number } }
type FiltreStatut = 'tous' | 'vide' | 'equilibree' | 'pleine';
type FiltreDispo = 'toutes' | 'avec' | 'sans';
type Tri = 'modif' | 'nom' | 'occupation';

/** Écran 02 – CU1 liste des stations. */
export function StationsListe() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees, erreur, recharger } = useDonnees(() => api.get<Reponse>('/stations'));
  const [q, setQ] = useState(params.get('q') ?? '');
  const [statut, setStatut] = useState<FiltreStatut>('tous');
  const [dispo, setDispo] = useState<FiltreDispo>('toutes');
  const [tri, setTri] = useState<Tri>('modif');
  const [message, setMessage] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);

  const lignes = useMemo(() => {
    let l = donnees?.stations ?? [];
    if (q) l = l.filter((s) => norm(s.nom).includes(norm(q)) || norm(s.adresse).includes(norm(q)));
    if (statut !== 'tous') l = l.filter((s) => s.statut === statut);
    if (dispo === 'avec') l = l.filter((s) => s.velos_disponibles > 0);
    if (dispo === 'sans') l = l.filter((s) => s.velos_disponibles === 0);
    const t = [...l];
    if (tri === 'nom') t.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    else if (tri === 'occupation') t.sort((a, b) => b.occupation - a.occupation);
    else t.sort((a, b) => (b.modifie_le ?? '').localeCompare(a.modifie_le ?? ''));
    return t;
  }, [donnees, q, statut, dispo, tri]);
  const pag = usePagination(lignes, 8);

  const supprimer = async (s: Station) => {
    if (!confirm(`Supprimer la station « ${s.nom} » ?`)) return;
    try {
      await api.del(`/stations/${s.id}`);
      setMessage({ type: 'ok', texte: `Station « ${s.nom} » supprimée.` });
      recharger();
      rafraichirResume();
    } catch (e) {
      setMessage({ type: 'bad', texte: (e as Error).message });
    }
  };

  const exporter = () =>
    exporterCSV('stations.csv', ['Nom', 'Adresse', 'Capacité', 'Vélos', 'Occupation (%)', 'Statut'],
      lignes.map((s) => [s.nom, s.adresse, s.capacite, s.nb_velos, s.occupation, libelleStatutStation(s.statut)]));

  const t = donnees?.totaux;
  return (
    <>
      <EnTete titre="Gérer les stations" sousTitre="Adresse, capacité et nombre de vélos de chaque station."
        actions={<Link to="/stations/nouvelle" className="btn p">+ Nouvelle station</Link>} />
      <div className="g4">
        <Stat libelle="Stations" valeur={t?.stations ?? '…'} />
        <Stat libelle="Capacité totale" valeur={t?.capacite ?? '…'} />
        <Stat libelle="Vélos en station" valeur={t?.velos ?? '…'} />
        <Stat libelle="Vélos à réparer" valeur={t?.a_reparer ?? '…'} />
      </div>
      {message && <Alerte type={message.type} onFermer={() => setMessage(null)}>{message.texte}</Alerte>}
      <Alerte>{erreur}</Alerte>
      <section className="card">
        <div className="tbar">
          <Recherche valeur={q} onChange={setQ} placeholder="Rechercher une station…" />
          <Filtre libelle="Disponibilité" valeur={dispo} onChange={setDispo}
            options={[['toutes', 'Toutes les stations'], ['avec', 'Avec vélos disponibles'], ['sans', 'Sans vélo disponible']]} />
          <Filtre libelle="Statut" valeur={statut} onChange={setStatut}
            options={[['tous', 'Tous les statuts'], ['vide', 'Vide'], ['equilibree', 'Équilibrée'], ['pleine', 'Pleine']]} />
          <Filtre libelle="Tri" valeur={tri} onChange={setTri}
            options={[['modif', 'Dernière modification'], ['nom', 'Nom (A → Z)'], ['occupation', 'Occupation décroissante']]} />
          <BoutonExport onClick={exporter} />
        </div>
        <table>
          <thead><tr><th>Nom</th><th>Adresse</th><th>Capacité</th><th>Vélos</th><th>Occupation</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            {pag.visibles.map((s) => (
              <tr key={s.id}>
                <td><span className="sq" style={{ background: couleurCarre(s.id) }} /><span className="nm">{s.nom}</span></td>
                <td>{s.adresse}</td>
                <td>{s.capacite}</td>
                <td>{s.nb_velos}</td>
                <td><span className={`pc ${classeOccupation(s.statut)}`}>{s.occupation} %</span></td>
                <td><ChipStation statut={s.statut} /></td>
                <td>
                  <span className="acts">
                    <Link to={`/stations/${s.id}`} className="al">Voir</Link>
                    <Link to={`/stations/${s.id}/modifier`} className="al">Modifier</Link>
                    <PlusActions actions={[
                      { libelle: 'Acheter un vélo pour cette station', onClick: () => navigate(`/achat?station=${s.id}`), desactive: s.places_libres === 0 },
                      { libelle: 'Supprimer', onClick: () => supprimer(s), danger: true },
                    ]} />
                  </span>
                </td>
              </tr>
            ))}
            {donnees && lignes.length === 0 && <tr><td colSpan={7} className="vide">Aucune station ne correspond à la recherche.</td></tr>}
          </tbody>
        </table>
        <Pagination {...pag} />
      </section>
      <PiedDePage />
    </>
  );
}
