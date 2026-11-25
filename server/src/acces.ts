import type { NextFunction, Request, Response } from 'express';
import { ErreurMetier } from './erreurs.js';

export type Profil = 'responsable' | 'abonne' | 'technicien';

export interface UtilisateurSession {
  id: number;
  profil: Profil;
  identifiant: string;
  nom: string;
}

/** Parcours de l'utilisateur occasionnel (sans compte, H4) conservé dans la session. */
export interface ParcoursOccasionnel {
  occasionnelId?: number;
  stationDestinationId?: number;
  dureeMin?: number;
  paiementId?: number;
  carteId?: number;
  locationId?: number;
}

declare module 'express-session' {
  interface SessionData {
    utilisateur?: UtilisateurSession;
    /** CU5 étape 1 : carte d'abonné vérifiée (écran 12). */
    carteVerifiee?: boolean;
    occasionnel?: ParcoursOccasionnel;
  }
}

/** Contrôle d'accès par profil : chaque route n'est ouverte qu'aux profils de son menu. */
export function exigerProfil(...profils: Profil[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const u = req.session.utilisateur;
    if (!u) return next(new ErreurMetier(401, 'Vous devez vous connecter.'));
    if (!profils.includes(u.profil)) return next(new ErreurMetier(403, 'Accès réservé à un autre profil.'));
    next();
  };
}

export function utilisateur(req: Request): UtilisateurSession {
  const u = req.session.utilisateur;
  if (!u) throw new ErreurMetier(401, 'Vous devez vous connecter.');
  return u;
}
