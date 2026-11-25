import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErreurApi, type StationLocation, type VeloSimple } from '../api';
import {
  Alerte, Champ, EnTete, Etapes, Pagination, PiedDePage, couleurCarre, duree, heure, jjmmaaaa, montant, useDonnees, usePagination,
} from '../composants/commun';
import { useRafraichirResume } from '../composants/Coquille';

interface EtatOcc {
  etape: {
    infos: boolean; paye: boolean;
    carte: { numero: string; valide_jusqu_a: string; restituee: number } | null;
    location: { statut: string; debut: string; numero_serie: string; type: string; couleur: string; station_depart: string } | null;
  };
  infos: { nom: string; prenom: string; piece_identite: string } | null;
  brouillon: { stationDestinationId?: number; dureeMin?: number };
}
const useEtatOcc = () => useDonnees(() => api.get<EtatOcc>('/occ/etat'));
const useStations = () => useDonnees(() => api.get<{ stations: StationLocation[] }>('/stations-location'));

/** Écran 16 – CU6 étape 1 : identité (H10), station de destination et durée. */
export function OccInformations() {
  const navigate = useNavigate();
  const { donnees: etat } = useEtatOcc();
  const { donnees: st } = useStations();
  const [f, setF] = useState({ nom: '', prenom: '', type_piece: 'CIN', numero_piece: '', station_destination_id: '', duree: '' });
  const [msg, setMsg] = useState<{ texte: string; champ?: string } | null>(null);

  useEffect(() => {
    if (!etat) return;
    const [type, ...num] = (etat.infos?.piece_identite ?? '').split(' ');
    setF((x) => ({
      ...x,
      nom: etat.infos?.nom ?? x.nom, prenom: etat.infos?.prenom ?? x.prenom,
      type_piece: type === 'Passeport' ? 'Passeport' : 'CIN', numero_piece: num.join(' ') || x.numero_piece,
      station_destination_id: etat.brouillon.stationDestinationId ? String(etat.brouillon.stationDestinationId) : x.station_destination_id,
      duree: etat.brouillon.dureeMin ? duree(etat.brouillon.dureeMin) : x.duree,
    }));
  }, [etat]);
  useEffect(() => {
    if (st && !f.station_destination_id) setF((x) => ({ ...x, station_destination_id: String(st.stations.find((s) => s.places_libres > 0)?.id ?? '') }));
  }, [st, f.station_destination_id]);

  const continuer = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/occ/informations', { ...f, station_destination_id: Number(f.station_destination_id) });
      navigate('/occasionnel/paiement');
    } catch (err) {
      setMsg({ texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };
  const recommencer = async () => { await api.post('/occ/recommencer'); window.location.reload(); };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const err = (c: string) => (msg?.champ === c ? msg.texte : null);
  const paye = etat?.etape.paye;
  return (
    <>
      <EnTete titre="Louer sans abonnement" sousTitre="Étape 1 sur 4 · identité, destination et durée." />
      <Etapes active={1} />
      {paye && (
        <Alerte type="info">
          Paiement déjà effectué pour cette demande. <Link to="/occasionnel/carte">Voir ma carte</Link> ·{' '}
          <button type="button" className="cx-lien" onClick={recommencer}>Nouvelle location</button>
        </Alerte>
      )}
      <div className="g21">
        <form className="card" onSubmit={continuer} noValidate>
          <h3>Vos informations</h3>
          <div className="g2">
            <Champ libelle="Nom" erreur={err('nom')}><span className="in"><input type="text" value={f.nom} onChange={set('nom')} disabled={paye} /></span></Champ>
            <Champ libelle="Prénom" erreur={err('prenom')}><span className="in"><input type="text" value={f.prenom} onChange={set('prenom')} disabled={paye} /></span></Champ>
          </div>
          <Champ libelle="Pièce d’identité" erreur={err('numero_piece') ?? err('type_piece')}>
            <span style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8 }}>
              <span className="in"><select value={f.type_piece} onChange={set('type_piece')} aria-label="Type de pièce" disabled={paye}>
                <option value="CIN">CIN</option><option value="Passeport">Passeport</option>
              </select></span>
              <span className="in"><input type="text" value={f.numero_piece} onChange={set('numero_piece')} placeholder="N° de CIN ou passeport" aria-label="Numéro de pièce" disabled={paye} /></span>
            </span>
          </Champ>
          <div className="g2">
            <Champ libelle="Station de destination" erreur={err('station_destination_id')}>
              <span className="in"><select value={f.station_destination_id} onChange={set('station_destination_id')} disabled={paye}>
                {st?.stations.map((s) => <option key={s.id} value={s.id}>{s.nom}{s.places_libres === 0 ? ' (pleine)' : ''}</option>)}
              </select></span>
            </Champ>
            <Champ libelle="Durée d’utilisation" erreur={err('duree')}>
              <span className="in"><input type="text" value={f.duree} onChange={set('duree')} placeholder="Ex. : 2 h" disabled={paye} /></span>
            </Champ>
          </div>
          {msg && !msg.champ && <Alerte>{msg.texte}</Alerte>}
          <button type="submit" className="btn p" disabled={paye}>Continuer</button>
        </form>
        <section className="card">
          <h3>Frais</h3>
          <div className="mut">Les frais d’utilisation et la caution s’affichent à l’étape suivante.</div>
          <div className="mut">Durée : par exemple « 45 min », « 2 h » ou « 1h30 ».</div>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}

interface Devis { frais: number | null; caution: number | null; total: number | null; devise: string; duree_min: number; destination: string; modes: Record<string, string>; paye: boolean }

/** Écran 17 – CU6 étape 2 : frais d'utilisation, caution, paiement (H11). */
export function OccPaiement() {
  const navigate = useNavigate();
  const { donnees: d, erreur } = useDonnees(() => api.get<Devis>('/occ/devis'));
  const [mode, setMode] = useState('carte_bancaire');
  const [msg, setMsg] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const payer = async () => {
    setMsg(null);
    setEnvoi(true);
    try {
      await api.post('/occ/paiement', { mode });
      navigate('/occasionnel/carte');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <EnTete titre="Paiement" sousTitre="Étape 2 sur 4 · frais d’utilisation et caution." />
      <Etapes active={2} />
      {erreur && <Alerte type="warn">{erreur} <Link to="/occasionnel/informations">Mes informations</Link></Alerte>}
      {d && (
        <div className="g2">
          <section className="card">
            <h3>Montant</h3>
            <div className="li">Durée · {duree(d.duree_min)} · destination {d.destination}</div>
            <div className="li">Frais d’utilisation · {montant(d.frais, d.devise)}</div>
            <div className="li">Caution (remboursable) · {montant(d.caution, d.devise)}</div>
            <div className="big">{montant(d.total, d.devise)}</div>
            {d.total == null && <span className="mut">Tarifs et caution non encore définis par CycloSfaxcity (hypothèse H11) : le montant sera confirmé au guichet.</span>}
          </section>
          <section className="card">
            <h3>Règlement</h3>
            {d.paye ? (
              <>
                <Alerte type="ok">Paiement déjà effectué.</Alerte>
                <Link to="/occasionnel/carte" className="btn p">Voir ma carte</Link>
              </>
            ) : (
              <>
                <Champ libelle="Mode de paiement">
                  <span className="in"><select value={mode} onChange={(e) => setMode(e.target.value)}>
                    {Object.entries(d.modes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></span>
                </Champ>
                <Alerte>{msg}</Alerte>
                <button type="button" className="btn p" onClick={payer} disabled={envoi}>{envoi ? 'Paiement…' : 'Payer'}</button>
                <Link to="/occasionnel/informations" className="btn">Modifier la durée ou la destination</Link>
              </>
            )}
          </section>
        </div>
      )}
      <PiedDePage />
    </>
  );
}

/** Écran 18 – CU6 étape 3 : carte courte durée délivrée. */
export function OccCarte() {
  const { donnees: etat } = useEtatOcc();
  if (!etat) return <div className="chargement">Chargement…</div>;
  const c = etat.etape.carte;
  return (
    <>
      <EnTete titre="Carte délivrée" sousTitre="Étape 3 sur 4 · conservez votre carte." />
      <Etapes active={3} />
      {!c ? (
        <section className="card">
          <h3>Aucune carte délivrée</h3>
          <div className="mut">La carte courte durée est délivrée après le paiement des frais et de la caution.</div>
          <Link to="/occasionnel/informations" className="btn p" style={{ alignSelf: 'flex-start' }}>Commencer</Link>
        </section>
      ) : (
        <div className="g2">
          <div className="sw">
            <b>VéloSf · Carte courte durée</b>
            <div><div className="mut" style={{ color: '#b5b5b0' }}>N° de carte</div><div className="big">{c.numero}</div></div>
            <div className="mut" style={{ color: '#b5b5b0' }}>Valable jusqu’au {jjmmaaaa(c.valide_jusqu_a)} à {heure(c.valide_jusqu_a)}</div>
          </div>
          <section className="card">
            <h3>Prochaine étape</h3>
            {etat.etape.location ? (
              <>
                <div className="li">Vélo : {etat.etape.location.numero_serie} · {etat.etape.location.type} · {etat.etape.location.couleur}</div>
                <div className="li">Départ : {etat.etape.location.station_depart} à {heure(etat.etape.location.debut)}</div>
                <div className="mut">Rendez le vélo et la carte dans une station pour récupérer votre caution.</div>
                <Link to="/occasionnel/restitution" className="btn p">Restituer le vélo</Link>
              </>
            ) : (
              <>
                <div className="mut">Choisissez un vélo disponible avec cette carte. La caution vous sera rendue au retour du vélo et de la carte.</div>
                <Link to="/occasionnel/velo" className="btn p">Choisir un vélo</Link>
              </>
            )}
          </section>
        </div>
      )}
      <PiedDePage />
    </>
  );
}

/** CU6 – choix du vélo avec la carte courte durée (même présentation que l'écran 13). */
export function OccVelo() {
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const { donnees: etat } = useEtatOcc();
  const { donnees: st } = useStations();
  const [station, setStation] = useState('');
  const { donnees: velos, recharger } = useDonnees(
    () => (station ? api.get<{ velos: VeloSimple[] }>(`/location/velos?station_id=${station}`) : Promise.resolve({ velos: [] })), [station]);
  const [msg, setMsg] = useState<string | null>(null);
  const pag = usePagination(velos?.velos ?? [], 6);
  useEffect(() => {
    if (st && !station) setStation(String((st.stations.find((s) => s.velos_disponibles > 0) ?? st.stations[0])?.id ?? ''));
  }, [st, station]);

  const choisir = async (v: VeloSimple) => {
    setMsg(null);
    try {
      await api.post('/occ/location', { velo_id: v.id });
      rafraichirResume();
      navigate('/occasionnel/carte');
    } catch (e) {
      setMsg((e as Error).message);
      recharger();
    }
  };

  return (
    <>
      <EnTete titre="Choisir un vélo" sousTitre="Étape 3 sur 4 · avec votre carte courte durée." />
      <Etapes active={3} />
      {etat && !etat.etape.carte && <Alerte type="warn">Payez d’abord les frais et la caution. <Link to="/occasionnel/informations">Commencer</Link></Alerte>}
      {etat?.etape.location && <Alerte type="info">Un vélo a déjà été pris avec cette carte. <Link to="/occasionnel/carte">Voir</Link></Alerte>}
      <Alerte onFermer={() => setMsg(null)}>{msg}</Alerte>
      <div className="g21">
        <section className="card">
          <h3>Vélos disponibles</h3>
          <Champ libelle="Station de départ">
            <span className="in"><select value={station} onChange={(e) => setStation(e.target.value)}>
              {st?.stations.map((s) => <option key={s.id} value={s.id}>{s.nom} — {s.velos_disponibles} vélo(s) disponible(s)</option>)}
            </select></span>
          </Champ>
          <table>
            <thead><tr><th>N° de série</th><th>Type</th><th>Couleur</th><th>État</th><th>Action</th></tr></thead>
            <tbody>
              {pag.visibles.map((v) => (
                <tr key={v.id}>
                  <td><span className="sq" style={{ background: couleurCarre(v.id) }} /><span className="nm">{v.numero_serie}</span></td>
                  <td>{v.type}</td><td>{v.couleur}</td><td><span className="chip ok">OK</span></td>
                  <td><button type="button" className="al fort" onClick={() => choisir(v)} disabled={!etat?.etape.carte || !!etat?.etape.location}>Choisir</button></td>
                </tr>
              ))}
              {velos && velos.velos.length === 0 && <tr><td colSpan={5} className="vide">Aucun vélo disponible dans cette station.</td></tr>}
            </tbody>
          </table>
          <Pagination {...pag} />
        </section>
        <section className="card">
          <h3>Votre carte</h3>
          <div className="big">{etat?.etape.carte?.numero ?? '—'}</div>
          <div className="mut">Le vélo choisi est associé à cette carte jusqu’à son retour.</div>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}

interface Apercu { caution: number | null; depassement_min: number; retenue: number | null; rembourse: number | null; devise: string; regle_definie: boolean }

/** Écran 19 – CU7 restitution (occasionnel) : retour du vélo et de la carte, remboursement de la caution. */
export function OccRestitution() {
  const rafraichirResume = useRafraichirResume();
  const { donnees: etat } = useEtatOcc();
  const { donnees: st, recharger } = useStations();
  const [numero, setNumero] = useState('');
  const [station, setStation] = useState('');
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [erreurCarte, setErreurCarte] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string } | null>(null);
  const [resultat, setResultat] = useState<Apercu | null>(null);

  useEffect(() => { if (etat?.etape.carte && !etat.etape.carte.restituee) setNumero((n) => n || etat.etape.carte!.numero); }, [etat]);
  useEffect(() => {
    if (st && !station) setStation(String(st.stations.find((s) => s.places_libres > 0)?.id ?? ''));
  }, [st, station]);
  useEffect(() => {
    setApercu(null);
    setErreurCarte(null);
    if (!/^T-\d{6}$/i.test(numero.trim())) return;
    const t = setTimeout(() => {
      api.get<Apercu>(`/occ/restitution/${encodeURIComponent(numero.trim())}`).then(setApercu).catch((e) => setErreurCarte(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [numero]);

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.post<Apercu>('/occ/restitution', { numero_carte: numero, station_id: Number(station) });
      setResultat(r);
      setMsg({ type: 'ok', texte: 'Vélo et carte restitués. La caution vous est remboursée.' });
      rafraichirResume();
      recharger();
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message });
      recharger();
    }
  };

  const a = resultat ?? apercu;
  const libelleDepassement = useMemo(() => {
    if (!a) return montant(null);
    if (a.depassement_min <= 0) return 'aucun';
    return `${duree(a.depassement_min)} · ${a.retenue == null ? montant(null, a.devise) : `− ${montant(a.retenue, a.devise)}`}`;
  }, [a]);

  return (
    <>
      <EnTete titre="Restituer le vélo et la carte" sousTitre="Étape 4 sur 4 · récupérez votre caution." />
      <Etapes active={4} />
      {msg && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
      <div className="g2">
        <form className="card" onSubmit={valider} noValidate>
          <h3>Retour</h3>
          <Champ libelle="N° de carte" erreur={erreurCarte}>
            <span className="in"><input type="text" value={numero} onChange={(e) => { setNumero(e.target.value); setResultat(null); }} placeholder="Ex. : T-000458" disabled={!!resultat} /></span>
          </Champ>
          <Champ libelle="Station d’arrivée">
            <span className="in"><select value={station} onChange={(e) => setStation(e.target.value)} disabled={!!resultat}>
              {st?.stations.map((s) => <option key={s.id} value={s.id} disabled={s.places_libres === 0}>{s.nom} — {s.places_libres > 0 ? `${s.places_libres} place(s) libre(s)` : 'pleine'}</option>)}
            </select></span>
          </Champ>
          {resultat
            ? <Link to="/connexion" className="btn">Terminer</Link>
            : <button type="submit" className="btn p">Valider le retour</button>}
        </form>
        <section className="card">
          <h3>Remboursement</h3>
          <div className="li">Caution · {montant(a?.caution ?? null, a?.devise)}</div>
          <div className="li">Dépassement de durée (hypothèse) · {libelleDepassement}</div>
          <div className="big">{montant(a?.rembourse ?? null, a?.devise)}</div>
          {(!a || !a.regle_definie || a.caution == null) && <span className="chip warn" style={{ alignSelf: 'flex-start' }}>À confirmer</span>}
          {(!a || !a.regle_definie) && <span className="mut">La règle de dépassement de durée n’est pas encore définie : le retard est mesuré mais aucune retenue n’est appliquée.</span>}
          {a && a.caution == null && <span className="mut">Le montant de la caution n’est pas encore défini (hypothèse H11).</span>}
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
