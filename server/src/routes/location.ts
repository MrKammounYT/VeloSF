import { Router, type Request } from 'express';
import { z } from 'zod';
import type { DB } from '../db.js';
import { recalculerStation } from '../db.js';
import { ErreurMetier, valider } from '../erreurs.js';
import { HYPOTHESES, calculerFrais, calculerRetenueDepassement } from '../config/hypotheses.js';
import { exigerProfil, utilisateur } from '../acces.js';
import { horodatageISO, maintenant, parseHorodatage } from '../horloge.js';
import { SQL_RECLAMATION_OUVERTE, listerStations } from './flotte.js';
import { creerReclamation } from './maintenance.js';
import { verifierIdentifiants } from './auth.js';
import { encaisser, type ModePaiement } from '../services/paiement.js';

interface LigneVelo { id: number; numero_serie: string; station_id: number | null; etat: string; type: string; couleur: string }
interface LigneLocation {
  id: number; velo_id: number; abonne_id: number | null; occasionnel_id: number | null; carte_temp_id: number | null;
  station_depart_id: number; station_destination_id: number | null; debut: string; duree_prevue_min: number | null;
  frais: number | null; caution: number | null; statut: string;
}

/** Convertit « 2 h », « 1h30 », « 90 min » ou « 45 » (minutes) en minutes. */
export function lireDuree(texte: string): number | null {
  const t = texte.trim().toLowerCase().replace(',', '.');
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d+(?:\.\d+)?)\s*(h|heures?)\s*(\d{1,2})?\s*(min|mn)?$/))) {
    return Math.round(parseFloat(m[1]) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
  }
  if ((m = t.match(/^(\d+)\s*(min|mn|minutes?)?$/))) return parseInt(m[1], 10);
  return null;
}

function veloLouable(db: DB, veloId: number): LigneVelo {
  const v = db
    .prepare(`SELECT v.*, ${SQL_RECLAMATION_OUVERTE} AS recl FROM velo v WHERE v.id = ?`)
    .get(veloId) as (LigneVelo & { recl: number }) | undefined;
  if (!v) throw new ErreurMetier(404, 'Vélo introuvable.');
  if (v.etat !== 'disponible' || v.station_id == null || v.recl) {
    throw new ErreurMetier(409, "Ce vélo n'est plus disponible : choisissez-en un autre.");
  }
  return v;
}

function velosDisponibles(db: DB, stationId: number) {
  return db
    .prepare(
      `SELECT v.id, v.numero_serie, v.type, v.couleur FROM velo v
       WHERE v.station_id = ? AND v.etat = 'disponible' AND NOT ${SQL_RECLAMATION_OUVERTE} ORDER BY v.numero_serie`,
    )
    .all(stationId);
}

/** Ouvre une location dans une transaction : le vélo quitte la station, son compteur diminue. */
function ouvrirLocation(db: DB, v: LigneVelo, champs: Partial<LigneLocation>) {
  return db.transaction(() => {
    const id = db
      .prepare(
        `INSERT INTO location (velo_id, abonne_id, occasionnel_id, carte_temp_id, station_depart_id, station_destination_id,
           debut, duree_prevue_min, frais, caution, statut) VALUES (?,?,?,?,?,?,?,?,?,?, 'en_cours')`,
      )
      .run(
        v.id, champs.abonne_id ?? null, champs.occasionnel_id ?? null, champs.carte_temp_id ?? null, v.station_id,
        champs.station_destination_id ?? null, horodatageISO(), champs.duree_prevue_min ?? null,
        champs.frais ?? null, champs.caution ?? null,
      ).lastInsertRowid as number;
    db.prepare(`UPDATE velo SET etat = 'loue', station_id = NULL WHERE id = ?`).run(v.id);
    recalculerStation(db, v.station_id!);
    return id;
  })();
}

/** Station d'arrivée avec une place libre ; sinon exception avec les stations proposées (CU7). */
function verifierPlace(db: DB, stationId: number) {
  const s = db.prepare('SELECT * FROM station WHERE id = ?').get(stationId) as
    | { id: number; nom: string; capacite: number; nb_velos: number }
    | undefined;
  if (!s) throw new ErreurMetier(404, 'Station introuvable.', 'station_id');
  if (s.nb_velos >= s.capacite) {
    const autres = listerStations(db).filter((x) => x.places_libres > 0).map((x) => x.nom);
    throw new ErreurMetier(
      409,
      `La station « ${s.nom} » est pleine.` + (autres.length ? ` Stations avec places libres : ${autres.join(', ')}.` : ''),
      'station_id',
    );
  }
  return s;
}

/** Clôture une location en cours : le vélo revient dans la station d'arrivée. */
function cloturerLocation(db: DB, loc: LigneLocation, stationId: number, extra: { depassement_min?: number | null } = {}) {
  db.prepare(`UPDATE velo SET etat = 'disponible', station_id = ? WHERE id = ?`).run(stationId, loc.velo_id);
  recalculerStation(db, stationId);
  db.prepare(
    `UPDATE location SET statut = 'terminee', fin = ?, station_arrivee_id = ?, depassement_min = ? WHERE id = ?`,
  ).run(horodatageISO(), stationId, extra.depassement_min ?? null, loc.id);
}

function locationEnCoursAbonne(db: DB, abonneId: number) {
  return db
    .prepare(
      `SELECT l.*, v.numero_serie, v.type, v.couleur, s.nom AS station_depart
       FROM location l JOIN velo v ON v.id = l.velo_id JOIN station s ON s.id = l.station_depart_id
       WHERE l.abonne_id = ? AND l.statut = 'en_cours' ORDER BY l.debut DESC`,
    )
    .get(abonneId) as (LigneLocation & { numero_serie: string; station_depart: string }) | undefined;
}

const schemaInfos = z.object({
  nom: z.string('Le nom est obligatoire.').trim().min(1, 'Le nom est obligatoire.'),
  prenom: z.string('Le prénom est obligatoire.').trim().min(1, 'Le prénom est obligatoire.'),
  type_piece: z.enum(HYPOTHESES.PIECES_IDENTITE, "Choisissez le type de pièce d'identité."),
  numero_piece: z
    .string("Le numéro de pièce d'identité est obligatoire.")
    .trim()
    .min(4, "Le numéro de pièce d'identité est incomplet."),
  station_destination_id: z.coerce.number('Choisissez la station de destination.').int(),
  duree: z.string("La durée d'utilisation est obligatoire.").trim().min(1, "La durée d'utilisation est obligatoire."),
});

export function routesLocation(db: DB) {
  const r = Router();
  const abo = exigerProfil('abonne');

  // Stations pour les écrans de location (tous profils, y compris l'occasionnel sans compte)
  r.get('/stations-location', (_req, res) => {
    res.json({
      stations: listerStations(db).map((s) => ({
        id: s.id, nom: s.nom, adresse: s.adresse, capacite: s.capacite, nb_velos: s.nb_velos,
        places_libres: s.places_libres, velos_disponibles: s.velos_disponibles, statut: s.statut,
        carte_x: s.carte_x, carte_y: s.carte_y,
      })),
    });
  });

  // ================= CU5 – Abonné =================
  r.get('/abonne/etat', abo, (req, res) => {
    const loc = locationEnCoursAbonne(db, utilisateur(req).id);
    res.json({ carteVerifiee: !!req.session.carteVerifiee, location: loc ?? null, numero_carte: utilisateur(req).identifiant });
  });

  // Écran 12 – vérification de la carte d'abonné et du code secret
  r.post('/abonne/verifier-carte', abo, (req, res) => {
    const d = valider(
      z.object({
        numero_carte: z.string('Numéro de carte obligatoire.').trim().min(1, 'Numéro de carte obligatoire.'),
        code: z.string('Code secret obligatoire.').min(1, 'Code secret obligatoire.'),
      }),
      req.body,
    );
    const u = utilisateur(req);
    if (d.numero_carte !== u.identifiant) throw new ErreurMetier(401, 'Carte invalide pour ce compte.', 'numero_carte');
    verifierIdentifiants(db, 'abonne', d.numero_carte, d.code);
    req.session.carteVerifiee = true;
    res.json({ ok: true });
  });

  r.get('/location/velos', (req, res) => {
    const id = Number(req.query.station_id);
    if (!id) throw new ErreurMetier(400, 'Choisissez une station de départ.');
    res.json({ velos: velosDisponibles(db, id) });
  });

  // Écran 13 – choix du vélo
  r.post('/abonne/locations', abo, (req, res) => {
    if (!req.session.carteVerifiee) throw new ErreurMetier(401, 'Identifiez-vous avec votre carte et votre code secret.');
    const { velo_id } = valider(z.object({ velo_id: z.coerce.number().int() }), req.body);
    const u = utilisateur(req);
    const enCours = db
      .prepare(`SELECT COUNT(*) n FROM location WHERE abonne_id = ? AND statut = 'en_cours'`)
      .get(u.id) as { n: number };
    if (enCours.n >= HYPOTHESES.MAX_LOCATIONS_EN_COURS_ABONNE) {
      throw new ErreurMetier(409, 'Vous avez déjà une location en cours : restituez d’abord votre vélo.');
    }
    const v = veloLouable(db, velo_id);
    const id = ouvrirLocation(db, v, { abonne_id: u.id });
    res.status(201).json({ id });
  });

  // CU5 scénario alternatif – vélo défectueux rendu, réclamation créée (H8)
  r.post('/abonne/signaler', abo, (req, res) => {
    const d = valider(
      z.object({ velo_id: z.coerce.number().int(), diagnostic: z.string().trim().optional().default('') }),
      req.body,
    );
    const u = utilisateur(req);
    const loc = locationEnCoursAbonne(db, u.id);
    db.transaction(() => {
      if (loc && loc.velo_id === d.velo_id) {
        // L'abonné rend immédiatement le vélo défectueux dans sa station de départ
        cloturerLocation(db, loc, loc.station_depart_id);
      } else {
        const v = db.prepare('SELECT * FROM velo WHERE id = ?').get(d.velo_id) as LigneVelo | undefined;
        if (!v || v.station_id == null) throw new ErreurMetier(404, 'Vélo introuvable en station.');
      }
      if (HYPOTHESES.SIGNALEMENT_ABONNE_CREE_RECLAMATION) {
        creerReclamation(db, {
          veloId: d.velo_id, diagnostic: d.diagnostic || 'Signalé défectueux par un abonné', signalePar: u.id,
          origine: 'abonne_location',
        });
      }
    })();
    res.json({ ok: true });
  });

  // Écran 15 – CU7 restitution abonné
  r.post('/abonne/restitution', abo, (req, res) => {
    const d = valider(
      z.object({
        station_id: z.coerce.number('Choisissez une station d’arrivée.').int(),
        bon_etat: z.boolean().default(true),
        probleme: z.string().trim().optional().default(''),
      }),
      req.body,
    );
    const u = utilisateur(req);
    const loc = locationEnCoursAbonne(db, u.id);
    if (!loc) throw new ErreurMetier(404, 'Aucune location en cours.');
    verifierPlace(db, d.station_id);
    let reclamation = false;
    db.transaction(() => {
      cloturerLocation(db, loc, d.station_id);
      if ((!d.bon_etat || d.probleme) && HYPOTHESES.SIGNALEMENT_ABONNE_CREE_RECLAMATION) {
        creerReclamation(db, {
          veloId: loc.velo_id, diagnostic: d.probleme || 'Rendu en mauvais état par un abonné', signalePar: u.id,
          origine: 'abonne_restitution',
        });
        reclamation = true;
      }
    })();
    req.session.carteVerifiee = false;
    res.json({ ok: true, reclamation });
  });

  // ================= CU6 – Utilisateur occasionnel (sans compte) =================
  const parcours = (req: Request) => (req.session.occasionnel ??= {});

  r.get('/occ/etat', (req, res) => {
    const p = req.session.occasionnel ?? {};
    const carte = p.carteId
      ? db.prepare('SELECT numero, valide_jusqu_a, restituee FROM carte_temporaire WHERE id = ?').get(p.carteId)
      : null;
    const loc = p.locationId
      ? db
          .prepare(
            `SELECT l.statut, l.debut, v.numero_serie, v.type, v.couleur, s.nom AS station_depart
             FROM location l JOIN velo v ON v.id = l.velo_id JOIN station s ON s.id = l.station_depart_id WHERE l.id = ?`,
          )
          .get(p.locationId)
      : null;
    const infos = p.occasionnelId
      ? db.prepare('SELECT nom, prenom, piece_identite FROM occasionnel WHERE id = ?').get(p.occasionnelId)
      : null;
    res.json({ etape: { infos: !!p.dureeMin, paye: !!p.paiementId, carte, location: loc }, infos, brouillon: p });
  });

  // Écran 16 – identité, destination, durée
  r.post('/occ/informations', (req, res) => {
    const d = valider(schemaInfos, req.body);
    const p = parcours(req);
    if (p.paiementId) throw new ErreurMetier(409, 'Le paiement est déjà effectué : la demande ne peut plus être modifiée.');
    const duree = lireDuree(d.duree);
    if (duree == null) throw new ErreurMetier(400, 'Durée invalide (ex. : 2 h, 1h30, 90 min).', 'duree');
    if (duree < HYPOTHESES.DUREE_MIN_MIN || duree > HYPOTHESES.DUREE_MAX_MIN) {
      throw new ErreurMetier(
        400,
        `La durée doit être comprise entre ${HYPOTHESES.DUREE_MIN_MIN} min et ${HYPOTHESES.DUREE_MAX_MIN / 60} h.`,
        'duree',
      );
    }
    const dest = db.prepare('SELECT * FROM station WHERE id = ?').get(d.station_destination_id) as
      | { nom: string; capacite: number; nb_velos: number }
      | undefined;
    if (!dest) throw new ErreurMetier(400, 'Station de destination introuvable.', 'station_destination_id');
    if (HYPOTHESES.REFUS_DESTINATION_PLEINE && dest.nb_velos >= dest.capacite) {
      throw new ErreurMetier(409, `La station « ${dest.nom} » n'a aucune place libre : choisissez une autre destination.`, 'station_destination_id');
    }
    const piece = `${d.type_piece} ${d.numero_piece}`;
    if (p.occasionnelId) {
      db.prepare('UPDATE occasionnel SET nom=?, prenom=?, piece_identite=? WHERE id=?').run(d.nom, d.prenom, piece, p.occasionnelId);
    } else {
      p.occasionnelId = db.prepare('INSERT INTO occasionnel (nom, prenom, piece_identite) VALUES (?,?,?)')
        .run(d.nom, d.prenom, piece).lastInsertRowid as number;
    }
    p.stationDestinationId = d.station_destination_id;
    p.dureeMin = duree;
    res.json({ ok: true, duree_min: duree });
  });

  // Écran 17 – montant
  r.get('/occ/devis', (req, res) => {
    const p = req.session.occasionnel;
    if (!p?.dureeMin) throw new ErreurMetier(400, 'Renseignez d’abord vos informations.');
    const frais = calculerFrais(p.dureeMin);
    const caution = HYPOTHESES.CAUTION_TND;
    const total = frais != null && caution != null ? frais + caution : null;
    const dest = db.prepare('SELECT nom FROM station WHERE id = ?').get(p.stationDestinationId) as { nom: string };
    res.json({
      frais, caution, total, devise: HYPOTHESES.DEVISE, duree_min: p.dureeMin, destination: dest?.nom,
      modes: HYPOTHESES.MODES_PAIEMENT, paye: !!p.paiementId,
    });
  });

  r.post('/occ/paiement', (req, res) => {
    const { mode } = valider(
      z.object({ mode: z.enum(['carte_bancaire', 'especes'], 'Choisissez un mode de paiement.') }),
      req.body,
    );
    const p = req.session.occasionnel;
    if (!p?.dureeMin || !p.occasionnelId) throw new ErreurMetier(400, 'Renseignez d’abord vos informations.');
    if (p.paiementId) throw new ErreurMetier(409, 'Le paiement est déjà effectué.');
    const frais = calculerFrais(p.dureeMin);
    const caution = HYPOTHESES.CAUTION_TND;
    const total = frais != null && caution != null ? frais + caution : null;
    const resultat = encaisser(total, mode as ModePaiement);
    if (!resultat.accepte) throw new ErreurMetier(402, `Paiement refusé : ${resultat.motif}`);
    const ids = db.transaction(() => {
      const fin = new Date(maintenant().getTime() + p.dureeMin! * 60_000);
      const max = db.prepare('SELECT COALESCE(MAX(id), 0) + 457 AS n FROM carte_temporaire').get() as { n: number };
      const numero = `T-${String(max.n).padStart(6, '0')}`;
      const carteId = db
        .prepare('INSERT INTO carte_temporaire (numero, occasionnel_id, valide_jusqu_a) VALUES (?,?,?)')
        .run(numero, p.occasionnelId, horodatageISO(fin)).lastInsertRowid as number;
      const paiementId = db
        .prepare(
          `INSERT INTO paiement (occasionnel_id, carte_temp_id, mode, frais, caution, station_destination_id, duree_prevue_min, date_paiement)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(p.occasionnelId, carteId, mode, frais, caution, p.stationDestinationId, p.dureeMin, horodatageISO())
        .lastInsertRowid as number;
      return { carteId, paiementId };
    })();
    p.carteId = ids.carteId;
    p.paiementId = ids.paiementId;
    res.status(201).json({ ok: true });
  });

  // Écran 18 – carte délivrée
  r.get('/occ/carte', (req, res) => {
    const p = req.session.occasionnel;
    if (!p?.carteId) throw new ErreurMetier(400, 'Aucune carte délivrée : effectuez d’abord le paiement.');
    const carte = db.prepare('SELECT numero, valide_jusqu_a, restituee FROM carte_temporaire WHERE id = ?').get(p.carteId);
    res.json({ carte, duree_min: p.dureeMin });
  });

  // Choix du vélo avec la carte courte durée
  r.post('/occ/location', (req, res) => {
    const { velo_id } = valider(z.object({ velo_id: z.coerce.number().int() }), req.body);
    const p = req.session.occasionnel;
    if (!p?.carteId || !p.paiementId) throw new ErreurMetier(400, 'Payez d’abord les frais et la caution.');
    if (p.locationId) throw new ErreurMetier(409, 'Un vélo a déjà été pris avec cette carte.');
    const paiement = db.prepare('SELECT * FROM paiement WHERE id = ?').get(p.paiementId) as {
      frais: number | null; caution: number | null; station_destination_id: number; duree_prevue_min: number;
    };
    const v = veloLouable(db, velo_id);
    p.locationId = ouvrirLocation(db, v, {
      occasionnel_id: p.occasionnelId, carte_temp_id: p.carteId, station_destination_id: paiement.station_destination_id,
      duree_prevue_min: paiement.duree_prevue_min, frais: paiement.frais, caution: paiement.caution,
    });
    res.status(201).json({ id: p.locationId });
  });

  // Écran 19 – CU7 restitution occasionnel
  const locationParCarte = (numero: string) => {
    const carte = db.prepare('SELECT * FROM carte_temporaire WHERE upper(numero) = upper(?)').get(numero.trim()) as
      | { id: number; numero: string; restituee: number; valide_jusqu_a: string }
      | undefined;
    if (!carte) throw new ErreurMetier(404, 'Carte courte durée inconnue.', 'numero_carte');
    if (carte.restituee) throw new ErreurMetier(409, 'Cette carte a déjà été restituée.', 'numero_carte');
    const loc = db.prepare(`SELECT * FROM location WHERE carte_temp_id = ? AND statut = 'en_cours'`).get(carte.id) as
      | LigneLocation
      | undefined;
    if (!loc) throw new ErreurMetier(404, 'Aucun vélo en location avec cette carte.', 'numero_carte');
    return { carte, loc };
  };

  const calculRemboursement = (loc: LigneLocation) => {
    const prevu = parseHorodatage(loc.debut).getTime() + (loc.duree_prevue_min ?? 0) * 60_000;
    const depassementMin = Math.max(0, Math.ceil((maintenant().getTime() - prevu) / 60_000));
    const retenue = calculerRetenueDepassement(depassementMin);
    const caution = loc.caution;
    const rembourse = caution == null || retenue == null ? null : Math.max(0, caution - retenue);
    return {
      caution, depassement_min: depassementMin, retenue, rembourse, devise: HYPOTHESES.DEVISE,
      regle_definie: HYPOTHESES.REGLE_DEPASSEMENT != null,
    };
  };

  r.get('/occ/restitution/:numero', (req, res) => {
    const { carte, loc } = locationParCarte(req.params.numero);
    const velo = db.prepare('SELECT numero_serie FROM velo WHERE id = ?').get(loc.velo_id);
    res.json({ carte: carte.numero, velo, ...calculRemboursement(loc) });
  });

  r.post('/occ/restitution', (req, res) => {
    const d = valider(
      z.object({
        numero_carte: z.string('Saisissez le numéro de carte.').trim().min(1, 'Saisissez le numéro de carte.'),
        station_id: z.coerce.number('Choisissez la station d’arrivée.').int(),
      }),
      req.body,
    );
    const { carte, loc } = locationParCarte(d.numero_carte);
    verifierPlace(db, d.station_id);
    const calc = calculRemboursement(loc);
    db.transaction(() => {
      cloturerLocation(db, loc, d.station_id, { depassement_min: calc.depassement_min });
      db.prepare('UPDATE carte_temporaire SET restituee = 1 WHERE id = ?').run(carte.id);
      db.prepare('UPDATE location SET caution_remboursee = 1 WHERE id = ?').run(loc.id);
    })();
    if (req.session.occasionnel?.carteId === carte.id) req.session.occasionnel = {};
    res.json({ ok: true, ...calc });
  });

  r.post('/occ/recommencer', (req, res) => {
    req.session.occasionnel = {};
    res.json({ ok: true });
  });

  return r;
}
