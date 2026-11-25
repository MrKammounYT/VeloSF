import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db.js';
import { recalculerStation } from '../db.js';
import { ErreurMetier, valider } from '../erreurs.js';
import { HYPOTHESES } from '../config/hypotheses.js';
import { exigerProfil, utilisateur } from '../acces.js';
import { ajouterJours, jourISO, lundiDe } from '../horloge.js';
import { SQL_RECLAMATION_OUVERTE } from './flotte.js';

type Origine = 'controle' | 'abonne_location' | 'abonne_restitution';

/** Crée une réclamation (CU8, ou H8 pour un abonné). Refusée si le vélo a déjà une réclamation ouverte. */
export function creerReclamation(
  db: DB,
  o: { veloId: number; diagnostic: string; technicienId?: number | null; signalePar?: number | null; origine: Origine },
) {
  const diag = o.diagnostic.trim();
  if (!diag) throw new ErreurMetier(400, 'Le diagnostic est obligatoire.', 'diagnostic');
  const ouverte = db
    .prepare(`SELECT 1 FROM reclamation WHERE velo_id = ? AND statut <> 'traitee'`)
    .get(o.veloId);
  if (ouverte) throw new ErreurMetier(409, 'Ce vélo a déjà une réclamation ouverte.', 'velo');
  return db
    .prepare(
      `INSERT INTO reclamation (velo_id, technicien_id, signale_par, origine, diagnostic, date_reclamation, statut)
       VALUES (?,?,?,?,?,?, 'a_planifier')`,
    )
    .run(o.veloId, o.technicienId ?? null, o.signalePar ?? null, o.origine, diag, jourISO()).lastInsertRowid as number;
}

const schemaReclamation = z.object({
  numero_serie: z.string('Indiquez le vélo.').trim().min(1, 'Indiquez le vélo.'),
  diagnostic: z.string('Le diagnostic est obligatoire.').trim().min(1, 'Le diagnostic est obligatoire.'),
});

const schemaPlanif = z.object({
  reclamation_id: z.coerce.number().int(),
  date: z.string('La date est obligatoire.').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (JJ/MM/AAAA).'),
  technicien_id: z.coerce.number('Choisissez un technicien.').int('Choisissez un technicien.'),
});

export function routesMaintenance(db: DB) {
  const r = Router();
  const tech = exigerProfil('technicien');
  const resp = exigerProfil('responsable');

  // ---------- CU8 – Contrôle quotidien (écran 20)
  r.get('/controle', tech, (_req, res) => {
    const auj = jourISO();
    const velos = db
      .prepare(
        `SELECT v.id, v.numero_serie, v.type, v.couleur, v.etat, s.id AS station_id, s.nom AS station,
                ${SQL_RECLAMATION_OUVERTE} AS reclamation_ouverte,
                (SELECT c.resultat FROM controle c WHERE c.velo_id = v.id AND c.date_controle = ?) AS resultat
         FROM velo v JOIN station s ON s.id = v.station_id
         ORDER BY s.id, v.numero_serie`,
      )
      .all(auj);
    const stations = db.prepare('SELECT id, nom FROM station ORDER BY id').all();
    res.json({ date: auj, velos, stations });
  });

  r.post('/controle', tech, (req, res) => {
    const { velo_id } = valider(z.object({ velo_id: z.coerce.number().int() }), req.body);
    const v = db.prepare('SELECT id, station_id FROM velo WHERE id = ?').get(velo_id) as { station_id: number | null } | undefined;
    if (!v || v.station_id == null) throw new ErreurMetier(404, 'Vélo introuvable en station.');
    db.prepare(
      `INSERT INTO controle (velo_id, technicien_id, date_controle, resultat) VALUES (?,?,?, 'ok')
       ON CONFLICT (velo_id, date_controle) DO UPDATE SET resultat = 'ok', technicien_id = excluded.technicien_id`,
    ).run(velo_id, utilisateur(req).id, jourISO());
    res.json({ ok: true });
  });

  r.post('/controle/terminer', tech, (_req, res) => {
    const auj = jourISO();
    const total = (db.prepare('SELECT COUNT(*) n FROM velo WHERE station_id IS NOT NULL').get() as { n: number }).n;
    const r2 = db
      .prepare(`SELECT resultat, COUNT(*) n FROM controle WHERE date_controle = ? GROUP BY resultat`)
      .all(auj) as { resultat: string; n: number }[];
    const ok = r2.find((x) => x.resultat === 'ok')?.n ?? 0;
    const anomalies = r2.find((x) => x.resultat === 'anomalie')?.n ?? 0;
    res.json({ total, ok, anomalies, non_controles: Math.max(0, total - ok - anomalies) });
  });

  // ---------- CU8 – Réclamation (écran 21)
  r.get('/reclamation/velo/:serie', tech, (req, res) => {
    const v = db
      .prepare(
        `SELECT v.id, v.numero_serie, v.type, v.couleur, s.nom AS station, ${SQL_RECLAMATION_OUVERTE} AS reclamation_ouverte
         FROM velo v LEFT JOIN station s ON s.id = v.station_id WHERE lower(v.numero_serie) = lower(?)`,
      )
      .get(req.params.serie);
    if (!v) throw new ErreurMetier(404, 'Vélo introuvable.');
    res.json({ velo: v });
  });

  r.post('/reclamations', tech, (req, res) => {
    const d = valider(schemaReclamation, req.body);
    const v = db.prepare('SELECT id, station_id FROM velo WHERE lower(numero_serie) = lower(?)').get(d.numero_serie) as
      | { id: number; station_id: number | null }
      | undefined;
    if (!v) throw new ErreurMetier(404, 'Vélo introuvable.', 'numero_serie');
    const u = utilisateur(req);
    const id = db.transaction(() => {
      const idR = creerReclamation(db, { veloId: v.id, diagnostic: d.diagnostic, technicienId: u.id, origine: 'controle' });
      if (v.station_id != null) {
        db.prepare(
          `INSERT INTO controle (velo_id, technicien_id, date_controle, resultat) VALUES (?,?,?, 'anomalie')
           ON CONFLICT (velo_id, date_controle) DO UPDATE SET resultat = 'anomalie'`,
        ).run(v.id, u.id, jourISO());
      }
      return idR;
    })();
    res.status(201).json({ id });
  });

  // ---------- CU4 – Réclamations côté Responsable (écran 07)
  r.get('/reclamations', resp, (_req, res) => {
    const lignes = db
      .prepare(
        `SELECT r.id, r.diagnostic, r.date_reclamation, r.statut, r.origine,
                v.id AS velo_id, v.numero_serie, v.station_id, v.camion_id, s.nom AS station,
                t.nom AS technicien, a.prenom || ' ' || a.nom AS abonne,
                rp.date_prevue, rp.technicien_id AS reparateur_id, tr.nom AS reparateur
         FROM reclamation r JOIN velo v ON v.id = r.velo_id
         LEFT JOIN station s ON s.id = v.station_id
         LEFT JOIN utilisateur t ON t.id = r.technicien_id
         LEFT JOIN utilisateur a ON a.id = r.signale_par
         LEFT JOIN reparation rp ON rp.reclamation_id = r.id
         LEFT JOIN utilisateur tr ON tr.id = rp.technicien_id
         ORDER BY CASE r.statut WHEN 'a_planifier' THEN 0 WHEN 'planifiee' THEN 1 ELSE 2 END, r.date_reclamation DESC, r.id DESC`,
      )
      .all();
    const techniciens = db.prepare(`SELECT id, nom FROM utilisateur WHERE profil = 'technicien' ORDER BY nom`).all();
    res.json({ reclamations: lignes, techniciens });
  });

  // ---------- CU4 – Planification (écran 08)
  r.get('/planification', resp, (req, res) => {
    const debut = lundiDe(typeof req.query.semaine === 'string' ? req.query.semaine : jourISO());
    const fin = ajouterJours(debut, 5);
    const reparations = db
      .prepare(
        `SELECT rp.id, rp.date_prevue, rp.technicien_id, r.id AS reclamation_id, r.statut, v.numero_serie
         FROM reparation rp JOIN reclamation r ON r.id = rp.reclamation_id JOIN velo v ON v.id = r.velo_id
         WHERE rp.date_prevue BETWEEN ? AND ?`,
      )
      .all(debut, fin);
    const techniciens = db.prepare(`SELECT id, nom FROM utilisateur WHERE profil = 'technicien' ORDER BY nom`).all();
    const aPlanifier = db
      .prepare(
        `SELECT r.id, r.diagnostic, r.statut, v.numero_serie, rp.date_prevue, rp.technicien_id
         FROM reclamation r JOIN velo v ON v.id = r.velo_id LEFT JOIN reparation rp ON rp.reclamation_id = r.id
         WHERE r.statut <> 'traitee' ORDER BY r.statut, r.date_reclamation`,
      )
      .all();
    res.json({ debut, jours: [0, 1, 2, 3, 4, 5].map((i) => ajouterJours(debut, i)), reparations, techniciens, reclamations: aPlanifier });
  });

  r.post('/reparations', resp, (req, res) => {
    const d = valider(schemaPlanif, req.body);
    const recl = db.prepare('SELECT * FROM reclamation WHERE id = ?').get(d.reclamation_id) as
      | { id: number; velo_id: number; statut: string }
      | undefined;
    if (!recl) throw new ErreurMetier(404, 'Réclamation introuvable.');
    if (recl.statut === 'traitee') throw new ErreurMetier(409, 'Cette réclamation est déjà traitée.');
    if (d.date < jourISO()) throw new ErreurMetier(400, 'La date de réparation est dans le passé.', 'date');
    const t = db.prepare(`SELECT 1 FROM utilisateur WHERE id = ? AND profil = 'technicien'`).get(d.technicien_id);
    if (!t) throw new ErreurMetier(400, 'Technicien introuvable.', 'technicien_id');
    const occupe = db
      .prepare(
        `SELECT COUNT(*) n FROM reparation rp JOIN reclamation r ON r.id = rp.reclamation_id
         WHERE rp.technicien_id = ? AND rp.date_prevue = ? AND rp.reclamation_id <> ? AND r.statut <> 'traitee'`,
      )
      .get(d.technicien_id, d.date, recl.id) as { n: number };
    if (occupe.n >= HYPOTHESES.MAX_REPARATIONS_PAR_TECHNICIEN_PAR_JOUR) {
      throw new ErreurMetier(409, 'Ce technicien est déjà occupé à cette date.', 'technicien_id');
    }
    db.transaction(() => {
      db.prepare(
        `INSERT INTO reparation (reclamation_id, date_prevue, technicien_id) VALUES (?,?,?)
         ON CONFLICT (reclamation_id) DO UPDATE SET date_prevue = excluded.date_prevue, technicien_id = excluded.technicien_id`,
      ).run(recl.id, d.date, d.technicien_id);
      db.prepare(`UPDATE reclamation SET statut = 'planifiee' WHERE id = ?`).run(recl.id);
      // H7 – le vélo passe « en réparation » (s'il est dans le camion, il le deviendra à la clôture de la mission)
      db.prepare(`UPDATE velo SET etat = 'en_reparation' WHERE id = ? AND etat = 'disponible'`).run(recl.velo_id);
    })();
    res.json({ ok: true });
  });

  // H7 – clôture d'une réclamation : réparation effectuée, le vélo redevient disponible.
  r.post('/reclamations/:id/traitee', resp, (req, res) => {
    const { station_id } = valider(z.object({ station_id: z.coerce.number().int().optional() }), req.body ?? {});
    const recl = db.prepare('SELECT * FROM reclamation WHERE id = ?').get(req.params.id) as
      | { id: number; velo_id: number; statut: string }
      | undefined;
    if (!recl) throw new ErreurMetier(404, 'Réclamation introuvable.');
    if (recl.statut === 'traitee') throw new ErreurMetier(409, 'Cette réclamation est déjà traitée.');
    const v = db.prepare('SELECT * FROM velo WHERE id = ?').get(recl.velo_id) as {
      id: number; station_id: number | null; camion_id: number | null; etat: string;
    };
    db.transaction(() => {
      db.prepare(`UPDATE reclamation SET statut = 'traitee' WHERE id = ?`).run(recl.id);
      if (v.camion_id != null) return; // reste dans le camion jusqu'au dépôt
      if (v.station_id == null && v.etat !== 'loue') {
        // vélo collecté à l'entrepôt : il faut une station d'arrivée
        if (!station_id) throw new ErreurMetier(400, 'Choisissez la station où remettre le vélo réparé.', 'station_id');
        db.prepare(`UPDATE velo SET station_id = ?, etat = 'disponible' WHERE id = ?`).run(station_id, v.id);
        recalculerStation(db, station_id);
      } else if (v.etat === 'en_reparation') {
        db.prepare(`UPDATE velo SET etat = 'disponible' WHERE id = ?`).run(v.id);
      }
    })();
    res.json({ ok: true });
  });

  return r;
}
