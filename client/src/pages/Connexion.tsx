import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, type Profil } from '../api';
import { Icone } from '../icones';
import { ACCUEIL } from '../menus';
import { Alerte } from '../composants/commun';

const PROFILS: [Profil, string][] = [['abonne', 'Abonné'], ['technicien', 'Technicien'], ['responsable', 'Responsable']];
const EXEMPLE: [string, number, number][] = [['Station A', 11, 12], ['Station B', 3, 12], ['Station C', 7, 12]];

/** Écran 01 – CU12 S'authentifier. */
export function Connexion() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const depuis = (useLocation().state as { depuis?: string } | null)?.depuis;
  const [profil, setProfil] = useState<Profil>('abonne');
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setInfo(null);
    if (!identifiant.trim() || !code) {
      setErreur(profil === 'abonne' ? 'Saisissez votre numéro de carte et votre code secret.' : 'Saisissez votre identifiant et votre code secret.');
      return;
    }
    setEnvoi(true);
    try {
      const u = await connexion(profil, identifiant, code);
      navigate(depuis && depuis !== '/connexion' ? depuis : ACCUEIL[u.profil], { replace: true });
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const codeOublie = async () => {
    const r = await api.post<{ message: string }>('/auth/code-oublie');
    setErreur(null);
    setInfo(r.message);
  };

  return (
    <div className="cx">
      <section className="cx-hero">
        <div className="brand"><i><Icone nom="velo" /></i>VéloSf</div>
        <h1>Le vélo en libre-service dans la région de Sfax.</h1>
        <p>Connectez-vous pour louer un vélo, gérer le parc ou suivre vos missions de redistribution.</p>
        <span className="sp" />
        <div className="cx-board" aria-label="Exemple illustratif d’occupation">
          <div className="row"><b style={{ fontWeight: 500 }}>Occupation des stations</b><span className="chip">Aperçu</span></div>
          {EXEMPLE.map(([nom, n, cap]) => (
            <div key={nom} className="col" style={{ gap: 8 }}>
              <div className="row"><span>{nom}</span><span className="mut">Exemple</span></div>
              <div className="dots">{Array.from({ length: cap }, (_, i) => <i key={i} className={`d${i < n ? ' f' : ''}`} />)}</div>
            </div>
          ))}
          <span className="mut">Exemple illustratif : le tableau de bord réel est réservé au Responsable.</span>
        </div>
      </section>
      <section className="cx-side">
        <form className="cx-card" onSubmit={soumettre} noValidate>
          <div><h2>Connexion</h2><span className="mut">Choisissez votre profil</span></div>
          <div className="seg" role="group" aria-label="Profil">
            {PROFILS.map(([p, l]) => (
              <button type="button" key={p} className={profil === p ? 'on' : ''} aria-pressed={profil === p}
                onClick={() => { setProfil(p); setErreur(null); }}>{l}</button>
            ))}
          </div>
          <label className="f">
            {profil === 'abonne' ? 'Numéro de carte d’abonné' : 'Identifiant'}
            <span className="in"><Icone nom={profil === 'abonne' ? 'carte' : 'profil'} taille={18} />
              <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username"
                placeholder={profil === 'abonne' ? 'Ex. : 000123' : profil === 'technicien' ? 'Ex. : tech1' : 'Ex. : responsable'} />
            </span>
          </label>
          <label className="f">
            Code secret
            <span className="in"><Icone nom="cadenas" taille={18} />
              <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••" autoComplete="current-password" />
            </span>
          </label>
          <Alerte>{erreur}</Alerte>
          <Alerte type="info" onFermer={() => setInfo(null)}>{info}</Alerte>
          <button type="submit" className="btn p" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
          <button type="button" className="cx-lien" onClick={codeOublie}>Code secret oublié ?</button>
          <Link to="/occasionnel/informations" className="cx-alt">
            <Icone nom="profil" taille={22} />
            <span><b>Utilisateur occasionnel ?</b><span className="mut">Louer sans compte, avec carte à durée limitée</span></span>
          </Link>
          <div className="demo">
            Comptes de démonstration (code secret <code>1234</code>) : abonné <code>000123</code>,
            technicien <code>tech1</code>, responsable <code>responsable</code>.
          </div>
        </form>
      </section>
    </div>
  );
}
