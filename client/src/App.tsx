import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import type { Profil } from './api';
import { ACCUEIL } from './menus';
import { Coquille } from './composants/Coquille';
import { Connexion } from './pages/Connexion';
import { StationsListe } from './pages/StationsListe';
import { StationFormulaire } from './pages/StationFormulaire';
import { StationDetail } from './pages/StationDetail';
import { Fournisseurs } from './pages/Fournisseurs';
import { AchatVelo } from './pages/AchatVelo';
import { Reclamations } from './pages/Reclamations';
import { Planification } from './pages/Planification';
import { Equilibre } from './pages/Equilibre';
import { Itineraire } from './pages/Itineraire';
import { OrdreMission } from './pages/OrdreMission';
import { AbonneIdentification, AbonneVelos, AbonneConfirmation, AbonneRestitution } from './pages/Abonne';
import { OccInformations, OccPaiement, OccCarte, OccVelo, OccRestitution } from './pages/Occasionnel';
import { TechControle } from './pages/TechControle';
import { TechReclamation } from './pages/TechReclamation';
import { TechMission, TechFinMission } from './pages/TechMission';

/** Contrôle d'accès par profil côté interface (le serveur le vérifie aussi sur chaque route). */
function Garde({ profil, children }: { profil: Profil; children: ReactNode }) {
  const { utilisateur, charge } = useAuth();
  const loc = useLocation();
  if (!charge) return <div className="chargement">Chargement…</div>;
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: loc.pathname }} />;
  if (utilisateur.profil !== profil) return <Navigate to={ACCUEIL[utilisateur.profil]} replace />;
  return <>{children}</>;
}

function Accueil() {
  const { utilisateur, charge } = useAuth();
  if (!charge) return <div className="chargement">Chargement…</div>;
  return <Navigate to={utilisateur ? ACCUEIL[utilisateur.profil] : '/connexion'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/connexion" element={<Connexion />} />

      <Route element={<Garde profil="responsable"><Coquille profil="responsable" /></Garde>}>
        <Route path="/stations" element={<StationsListe />} />
        <Route path="/stations/nouvelle" element={<StationFormulaire />} />
        <Route path="/stations/:id" element={<StationDetail />} />
        <Route path="/stations/:id/modifier" element={<StationFormulaire />} />
        <Route path="/fournisseurs" element={<Fournisseurs />} />
        <Route path="/achat" element={<AchatVelo />} />
        <Route path="/reclamations" element={<Reclamations />} />
        <Route path="/planification" element={<Planification />} />
        <Route path="/equilibre" element={<Equilibre />} />
        <Route path="/itineraires" element={<Itineraire />} />
        <Route path="/ordres" element={<OrdreMission />} />
      </Route>

      <Route element={<Garde profil="technicien"><Coquille profil="technicien" /></Garde>}>
        <Route path="/controle" element={<TechControle />} />
        <Route path="/reclamation" element={<TechReclamation />} />
        <Route path="/mission" element={<TechMission />} />
        <Route path="/fin-mission" element={<TechFinMission />} />
      </Route>

      <Route element={<Garde profil="abonne"><Coquille profil="abonne" /></Garde>}>
        <Route path="/abonne/identification" element={<AbonneIdentification />} />
        <Route path="/abonne/velos" element={<AbonneVelos />} />
        <Route path="/abonne/confirmation" element={<AbonneConfirmation />} />
        <Route path="/abonne/restitution" element={<AbonneRestitution />} />
      </Route>

      {/* Utilisateur occasionnel : sans compte (H4) */}
      <Route element={<Coquille profil="occasionnel" />}>
        <Route path="/occasionnel/informations" element={<OccInformations />} />
        <Route path="/occasionnel/paiement" element={<OccPaiement />} />
        <Route path="/occasionnel/carte" element={<OccCarte />} />
        <Route path="/occasionnel/velo" element={<OccVelo />} />
        <Route path="/occasionnel/restitution" element={<OccRestitution />} />
      </Route>

      <Route path="*" element={<Accueil />} />
    </Routes>
  );
}
