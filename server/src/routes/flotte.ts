import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db.js';
import { recalculerStation } from '../db.js';
import { ErreurMetier, valider } from '../erreurs.js';
import { HYPOTHESES, statutStation } from '../config/hypotheses.js';
import { exigerProfil } from '../acces.js';
import { horodatageISO, jourISO } from '../horloge.js';

/** Sous-requête : le vélo a une réclamation ouverte (à planifier ou planifiée). */
export const SQL_RECLAMATION_OUVERTE = `EXISTS (SELECT 1 FROM reclamation r WHERE r.velo_id = v.id AND r.statut <> 'traitee')`;

interface LigneStation {
  id: number; nom: string; adresse: string; capacite: number; nb_velos: number;
  carte_x: number | null; carte_y: number | null; modifie_le: string | null;
}

export function decorerStation(db: DB, s: LigneStation) {
  const dispo = db
    .prepare(`SELECT COUNT(*) n FROM velo v WHERE v.station_id = ? AND v.etat = 'disponible' AND NOT ${SQL_RECLAMATION_OUVERTE}`)
    .get(s.id) as { n: number };
  return {
    ...s,
    occupation: s.capacite ? Math.round((s.nb_velos / s.capacite) * 100) : 0,
    statut: statutStation(s.nb_velos, s.capacite),
    places_libres: s.capacite - s.nb_velos,
    velos_disponibles: dispo.n,
  };
}

export function listerStations(db: DB) {
  const lignes = db.prepare('SELECT * FROM station ORDER BY id').all() as LigneStation[];
  return lignes.map((s) => decorerStation(db, s));
}

const entier = (msg: string) => z.coerce.number(msg).int(msg);

const schemaStation = z.object({
  nom: z.string('Le nom est obligatoire.').trim().min(1, 'Le nom est obligatoire.'),
  adresse: z.string("L'adresse est obligatoire.").trim().min(1, "L'adresse est obligatoire."),
  capacite: entier('La capacité doit être un nombre entier.').min(1, 'La capacité doit être supérieure à 0.'),
  carte_x: z.coerce.number().min(0).max(100).nullable().optional(),
  carte_y: z.coerce.number().min(0).max(100).nullable().optional(),
});

const schemaFournisseur = z.object({
  nom: z.string('Le nom est obligatoire.').trim().min(1, 'Le nom est obligatoire.'),
  adresse: z.string().trim().optional().default(''),
  telephone: z.string().trim().optional().default(''),
  email: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((e) => e === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), 'Adresse e-mail invalide.'),
});

const schemaAchat = z.object({
  numero_serie: z.string('Le numéro de série est obligatoire.').trim().min(1, 'Le numéro de série est obligatoire.'),
  fournisseur_id: entier('Choisissez un fournisseur.'),
  type: z.enum(HYPOTHESES.TYPES_VELO, 'Type de vélo invalide.'),
  couleur: z.string('La couleur est obligatoire.').trim().min(1, 'La couleur est obligatoire.'),
  station_id: entier("Choisissez une station d'affectation."),
});

export function routesFlotte(db: DB) {
  const r = Router();
  const resp = exigerProfil('responsable');

  // ---------- CU1 – Stations
  r.get('/stations', resp, (_req, res) => {
    const stations = listerStations(db);
    const aReparer = db
      .prepare(`SELECT COUNT(DISTINCT velo_id) n FROM reclamation WHERE statut <> 'traitee'`)
      .get() as { n: number };
    res.json({
      stations,
      totaux: {
        stations: stations.length,
        capacite: stations.reduce((a, s) => a + s.capacite, 0),
        velos: stations.reduce((a, s) => a + s.nb_velos, 0),
        a_reparer: aReparer.n,
      },
    });
  });

  r.get('/stations/:id', resp, (req, res) => {
    const s = db.prepare('SELECT * FROM station WHERE id = ?').get(req.params.id) as LigneStation | undefined;
    if (!s) throw new ErreurMetier(404, 'Station introuvable.');
    const velos = db
      .prepare(
        `SELECT v.id, v.numero_serie, v.type, v.couleur, v.etat, ${SQL_RECLAMATION_OUVERTE} AS reclamation_ouverte
         FROM velo v WHERE v.station_id = ? ORDER BY v.numero_serie`,
      )
      .all(s.id);
    res.json({ station: decorerStation(db, s), velos });
  });

  r.post('/stations', resp, (req, res) => {
    const d = valider(schemaStation, req.body);
    const id = db
      .prepare('INSERT INTO station (nom, adresse, capacite, nb_velos, carte_x, carte_y, modifie_le) VALUES (?,?,?,0,?,?,?)')
      .run(d.nom, d.adresse, d.capacite, d.carte_x ?? null, d.carte_y ?? null, horodatageISO()).lastInsertRowid;
    res.status(201).json({ id });
  });

  r.put('/stations/:id', resp, (req, res) => {
    const d = valider(schemaStation, req.body);
    const s = db.prepare('SELECT * FROM station WHERE id = ?').get(req.params.id) as LigneStation | undefined;
    if (!s) throw new ErreurMetier(404, 'Station introuvable.');
    if (d.capacite < s.nb_velos) {
      throw new ErreurMetier(
        409,
        `La capacité (${d.capacite}) est inférieure au nombre de vélos présents (${s.nb_velos}).`,
        'capacite',
      );
    }
    db.prepare('UPDATE station SET nom=?, adresse=?, capacite=?, carte_x=?, carte_y=?, modifie_le=? WHERE id=?').run(
      d.nom, d.adresse, d.capacite, d.carte_x ?? s.carte_x, d.carte_y ?? s.carte_y, horodatageISO(), s.id,
    );
    res.json({ id: s.id });
  });

  r.delete('/stations/:id', resp, (req, res) => {
    const s = db.prepare('SELECT * FROM station WHERE id = ?').get(req.params.id) as LigneStation | undefined;
    if (!s) throw new ErreurMetier(404, 'Station introuvable.');
    if (HYPOTHESES.REFUS_SUPPRESSION_STATION_AVEC_VELOS && s.nb_velos > 0) {
      throw new ErreurMetier(409, `Suppression refusée : la station contient ${s.nb_velos} vélo(s).`);
    }
    const liee = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM location WHERE ? IN (station_depart_id, station_destination_id, station_arrivee_id))
              + (SELECT COUNT(*) FROM etape_itineraire WHERE station_id = ?) + (SELECT COUNT(*) FROM paiement WHERE station_destination_id = ?) n`,
      )
      .get(s.id, s.id, s.id) as { n: number };
    if (liee.n > 0) {
      throw new ErreurMetier(409, 'Suppression refusée : la station figure dans l’historique des locations ou des itinéraires.');
    }
    db.prepare('DELETE FROM station WHERE id = ?').run(s.id);
    res.json({ ok: true });
  });

  // ---------- CU3 – Fournisseurs
  r.get('/fournisseurs', resp, (_req, res) => {
    const f = db
      .prepare(
        `SELECT f.*, (SELECT COUNT(*) FROM velo v WHERE v.fournisseur_id = f.id) AS velos_achetes
         FROM fournisseur f ORDER BY f.nom COLLATE NOCASE`,
      )
      .all();
    res.json({ fournisseurs: f });
  });

  r.get('/fournisseurs/:id', resp, (req, res) => {
    const f = db.prepare('SELECT * FROM fournisseur WHERE id = ?').get(req.params.id);
    if (!f) throw new ErreurMetier(404, 'Fournisseur introuvable.');
    const velos = db
      .prepare('SELECT numero_serie, type, couleur, date_achat FROM velo WHERE fournisseur_id = ? ORDER BY date_achat DESC, id DESC')
      .all(req.params.id);
    res.json({ fournisseur: f, velos });
  });

  const nomFournisseurPris = (nom: string, saufId?: number) =>
    !!db.prepare('SELECT 1 FROM fournisseur WHERE lower(nom) = lower(?) AND id <> ?').get(nom, saufId ?? -1);

  r.post('/fournisseurs', resp, (req, res) => {
    const d = valider(schemaFournisseur, req.body);
    if (nomFournisseurPris(d.nom)) throw new ErreurMetier(409, 'Ce fournisseur existe déjà.', 'nom');
    const id = db
      .prepare('INSERT INTO fournisseur (nom, adresse, telephone, email) VALUES (?,?,?,?)')
      .run(d.nom, d.adresse, d.telephone, d.email).lastInsertRowid;
    res.status(201).json({ id });
  });

  r.put('/fournisseurs/:id', resp, (req, res) => {
    const d = valider(schemaFournisseur, req.body);
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM fournisseur WHERE id = ?').get(id)) throw new ErreurMetier(404, 'Fournisseur introuvable.');
    if (nomFournisseurPris(d.nom, id)) throw new ErreurMetier(409, 'Ce fournisseur existe déjà.', 'nom');
    db.prepare('UPDATE fournisseur SET nom=?, adresse=?, telephone=?, email=? WHERE id=?').run(
      d.nom, d.adresse, d.telephone, d.email, id,
    );
    res.json({ id });
  });

  r.delete('/fournisseurs/:id', resp, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM fournisseur WHERE id = ?').get(id)) throw new ErreurMetier(404, 'Fournisseur introuvable.');
    const n = (db.prepare('SELECT COUNT(*) n FROM velo WHERE fournisseur_id = ?').get(id) as { n: number }).n;
    if (HYPOTHESES.REFUS_SUPPRESSION_FOURNISSEUR_AVEC_VELOS && n > 0) {
      throw new ErreurMetier(409, `Suppression refusée : ${n} vélo(s) proviennent de ce fournisseur.`);
    }
    db.prepare('DELETE FROM fournisseur WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // ---------- CU2 – Achat de vélos
  r.get('/velos/achat', resp, (_req, res) => {
    const derniers = db
      .prepare(
        `SELECT v.numero_serie, v.type, v.couleur, f.nom AS fournisseur, v.date_achat
         FROM velo v JOIN fournisseur f ON f.id = v.fournisseur_id ORDER BY v.date_achat DESC, v.id DESC LIMIT 5`,
      )
      .all();
    const fournisseurs = db.prepare('SELECT id, nom FROM fournisseur ORDER BY nom COLLATE NOCASE').all();
    res.json({ derniers, fournisseurs, stations: listerStations(db), types: HYPOTHESES.TYPES_VELO });
  });

  r.post('/velos', resp, (req, res) => {
    const d = valider(schemaAchat, req.body);
    if (db.prepare('SELECT 1 FROM velo WHERE lower(numero_serie) = lower(?)').get(d.numero_serie)) {
      throw new ErreurMetier(409, 'Ce numéro de série est déjà utilisé.', 'numero_serie');
    }
    if (!db.prepare('SELECT 1 FROM fournisseur WHERE id = ?').get(d.fournisseur_id)) {
      throw new ErreurMetier(400, 'Fournisseur introuvable : ajoutez-le d’abord dans « Fournisseurs ».', 'fournisseur_id');
    }
    const st = db.prepare('SELECT * FROM station WHERE id = ?').get(d.station_id) as LigneStation | undefined;
    if (!st) throw new ErreurMetier(400, 'Station introuvable.', 'station_id');
    if (st.nb_velos >= st.capacite) {
      throw new ErreurMetier(409, `La station « ${st.nom} » est pleine : choisissez une autre station.`, 'station_id');
    }
    const id = db.transaction(() => {
      const nouvel = db
        .prepare(
          `INSERT INTO velo (numero_serie, couleur, type, fournisseur_id, station_id, etat, date_achat)
           VALUES (?,?,?,?,?, 'disponible', ?)`,
        )
        .run(d.numero_serie, d.couleur, d.type, d.fournisseur_id, d.station_id, jourISO()).lastInsertRowid;
      recalculerStation(db, d.station_id);
      return nouvel;
    })();
    res.status(201).json({ id });
  });

  return r;
}
