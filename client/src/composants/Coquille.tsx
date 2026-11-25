import { createContext, useCallback, useContext, useEffect, useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icone } from '../icones';
import { MENUS, LIBELLE_PROFIL } from '../menus';
import { api, type ProfilAffiche } from '../api';
import { useAuth } from '../auth';

interface Resume { velos: number; capacite: number; stations: number; badges: Record<string, number> }
const CtxResume = createContext<() => void>(() => {});
/** Les écrans appellent cette fonction après une modification pour rafraîchir badges et compteur du menu. */
export const useRafraichirResume = () => useContext(CtxResume);

/** Structure commune des écrans 02 à 23 : menu latéral, barre du haut, contenu. */
export function Coquille({ profil }: { profil: ProfilAffiche }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { deconnexion, utilisateur } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [recherche, setRecherche] = useState('');

  const rafraichir = useCallback(() => {
    api.get<Resume>('/resume').then(setResume).catch(() => {});
  }, []);
  useEffect(rafraichir, [rafraichir, pathname]);

  const sections = MENUS[profil];
  const actif = sections.flatMap((s) => s.entrees).find((e) => pathname.startsWith(e.chemin) || e.actifAussi?.some((a) => pathname.startsWith(a)));
  const taux = resume && resume.capacite ? Math.round((resume.velos / resume.capacite) * 100) : 0;

  const quitter = async () => {
    if (profil === 'occasionnel') {
      navigate('/connexion');
      return;
    }
    await deconnexion();
    navigate('/connexion');
  };

  // Recherche globale : stations (Responsable) ou vélo (Technicien)
  const rechercher = (e: FormEvent) => {
    e.preventDefault();
    const q = recherche.trim();
    if (!q) return;
    if (profil === 'responsable') navigate(`/stations?q=${encodeURIComponent(q)}`);
    else if (profil === 'technicien') navigate(`/controle?q=${encodeURIComponent(q)}`);
  };

  return (
    <CtxResume.Provider value={rafraichir}>
      <div className="app">
        <aside className="sb" aria-label="Menu principal">
          <div className="brand">
            <i><Icone nom="velo" /></i>VéloSf
            <span className="pn"><Icone nom="panneau" /></span>
          </div>
          <nav aria-label={`Menu ${LIBELLE_PROFIL[profil]}`}>
            {sections.map((s) => (
              <div key={s.titre}>
                <div className="sec"><Icone nom="section" taille={14} />{s.titre}</div>
                {s.entrees.map((e) => {
                  const badge = e.badge && resume?.badges[e.badge];
                  return (
                    <Link key={e.chemin} to={e.chemin} className={`nav${actif === e ? ' on' : ''}`} aria-current={actif === e ? 'page' : undefined}>
                      <Icone nom={e.icone} />{e.libelle}
                      {badge ? <span className="bd">{badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <span className="sp" />
          <div className="up">
            <span className="mut">Vélos en station</span>
            <b>{resume ? `${resume.velos} / ${resume.capacite}` : '…'}</b>
            <div className="bar"><i style={{ width: `${taux}%` }} /></div>
          </div>
          <div className="pf">
            <span className="av"><Icone nom="profil" taille={18} /></span>
            <div>
              <b>{profil === 'occasionnel' ? 'Sans compte' : utilisateur?.nom ?? 'Mon compte'}</b>
              <span className="mut">{LIBELLE_PROFIL[profil]}</span>
            </div>
            <button type="button" className="lo" aria-label={profil === 'occasionnel' ? 'Quitter' : 'Se déconnecter'} title={profil === 'occasionnel' ? 'Quitter' : 'Se déconnecter'} onClick={quitter}>
              <Icone nom="deconnexion" />
            </button>
          </div>
        </aside>
        <div className="mw">
          <div className="tb">
            <span className="crumb">
              <Icone nom="grille" />
              <span className="mut">{LIBELLE_PROFIL[profil]}</span>
              <Icone nom="droite" taille={12} />
              <b style={{ fontWeight: 500 }}>{actif?.libelle ?? ''}</b>
            </span>
            <span className="sp" />
            {(profil === 'responsable' || profil === 'technicien') && (
              <form className="sr" role="search" onSubmit={rechercher}>
                <Icone nom="recherche" taille={15} />
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
                  placeholder={profil === 'responsable' ? 'Rechercher une station…' : 'Rechercher un vélo…'} aria-label="Rechercher" />
              </form>
            )}
            <Notifications profil={profil} badges={resume?.badges ?? {}} />
          </div>
          <main className="mn">
            <Outlet />
          </main>
        </div>
      </div>
    </CtxResume.Provider>
  );
}

function Notifications({ profil, badges }: { profil: ProfilAffiche; badges: Record<string, number> }) {
  const [ouvert, setOuvert] = useState(false);
  const items: { texte: string; lien: string }[] = [];
  if (profil === 'responsable' && badges.reclamations) items.push({ texte: `${badges.reclamations} réclamation(s) non traitée(s)`, lien: '/reclamations' });
  if (profil === 'technicien' && badges.mission) items.push({ texte: 'Un ordre de mission vous attend', lien: '/mission' });
  return (
    <span className="menu-plus">
      <button type="button" className="tbb" aria-label="Notifications" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        <Icone nom="cloche" />
        {items.length > 0 && <span className="pastille" />}
      </button>
      {ouvert && (
        <span className="menu-liste droite" role="menu">
          {items.length === 0 && <span className="mut vide">Aucune notification</span>}
          {items.map((i) => <Link key={i.lien} to={i.lien} role="menuitem" onClick={() => setOuvert(false)}>{i.texte}</Link>)}
        </span>
      )}
    </span>
  );
}
