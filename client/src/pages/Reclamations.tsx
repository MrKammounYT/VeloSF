import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type StationLocation } from '../api';
import { Icone } from '../icones';
import {
  Alerte, BoutonExport, Champ, Dialogue, EnTete, Filtre, Pagination, PiedDePage, PlusActions, Recherche,
  couleurCarre, exporterCSV, jjmmaaaa, norm, useDonnees, usePagination,
} from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

export interface Reclamation {
  id: number; diagnostic: string; date_reclamation: string; statut: 'a_planifier' | 'planifiee' | 'traitee';
  origine: 'controle' | 'abonne_location' | 'abonne_restitution';
  velo_id: number; numero_serie: string; station_id: number | null; camion_id: number | null; station: string | null;
  technicien: string | null; abonne: string | null; date_prevue: string | null; reparateur: string | null;
}
export const STATUT_RECL: Record<Reclamation['statut'], [string, string]> = {
  a_planifier: ['À planifier', 'warn'], planifiee: ['Planifiée', 'ok'], traitee: ['Traitée', ''],
};
const ORIGINE: Record<Reclamation['origine'], string> = {
  controle: 'Contrôle quotidien', abonne_location: 'Signalé par un abonné (location)', abonne_restitution: 'Signalé par un abonné (restitution)',
};
const auteur = (r: Reclamation) => r.technicien ?? (r.abonne ? `Abonné · ${r.abonne}` : '—');

/** Écran 07 – CU4 réclamations de réparation. */
export function Reclamations() {
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees, erreur, recharger } = useDonnees(() =>
    api.get<{ reclamations: Reclamation[]; techniciens: { id: number; nom: string }[] }>('/reclamations'));
  const stations = useDonnees(() => api.get<{ stations: StationLocation[] }>('/stations-location'));
  const [q, setQ] = useState('');
  const [statut, setStatut] = useState('ouvertes');
  const [tech, setTech] = useState('tous');
  const [tri, setTri] = useState<'recent' | 'ancien' | 'velo'>('recent');
  const [voir, setVoir] = useState<Reclamation | null>(null);
  const [traiter, setTraiter] = useState<Reclamation | null>(null);
  const [stationRetour, setStationRetour] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);

  const lignes = useMemo(() => {
    let l = donnees?.reclamations ?? [];
    if (q) l = l.filter((r) => [r.numero_serie, r.diagnostic, auteur(r)].some((x) => norm(x).includes(norm(q))));
    if (statut === 'ouvertes') l = l.filter((r) => r.statut !== 'traitee');
    else if (statut !== 'tous') l = l.filter((r) => r.statut === statut);
    if (tech === 'abonnes') l = l.filter((r) => !r.technicien);
    else if (tech !== 'tous') l = l.filter((r) => r.technicien === tech);
    const t = [...l];
    if (tri === 'ancien') t.sort((a, b) => a.date_reclamation.localeCompare(b.date_reclamation));
    else if (tri === 'velo') t.sort((a, b) => a.numero_serie.localeCompare(b.numero_serie));
    return t;
  }, [donnees, q, statut, tech, tri]);
  const pag = usePagination(lignes, 8);

  const marquerTraitee = async () => {
    if (!traiter) return;
    try {
      await api.post(`/reclamations/${traiter.id}/traitee`, stationRetour ? { station_id: Number(stationRetour) } : {});
      setMsg({ type: 'ok', texte: `Réclamation du vélo ${traiter.numero_serie} traitée : le vélo est de nouveau disponible.` });
      setTraiter(null);
      recharger();
      stations.recharger();
      rafraichirResume();
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message });
    }
  };
  const aLEntrepot = (r: Reclamation) => r.station_id == null && r.camion_id == null;

  return (
    <>
      <EnTete titre="Réclamations de réparation" sousTitre="Déposées par les techniciens lors du contrôle." />
      <Alerte>{erreur}</Alerte>
      {msg && !traiter && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
      <section className="card">
        <div className="tbar">
          <Recherche valeur={q} onChange={setQ} placeholder="Rechercher une réclamation…" />
          <Filtre libelle="Statut" valeur={statut} onChange={setStatut}
            options={[['ouvertes', 'Réclamations ouvertes'], ['tous', 'Tous les statuts'], ['a_planifier', 'À planifier'], ['planifiee', 'Planifiée'], ['traitee', 'Traitée']]} />
          <Filtre libelle="Technicien" valeur={tech} onChange={setTech}
            options={[['tous', 'Tous les techniciens'], ...(donnees?.techniciens.map((t) => [t.nom, t.nom] as [string, string]) ?? []), ['abonnes', 'Signalées par un abonné']]} />
          <Filtre libelle="Tri" valeur={tri} onChange={setTri}
            options={[['recent', 'Dernière modification'], ['ancien', 'Plus anciennes'], ['velo', 'N° de vélo']]} />
          <BoutonExport onClick={() => exporterCSV('reclamations.csv', ['Vélo', 'Diagnostic', 'Technicien', 'Date', 'Statut', 'Réparation prévue'],
            lignes.map((r) => [r.numero_serie, r.diagnostic, auteur(r), jjmmaaaa(r.date_reclamation), STATUT_RECL[r.statut][0], jjmmaaaa(r.date_prevue)]))} />
        </div>
        <table>
          <thead><tr><th>Vélo</th><th>Diagnostic</th><th>Technicien</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            {pag.visibles.map((r) => (
              <tr key={r.id}>
                <td><span className="sq" style={{ background: couleurCarre(r.velo_id) }} /><span className="nm">{r.numero_serie}</span></td>
                <td>{r.diagnostic}</td>
                <td>{auteur(r)}</td>
                <td><span className="clk"><Icone nom="horloge" taille={14} />{jjmmaaaa(r.date_reclamation)}</span></td>
                <td><span className={`chip ${STATUT_RECL[r.statut][1]}`}>{STATUT_RECL[r.statut][0]}</span></td>
                <td>
                  <span className="acts">
                    <button type="button" className="al" onClick={() => setVoir(r)}>Voir</button>
                    {r.statut === 'a_planifier' && <button type="button" className="al fort" onClick={() => navigate(`/planification?reclamation=${r.id}`)}>Planifier</button>}
                    {r.statut === 'planifiee' && <button type="button" className="al" onClick={() => navigate(`/planification?reclamation=${r.id}`)}>Modifier</button>}
                    <PlusActions actions={[{
                      libelle: 'Marquer la réparation faite', desactive: r.statut === 'traitee',
                      onClick: () => { setMsg(null); setStationRetour(''); setTraiter(r); },
                    }]} />
                  </span>
                </td>
              </tr>
            ))}
            {donnees && lignes.length === 0 && <tr><td colSpan={6} className="vide">Aucune réclamation.</td></tr>}
          </tbody>
        </table>
        <Pagination {...pag} />
      </section>
      <PiedDePage />

      {voir && (
        <Dialogue titre={`Réclamation · ${voir.numero_serie}`} onFermer={() => setVoir(null)}
          actions={<>
            {voir.statut !== 'traitee' && <button type="button" className="btn p" onClick={() => navigate(`/planification?reclamation=${voir.id}`)}>{voir.statut === 'planifiee' ? 'Modifier la planification' : 'Planifier'}</button>}
            <button type="button" className="btn" onClick={() => setVoir(null)}>Fermer</button>
          </>}>
          <div className="li">Diagnostic · {voir.diagnostic}</div>
          <div className="li">Origine · {ORIGINE[voir.origine]}</div>
          <div className="li">Déposée par · {auteur(voir)} · {jjmmaaaa(voir.date_reclamation)}</div>
          <div className="li">Emplacement · {voir.station ?? (voir.camion_id ? 'Dans un camion' : 'Entrepôt')}</div>
          {voir.date_prevue && <div className="li">Réparation prévue · {jjmmaaaa(voir.date_prevue)} · {voir.reparateur}</div>}
        </Dialogue>
      )}
      {traiter && (
        <Dialogue titre="Réparation effectuée" onFermer={() => setTraiter(null)}
          actions={<>
            <button type="button" className="btn p" onClick={marquerTraitee} disabled={aLEntrepot(traiter) && !stationRetour}>Valider</button>
            <button type="button" className="btn" onClick={() => setTraiter(null)}>Annuler</button>
          </>}>
          <span>La réclamation du vélo {traiter.numero_serie} passe à « Traitée » et le vélo redevient disponible.</span>
          {aLEntrepot(traiter) && (
            <Champ libelle="Station où remettre le vélo (il est à l’entrepôt)">
              <span className="in"><select value={stationRetour} onChange={(e) => setStationRetour(e.target.value)}>
                <option value="">Choisir une station…</option>
                {stations.donnees?.stations.filter((s) => s.places_libres > 0).map((s) => <option key={s.id} value={s.id}>{s.nom} — {s.places_libres} place(s)</option>)}
              </select></span>
            </Champ>
          )}
          {msg?.type === 'bad' && <Alerte>{msg.texte}</Alerte>}
        </Dialogue>
      )}
    </>
  );
}
