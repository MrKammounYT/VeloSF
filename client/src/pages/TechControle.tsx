import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import {
  Alerte, Dialogue, EnTete, Filtre, Pagination, PiedDePage, PlusActions, Recherche, couleurCarre, jjmmaaaa, norm, useDonnees, usePagination,
} from '../composants/commun';

interface VeloControle {
  id: number; numero_serie: string; type: string; couleur: string; etat: string; station_id: number; station: string;
  reclamation_ouverte: number; resultat: 'ok' | 'anomalie' | null;
}

/** Écran 20 – CU8 contrôle quotidien. */
export function TechControle() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { donnees, erreur, recharger, setDonnees } = useDonnees(() =>
    api.get<{ date: string; velos: VeloControle[]; stations: { id: number; nom: string }[] }>('/controle'));
  const [q, setQ] = useState(params.get('q') ?? '');
  const [station, setStation] = useState('toutes');
  const [aFaire, setAFaire] = useState('tous');
  const [bilan, setBilan] = useState<{ total: number; ok: number; anomalies: number; non_controles: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const lignes = useMemo(() => {
    let l = donnees?.velos ?? [];
    if (q) l = l.filter((v) => norm(v.numero_serie).includes(norm(q)));
    if (station !== 'toutes') l = l.filter((v) => String(v.station_id) === station);
    if (aFaire === 'restants') l = l.filter((v) => !v.resultat);
    return l;
  }, [donnees, q, station, aFaire]);
  const pag = usePagination(lignes, 10);
  const faits = donnees?.velos.filter((v) => v.resultat).length ?? 0;
  const total = donnees?.velos.length ?? 0;

  const ok = async (v: VeloControle) => {
    setMsg(null);
    try {
      await api.post('/controle', { velo_id: v.id });
      setDonnees((d) => d && { ...d, velos: d.velos.map((x) => (x.id === v.id ? { ...x, resultat: 'ok' } : x)) });
    } catch (e) {
      setMsg((e as Error).message);
      recharger();
    }
  };
  const terminer = async () => setBilan(await api.post('/controle/terminer'));

  return (
    <>
      <EnTete titre="Contrôle quotidien" sousTitre="Vérifier chaque vélo et signaler les anomalies."
        actions={<button type="button" className="btn p" onClick={terminer}>Terminer le contrôle</button>} />
      <Alerte>{erreur ?? msg}</Alerte>
      <section className="card">
        <div className="row"><span className="mut">Contrôle du {jjmmaaaa(donnees?.date)}</span><span className="mut">{faits} / {total} vélos contrôlés</span></div>
        <div className="bar"><i style={{ width: `${total ? (faits / total) * 100 : 0}%` }} /></div>
        <div className="tbar">
          <Recherche valeur={q} onChange={setQ} placeholder="Rechercher un vélo…" />
          <Filtre libelle="Station" valeur={station} onChange={setStation}
            options={[['toutes', 'Toutes les stations'], ...(donnees?.stations.map((s) => [String(s.id), s.nom] as [string, string]) ?? [])]} />
          <Filtre libelle="Avancement" valeur={aFaire} onChange={setAFaire} options={[['tous', 'Tous les vélos'], ['restants', 'Restant à contrôler']]} />
        </div>
        <table>
          <thead><tr><th>Vélo</th><th>Station</th><th>Résultat</th><th>Action</th></tr></thead>
          <tbody>
            {pag.visibles.map((v) => (
              <tr key={v.id}>
                <td><span className="sq" style={{ background: couleurCarre(v.id) }} /><span className="nm">{v.numero_serie}</span> <span className="mut">· {v.type}</span></td>
                <td>{v.station}</td>
                <td>
                  {v.resultat === 'anomalie' ? <span className="chip bad">Anomalie signalée</span>
                    : v.reclamation_ouverte ? <span className="chip warn">Sous réclamation</span>
                      : <label className="chk"><input type="radio" name={`r${v.id}`} checked={v.resultat === 'ok'} onChange={() => ok(v)} /> OK</label>}
                </td>
                <td>
                  <span className="acts">
                    <button type="button" className="al" disabled={!!v.reclamation_ouverte}
                      onClick={() => navigate(`/reclamation?velo=${encodeURIComponent(v.numero_serie)}`)}>Signaler</button>
                    <PlusActions actions={[{ libelle: 'Marquer OK', onClick: () => ok(v), desactive: !!v.reclamation_ouverte || v.resultat === 'ok' }]} />
                  </span>
                </td>
              </tr>
            ))}
            {donnees && lignes.length === 0 && <tr><td colSpan={4} className="vide">Aucun vélo.</td></tr>}
          </tbody>
        </table>
        <Pagination {...pag} />
      </section>
      <PiedDePage />
      {bilan && (
        <Dialogue titre="Contrôle terminé" onFermer={() => setBilan(null)} actions={<button type="button" className="btn p" onClick={() => setBilan(null)}>Fermer</button>}>
          <div className="li">Vélos contrôlés OK · {bilan.ok}</div>
          <div className="li">Anomalies signalées · {bilan.anomalies}</div>
          <div className="li">Non contrôlés · {bilan.non_controles} sur {bilan.total}</div>
          {bilan.non_controles > 0 && <span className="mut">Les vélos non contrôlés (dont ceux déjà sous réclamation) restent à vérifier.</span>}
        </Dialogue>
      )}
    </>
  );
}
