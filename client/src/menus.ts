import type { ProfilAffiche } from './api';
import type { NomIcone } from './icones';

export interface EntreeMenu { libelle: string; chemin: string; icone: NomIcone; badge?: string; actifAussi?: string[] }
export interface SectionMenu { titre: string; entrees: EntreeMenu[] }

/** Menus par profil (docs/03-ecrans.md, « Menus par profil »). */
export const MENUS: Record<ProfilAffiche, SectionMenu[]> = {
  responsable: [
    { titre: 'Flotte', entrees: [
      { libelle: 'Stations', chemin: '/stations', icone: 'epingle', badge: 'stations' },
      { libelle: 'Fournisseurs', chemin: '/fournisseurs', icone: 'camion' },
      { libelle: 'Achat de vélos', chemin: '/achat', icone: 'panier' },
    ] },
    { titre: 'Maintenance', entrees: [
      { libelle: 'Réclamations', chemin: '/reclamations', icone: 'alerte', badge: 'reclamations' },
      { libelle: 'Planification', chemin: '/planification', icone: 'calendrier' },
    ] },
    { titre: 'Répartition', entrees: [
      { libelle: 'Équilibre des stations', chemin: '/equilibre', icone: 'barres' },
      { libelle: 'Itinéraires', chemin: '/itineraires', icone: 'parcours' },
      { libelle: 'Ordres de mission', chemin: '/ordres', icone: 'document' },
    ] },
  ],
  technicien: [
    { titre: 'Maintenance', entrees: [
      { libelle: 'Contrôle quotidien', chemin: '/controle', icone: 'presse' },
      { libelle: 'Réclamation', chemin: '/reclamation', icone: 'alerte' },
    ] },
    { titre: 'Répartition', entrees: [
      { libelle: 'Ma mission', chemin: '/mission', icone: 'drapeau', badge: 'mission' },
      { libelle: 'Fin de mission', chemin: '/fin-mission', icone: 'coche' },
    ] },
  ],
  abonne: [
    { titre: 'Location', entrees: [
      { libelle: 'Identification', chemin: '/abonne/identification', icone: 'identite' },
      { libelle: 'Choisir un vélo', chemin: '/abonne/velos', icone: 'velo' },
      { libelle: 'Confirmation', chemin: '/abonne/confirmation', icone: 'coche' },
    ] },
    { titre: 'Retour', entrees: [{ libelle: 'Restitution', chemin: '/abonne/restitution', icone: 'retour' }] },
  ],
  occasionnel: [
    { titre: 'Location', entrees: [
      { libelle: 'Mes informations', chemin: '/occasionnel/informations', icone: 'profil' },
      { libelle: 'Paiement', chemin: '/occasionnel/paiement', icone: 'paiement' },
      { libelle: 'Carte délivrée', chemin: '/occasionnel/carte', icone: 'ticket', actifAussi: ['/occasionnel/velo'] },
    ] },
    { titre: 'Retour', entrees: [{ libelle: 'Restitution', chemin: '/occasionnel/restitution', icone: 'retour' }] },
  ],
};

export const LIBELLE_PROFIL: Record<ProfilAffiche, string> = {
  responsable: 'Responsable', technicien: 'Technicien', abonne: 'Abonné', occasionnel: 'Utilisateur occasionnel',
};

/** Page d'accueil de chaque profil après connexion. */
export const ACCUEIL: Record<ProfilAffiche, string> = {
  responsable: '/stations', technicien: '/controle', abonne: '/abonne/identification', occasionnel: '/occasionnel/informations',
};
