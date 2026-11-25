import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, type StationLocation, type VeloSimple } from '../api';
import {
  Alerte, Champ, Dialogue, EnTete, Etapes, Filtre, Pagination, PiedDePage, Recherche, couleurCarre, heure, norm, useDonnees, usePagination,
} from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

interface Etat {
  carteVerifiee: boolean; numero_carte: string;
  location: null | { id: number; velo_id: number; numero_serie: string; type: string; couleur: string; station_depart: string; station_depart_id: number; debut: string };
}
const useEtat = () => useDonnees(() => api.get<Etat>('/abonne/etat'));

/** Écran 12 – CU5 étape 1 : carte d'abonné et code secret. */
export function AbonneIdentification() {
  const navigate = useNavigate();
  const { donnees: etat } = useEtat();
  const [carte, setCarte] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const continuer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    try {
      await api.post('/abonne/verifier-carte', { numero_carte: carte, code });
      navigate('/abonne/velos');
    } catch (err) {
      setErreur((err as Error).message);
      setCode('');
    }
  };

  return (
    <>
      <EnTete titre="Louer un vélo" sousTitre="Étape 1 sur 4 · carte d’abonné et code secret." />
      <Etapes active={1} />
      {etat?.location && (
        <Alerte type="info">Vous avez déjà une location en cours (vélo {etat.location.numero_serie}). <Link to="/abonne/confirmation">Voir ma location</Link></Alerte>
      )}
      <div className="g2">
        <form className="card" onSubmit={continuer} noValidate>
          <h3>Votre carte</h3>
          <Champ libelle="Numéro de carte">
            <span className="in"><input type="text" value={carte} onChange={(e) => setCarte(e.target.value)} placeholder="Ex. : 000123" autoComplete="off" /></span>
          </Champ>
          <Champ libelle="Code secret">
            <span className="in"><input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••" /></span>
          </Champ>
          <Alerte>{erreur}</Alerte>
          <button type="submit" className="btn p">Continuer</button>
        </form>
        <section className="card">
          <h3>Aide</h3>
          <div className="mut">Passez votre carte d’abonné sur la borne puis saisissez votre code secret. Code erroné : un message vous invite à réessayer ; après plusieurs essais la carte est bloquée.</div>
          {erreur ? <span className="chip bad" style={{ alignSelf: 'flex-start' }}>Code incorrect</span>
            : etat?.carteVerifiee ? <span className="chip ok" style={{ alignSelf: 'flex-start' }}>Carte vérifiée</span> : null}
        </section>
      </div>
      <PiedDePage />
    </>
  );
}

/** Dialogue « Signaler un vélo défectueux » (CU5 scénario alternatif, H8). */
function DialogueSignalement({ velos, enCours, onFermer, onFait }: {
  velos: VeloSimple[]; enCours: Etat['location']; onFermer: () => void; onFait: (texte: string) => void;
}) {
  const options = [...(enCours ? [{ id: enCours.velo_id, numero_serie: enCours.numero_serie, type: enCours.type, couleur: enCours.couleur }] : []), ...velos];
  const [velo, setVelo] = useState(String(options[0]?.id ?? ''));
  const [diag, setDiag] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    try {
      await api.post('/abonne/signaler', { velo_id: Number(velo), diagnostic: diag });
      const v = options.find((o) => String(o.id) === velo);
      onFait(`Merci : le vélo ${v?.numero_serie} est signalé défectueux et retiré de la location. Choisissez un autre vélo.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  };
  return (
    <Dialogue titre="Signaler un vélo défectueux" onFermer={onFermer} actions={<>
      <button type="button" className="btn p" onClick={envoyer} disabled={!velo}>Signaler et rendre le vélo</button>
      <button type="button" className="btn" onClick={onFermer}>Annuler</button>
    </>}>
      <Champ libelle="Vélo">
        <span className="in"><select value={velo} onChange={(e) => setVelo(e.target.value)}>
          {options.map((v) => <option key={v.id} value={v.id}>{v.numero_serie} · {v.type} · {v.couleur}{enCours?.velo_id === v.id ? ' (votre vélo)' : ''}</option>)}
        </select></span>
      </Champ>
      <label className="f">Problème constaté<textarea value={diag} onChange={(e) => setDiag(e.target.value)} placeholder="Ex. : pneu dégonflé, frein inefficace…" /></label>
      <span className="mut">Une réclamation est transmise au Responsable (hypothèse H8).</span>
      <Alerte>{erreur}</Alerte>
    </Dialogue>
  );
}

/** Écran 13 – CU5 étape 2 : choix de la station de départ et d'un vélo disponible. */
export function AbonneVelos() {
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees: etat, recharger: rechargerEtat } = useEtat();
  const { donnees: st } = useDonnees(() => api.get<{ stations: StationLocation[] }>('/stations-location'));
  const [station, setStation] = useState('');
  const { donnees: velos, recharger } = useDonnees(
    () => (station ? api.get<{ velos: VeloSimple[] }>(`/location/velos?station_id=${station}`) : Promise.resolve({ velos: [] })), [station]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('tous');
  const [signaler, setSignaler] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);

  useEffect(() => {
    if (st && !station) setStation(String((st.stations.find((s) => s.velos_disponibles > 0) ?? st.stations[0])?.id ?? ''));
  }, [st, station]);

  const lignes = useMemo(() => (velos?.velos ?? []).filter((v) =>
    (!q || norm(v.numero_serie).includes(norm(q)) || norm(v.couleur).includes(norm(q))) && (type === 'tous' || v.type === type)), [velos, q, type]);
  const pag = usePagination(lignes, 6);

  if (etat && !etat.carteVerifiee && !etat.location) return <Navigate to="/abonne/identification" replace />;

  const choisir = async (v: VeloSimple) => {
    setMsg(null);
    try {
      await api.post('/abonne/locations', { velo_id: v.id });
      rafraichirResume();
      navigate('/abonne/confirmation');
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message });
      recharger();
    }
  };

  const types = [...new Set((velos?.velos ?? []).map((v) => v.type))];
  return (
    <>
      <EnTete titre="Choisir un vélo" sousTitre="Étape 2 sur 4 · vélos disponibles dans votre station." />
      <Etapes active={2} />
      {etat?.location && <Alerte type="warn">Vous avez déjà une location en cours (hypothèse H9 : une seule à la fois). <Link to="/abonne/confirmation">Voir ma location</Link></Alerte>}
      {msg && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
      <div className="g21">
        <section className="card">
          <h3>Vélos disponibles</h3>
          <Champ libelle="Station de départ">
            <span className="in"><select value={station} onChange={(e) => setStation(e.target.value)}>
              {st?.stations.map((s) => <option key={s.id} value={s.id}>{s.nom} — {s.velos_disponibles} vélo(s) disponible(s)</option>)}
            </select></span>
          </Champ>
          <div className="tbar">
            <Recherche valeur={q} onChange={setQ} placeholder="Rechercher un vélo…" />
            <Filtre libelle="Type" valeur={type} onChange={setType} options={[['tous', 'Tous les types'], ...types.map((t) => [t, t] as [string, string])]} />
          </div>
          <table>
            <thead><tr><th>N° de série</th><th>Type</th><th>Couleur</th><th>État</th><th>Action</th></tr></thead>
            <tbody>
              {pag.visibles.map((v) => (
                <tr key={v.id}>
                  <td><span className="sq" style={{ background: couleurCarre(v.id) }} /><span className="nm">{v.numero_serie}</span></td>
                  <td>{v.type}</td><td>{v.couleur}</td><td><span className="chip ok">OK</span></td>
                  <td><button type="button" className="al fort" onClick={() => choisir(v)} disabled={!!etat?.location}>Choisir</button></td>
                </tr>
              ))}
              {velos && lignes.length === 0 && <tr><td colSpan={5} className="vide">Aucun vélo disponible dans cette station : choisissez une autre station.</td></tr>}
            </tbody>
          </table>
          <Pagination {...pag} />
        </section>
        <section className="card">
          <h3>Vélo défectueux ?</h3>
          <div className="mut">Rendez un vélo en mauvais état et prenez-en un autre.</div>
          <button type="button" className="btn" onClick={() => setSignaler(true)}>Signaler un vélo défectueux</button>
        </section>
      </div>
      <PiedDePage />
      {signaler && (
        <DialogueSignalement velos={velos?.velos ?? []} enCours={etat?.location ?? null} onFermer={() => setSignaler(false)}
          onFait={(t) => { setSignaler(false); setMsg({ type: 'ok', texte: t }); recharger(); rechargerEtat(); rafraichirResume(); }} />
      )}
    </>
  );
}

/** Écran 14 – CU5 étape 3 : location confirmée. */
export function AbonneConfirmation() {
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees: etat } = useEtat();
  const [signaler, setSignaler] = useState(false);
  if (!etat) return <div className="chargement">Chargement…</div>;
  const l = etat.location;
  return (
    <>
      <EnTete titre="Location confirmée" sousTitre="Étape 3 sur 4 · bon trajet." />
      <Etapes active={3} />
      {!l ? (
        <section className="card">
          <h3>Aucune location en cours</h3>
          <div className="mut">Identifiez-vous puis choisissez un vélo pour commencer une location.</div>
          <Link to="/abonne/identification" className="btn p" style={{ alignSelf: 'flex-start' }}>Louer un vélo</Link>
        </section>
      ) : (
        <div className="g2">
          <section className="card">
            <h3>Récapitulatif</h3>
            <div className="li">Vélo : {l.numero_serie} · {l.type} · {l.couleur}</div>
            <div className="li">Départ : {l.station_depart}</div>
            <div className="li">Heure : {heure(l.debut)}</div>
            <span className="chip ok" style={{ alignSelf: 'flex-start' }}>Location en cours</span>
          </section>
          <section className="card">
            <h3>Pour terminer</h3>
            <div className="mut">Restituez le vélo dans une station proche de votre destination.</div>
            <Link to="/abonne/restitution" className="btn p" style={{ alignSelf: 'flex-start' }}>Restituer le vélo</Link>
            <button type="button" className="cx-lien" onClick={() => setSignaler(true)}>Le vélo est défectueux ? Le rendre et en prendre un autre</button>
          </section>
        </div>
      )}
      <PiedDePage />
      {signaler && l && (
        <DialogueSignalement velos={[]} enCours={l} onFermer={() => setSignaler(false)}
          onFait={() => { rafraichirResume(); navigate('/abonne/velos'); }} />
      )}
    </>
  );
}

/** Écran 15 – CU7 restitution (abonné). */
export function AbonneRestitution() {
  const rafraichirResume = useRafraichirResume();
  const { donnees: etat } = useEtat();
  const { donnees: st, recharger } = useDonnees(() => api.get<{ stations: StationLocation[] }>('/stations-location'));
  const [choix, setChoix] = useState<number | null>(null);
  const [bonEtat, setBonEtat] = useState(true);
  const [probleme, setProbleme] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);
  const [fini, setFini] = useState(false);
  const stations = useMemo(() => [...(st?.stations ?? [])].sort((a, b) => b.places_libres - a.places_libres), [st]);
  const pag = usePagination(stations, 6);

  const valider = async () => {
    setMsg(null);
    if (!choix) return setMsg({ type: 'bad', texte: 'Choisissez une station d’arrivée.' });
    try {
      const r = await api.post<{ reclamation: boolean }>('/abonne/restitution', { station_id: choix, bon_etat: bonEtat, probleme });
      const nom = stations.find((s) => s.id === choix)?.nom;
      setMsg({ type: 'ok', texte: `Vélo restitué à ${nom}. Merci !${r.reclamation ? ' Le problème signalé a été transmis au Responsable.' : ''}` });
      setFini(true);
      rafraichirResume();
      recharger();
    } catch (e) {
      setMsg({ type: 'bad', texte: (e as Error).message });
      recharger();
    }
  };

  if (etat && !etat.location && !fini) {
    return (
      <>
        <EnTete titre="Restituer un vélo" sousTitre="Étape 4 sur 4 · choisissez la station d’arrivée." />
        <Etapes active={4} />
        <section className="card"><h3>Aucune location en cours</h3><Link to="/abonne/identification" className="btn p" style={{ alignSelf: 'flex-start' }}>Louer un vélo</Link></section>
      </>
    );
  }
  return (
    <>
      <EnTete titre="Restituer un vélo" sousTitre="Étape 4 sur 4 · choisissez la station d’arrivée." />
      <Etapes active={4} />
      {msg && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
      {fini ? (
        <section className="card"><h3>Location terminée</h3><Link to="/abonne/identification" className="btn p" style={{ alignSelf: 'flex-start' }}>Nouvelle location</Link></section>
      ) : (
        <div className="g21">
          <section className="card">
            <h3>Stations avec places libres</h3>
            <table>
              <thead><tr><th>Station</th><th>Places libres</th><th>Action</th></tr></thead>
              <tbody>
                {pag.visibles.map((s) => (
                  <tr key={s.id} className={choix === s.id ? 'sel' : ''}>
                    <td><span className="sq" style={{ background: couleurCarre(s.id) }} /><span className="nm">{s.nom}</span></td>
                    <td>{s.places_libres}</td>
                    <td>{s.places_libres > 0
                      ? <button type="button" className="al fort" aria-pressed={choix === s.id} onClick={() => setChoix(s.id)}>{choix === s.id ? 'Choisie' : 'Choisir'}</button>
                      : <span className="chip warn">Pleine</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pag} />
          </section>
          <section className="card">
            <h3>État du vélo</h3>
            <label className="chk"><input type="checkbox" checked={bonEtat} onChange={(e) => setBonEtat(e.target.checked)} /> Le vélo est en bon état</label>
            <label className="f">Signaler un problème<textarea value={probleme} onChange={(e) => setProbleme(e.target.value)} placeholder="Optionnel" /></label>
            <button type="button" className="btn p" onClick={valider}>Valider la restitution</button>
          </section>
        </div>
      )}
      <PiedDePage />
    </>
  );
}
