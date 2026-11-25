import express from 'express';
import session from 'express-session';
import type { DB } from './db.js';
import { gestionnaireErreurs } from './erreurs.js';
import { routesAuth } from './routes/auth.js';
import { routesFlotte } from './routes/flotte.js';
import { routesMaintenance } from './routes/maintenance.js';
import { routesLocation } from './routes/location.js';
import { routesRedistribution } from './routes/redistribution.js';
import { HYPOTHESES } from './config/hypotheses.js';

export function creerApp(db: DB, options: { secret?: string } = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: options.secret ?? process.env.SESSION_SECRET ?? 'velosf-demo-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600_000 },
    }),
  );

  const api = express.Router();

  // Données communes : carte « Vélos en station » et badges du menu
  api.get('/resume', (req, res) => {
    const t = db.prepare('SELECT COALESCE(SUM(nb_velos),0) velos, COALESCE(SUM(capacite),0) capacite, COUNT(*) stations FROM station').get() as {
      velos: number; capacite: number; stations: number;
    };
    const profil = req.session.utilisateur?.profil;
    const badges: Record<string, number> = {};
    if (profil === 'responsable') {
      badges.stations = t.stations;
      badges.reclamations = (db.prepare(`SELECT COUNT(*) n FROM reclamation WHERE statut <> 'traitee'`).get() as { n: number }).n;
    }
    if (profil === 'technicien') {
      badges.mission = (db
        .prepare(`SELECT COUNT(*) n FROM ordre_mission WHERE technicien_id = ? AND statut IN ('envoye','en_cours')`)
        .get(req.session.utilisateur!.id) as { n: number }).n;
    }
    res.json({ ...t, badges });
  });

  // Paramètres des hypothèses exposés à l'interface (affichage « — TND », listes de choix)
  api.get('/parametres', (_req, res) => {
    res.json({
      types_velo: HYPOTHESES.TYPES_VELO,
      pieces_identite: HYPOTHESES.PIECES_IDENTITE,
      modes_paiement: HYPOTHESES.MODES_PAIEMENT,
      devise: HYPOTHESES.DEVISE,
      seuil_vide: HYPOTHESES.SEUIL_VIDE,
      seuil_pleine: HYPOTHESES.SEUIL_PLEINE,
    });
  });

  api.use('/auth', routesAuth(db));
  api.use(routesFlotte(db));
  api.use(routesMaintenance(db));
  api.use(routesLocation(db));
  api.use(routesRedistribution(db));
  api.use((_req, res) => res.status(404).json({ erreur: 'Ressource introuvable.' }));

  app.use('/api', api);
  app.use(gestionnaireErreurs);
  return app;
}
