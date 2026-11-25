import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { DB } from '../db.js';
import { ErreurMetier, valider } from '../erreurs.js';
import { HYPOTHESES } from '../config/hypotheses.js';
import type { Profil } from '../acces.js';

interface LigneUtilisateur {
  id: number; profil: Profil; identifiant: string; code_secret_hash: string;
  nom: string | null; prenom: string | null; essais_echoues: number; bloque: number;
}

const schemaConnexion = z.object({
  profil: z.enum(['responsable', 'abonne', 'technicien'], 'Choisissez un profil.'),
  identifiant: z.string('Identifiant obligatoire.').trim().min(1, 'Identifiant obligatoire.'),
  code: z.string('Code secret obligatoire.').min(1, 'Code secret obligatoire.'),
});

/**
 * Vérifie identifiant + code secret (CU12). Gère le blocage après MAX_ESSAIS_CONNEXION échecs (H5).
 * Réutilisé par l'écran 12 (vérification de la carte d'abonné au début de la location).
 */
export function verifierIdentifiants(db: DB, profil: Profil, identifiant: string, code: string): LigneUtilisateur {
  const u = db
    .prepare('SELECT * FROM utilisateur WHERE identifiant = ? AND profil = ?')
    .get(identifiant.trim(), profil) as LigneUtilisateur | undefined;
  const libelle = profil === 'abonne' ? 'Numéro de carte ou code secret incorrect.' : 'Identifiant ou code secret incorrect.';
  if (!u) throw new ErreurMetier(401, profil === 'abonne' ? 'Carte inconnue ou invalide.' : 'Compte inconnu.');
  if (u.bloque) {
    throw new ErreurMetier(423, 'Compte bloqué après plusieurs essais. Contactez le Responsable.');
  }
  if (!bcrypt.compareSync(code, u.code_secret_hash)) {
    const essais = u.essais_echoues + 1;
    const bloque = essais >= HYPOTHESES.MAX_ESSAIS_CONNEXION ? 1 : 0;
    db.prepare('UPDATE utilisateur SET essais_echoues = ?, bloque = ? WHERE id = ?').run(essais, bloque, u.id);
    if (bloque) throw new ErreurMetier(423, 'Compte bloqué après plusieurs essais. Contactez le Responsable.');
    const restants = HYPOTHESES.MAX_ESSAIS_CONNEXION - essais;
    throw new ErreurMetier(401, `${libelle} Il vous reste ${restants} essai${restants > 1 ? 's' : ''}.`);
  }
  if (u.essais_echoues) db.prepare('UPDATE utilisateur SET essais_echoues = 0 WHERE id = ?').run(u.id);
  return u;
}

export function routesAuth(db: DB) {
  const r = Router();

  r.post('/connexion', (req, res, next) => {
    const { profil, identifiant, code } = valider(schemaConnexion, req.body);
    const u = verifierIdentifiants(db, profil, identifiant, code);
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.utilisateur = {
        id: u.id, profil: u.profil, identifiant: u.identifiant,
        nom: [u.prenom, u.nom].filter(Boolean).join(' ') || u.identifiant,
      };
      res.json({ utilisateur: req.session.utilisateur });
    });
  });

  r.post('/deconnexion', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  r.get('/moi', (req, res) => {
    res.json({ utilisateur: req.session.utilisateur ?? null });
  });

  // H5 – « Code secret oublié » : pas de canal de réinitialisation défini, le Responsable débloque le compte.
  r.post('/code-oublie', (_req, res) => {
    res.json({
      message:
        'Adressez-vous au Responsable de CycloSfaxcity : il vérifie votre identité et vous remet un nouveau code secret.',
    });
  });

  return r;
}
