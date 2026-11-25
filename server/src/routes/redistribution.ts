import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db.js';
import { recalculerStation } from '../db.js';
import { ErreurMetier, valider } from '../erreurs.js';
import { HYPOTHESES } from '../config/hypotheses.js';
import { exigerProfil, utilisateur } from '../acces.js';
import { ajouterJours, horodatageISO, jourISO } from '../horloge.js';
import { SQL_RECLAMATION_OUVERTE, listerStations } from './flotte.js';

type TypeEtape = 'prise' | 'depot' | 'collecte';
interface Etape { id?: number; ordre: number; station_id: number | null; type: TypeEtape; nb_velos: number | null; station?: string | null }
interface Ordre {
  id: number; itineraire_id: number; technicien_id: number; camion_id: number | null; date_heure: string;
  consignes: string | null; statut: 'brouillon' | 'envoye' | 'en_cours' | 'termine';
}

export function etapesItineraire(db: DB, itineraireId: number): Etape[] {
  return db
    .prepare(
      `SELECT e.id, e.ordre, e.station_id, e.type, e.nb_velos, s.nom AS station
       FROM etape_itineraire e LEFT JOIN station s ON s.id = e.station_id WHERE e.itineraire_id = ? ORDER BY e.ordre`,
    )
    .all(itineraireId) as Etape[];
}

/** Libellé court d'un itinéraire : « Sakiet Eddaïer → Thyna → Gare de Sfax ». */
function libelleItineraire(etapes: Etape[]) {
  const noms: string[] = [];
  for (const e of etapes) if (e.type !== 'collecte' && e.station && noms.at(-1) !== e.station) noms.push(e.station);
  return noms.join(' → ') || 'Collecte des vélos en panne';
}

const nbVelosADeplacer = (etapes: Etape[]) =>
  etapes.filter((e) => e.type === 'depot').reduce((a, e) => a + (e.nb_velos ?? 0), 0);

/** CU10 – exception « étapes incohérentes » : on ne dépose jamais plus de vélos que le camion n'en a pris. */
export function verifierEtapes(db: DB, etapes: Omit<Etape, 'ordre'>[]) {
  if (!etapes.length) throw new ErreurMetier(400, "L'itinéraire doit contenir au moins une étape.");
  let charge = 0;
  etapes.forEach((e, i) => {
    const n = i + 1;
    if (e.type !== 'collecte') {
      if (!e.station_id) throw new ErreurMetier(400, `Étape ${n} : choisissez une station.`);
      if (!e.nb_velos || e.nb_velos < 1) throw new ErreurMetier(400, `Étape ${n} : indiquez un nombre de vélos.`);
    }
    if (e.station_id && !db.prepare('SELECT 1 FROM station WHERE id = ?').get(e.station_id)) {
      throw new ErreurMetier(400, `Étape ${n} : station introuvable.`);
    }
    if (e.type === 'prise') charge += e.nb_velos!;
    if (e.type === 'depot') {
      charge -= e.nb_velos!;
      if (charge < 0) {
        throw new ErreurMetier(400, `Étapes incohérentes : à l'étape ${n}, plus de vélos déposés que de vélos pris.`);
      }
    }
  });
}

/**
 * Aide à la préparation (écran 10) : proposition modifiable. Les stations au-dessus du taux moyen du réseau
 * cèdent leur surplus, celles sous le seuil « Vide » (H14) le reçoivent ; ordre du plus plein au plus vide.
 */
function proposerItineraire(db: DB) {
  const stations = listerStations(db);
  const cap = stations.reduce((a, s) => a + s.capacite, 0);
  const velos = stations.reduce((a, s) => a + s.nb_velos, 0);
  const moyenne = cap ? velos / cap : 0;
  const receveurs = stations
    .filter((s) => s.statut === 'vide')
    .map((s) => ({ s, besoin: Math.max(1, Math.round(moyenne * s.capacite * 0.6) - s.nb_velos) }))
    .sort((a, b) => a.s.occupation - b.s.occupation);
  const donneurs = stations
    .filter((s) => s.statut === 'pleine' || s.occupation / 100 > moyenne + 0.15)
    .map((s) => ({ s, surplus: Math.max(0, Math.min(s.velos_disponibles, Math.floor(s.nb_velos - moyenne * s.capacite))) }))
    .filter((d) => d.surplus > 0)
    .sort((a, b) => b.s.occupation - a.s.occupation);
  const besoinTotal = receveurs.reduce((a, r) => a + r.besoin, 0);
  const etapes: Omit<Etape, 'ordre'>[] = [];
  let aPrendre = besoinTotal;
  for (const d of donneurs) {
    if (aPrendre <= 0) break;
    const n = Math.min(d.surplus, aPrendre);
    etapes.push({ station_id: d.s.id, type: 'prise', nb_velos: n, station: d.s.nom });
    aPrendre -= n;
  }
  let charge = besoinTotal - Math.max(0, aPrendre);
  for (const r of receveurs) {
    if (charge <= 0) break;
    const n = Math.min(r.besoin, charge, r.s.places_libres);
    if (n > 0) etapes.push({ station_id: r.s.id, type: 'depot', nb_velos: n, station: r.s.nom });
    charge -= n;
  }
  const enPanne = db
    .prepare(
      `SELECT v.station_id, s.nom, COUNT(*) n FROM velo v JOIN station s ON s.id = v.station_id
       WHERE ${SQL_RECLAMATION_OUVERTE} GROUP BY v.station_id ORDER BY n DESC`,
    )
    .all() as { station_id: number; nom: string; n: number }[];
  for (const p of enPanne) etapes.push({ station_id: p.station_id, type: 'collecte', nb_velos: p.n, station: p.nom });
  return etapes;
}

const schemaEtapes = z.object({
  etapes: z.array(
    z.object({
      type: z.enum(['prise', 'depot', 'collecte'], "Type d'étape invalide."),
      station_id: z.coerce.number().int().nullable().optional(),
      nb_velos: z.coerce.number().int().nullable().optional(),
    }),
  ),
});

const schemaOrdre = z.object({
  itineraire_id: z.coerce.number('Choisissez un itinéraire.').int('Choisissez un itinéraire.'),
  technicien_id: z.coerce.number('Choisissez un technicien.').int('Choisissez un technicien.'),
  camion_id: z.coerce.number().int().nullable().optional(),
  date_heure: z.string('Indiquez la date et l’heure.').regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Date et heure invalides (JJ/MM/AAAA hh:mm).'),
  consignes: z.string().trim().optional().default(''),
  envoyer: z.boolean().default(true),
});

export function routesRedistribution(db: DB) {
  const r = Router();
  const resp = exigerProfil('responsable');
  const tech = exigerProfil('technicien');

  // ---------- CU10 – Équilibre des stations (écran 09)
  r.get('/equilibre', resp, (_req, res) => {
    const stations = listerStations(db);
    const pleines = stations.filter((s) => s.statut === 'pleine').sort((a, b) => b.occupation - a.occupation);
    const vides = stations.filter((s) => s.statut === 'vide').sort((a, b) => a.occupation - b.occupation);
    const donneurs = pleines.length
      ? pleines
      : stations.filter((s) => s.statut === 'equilibree').sort((a, b) => b.occupation - a.occupation).slice(0, 1);
    const suggestions = vides.length && donneurs.length
      ? vides.map((v, i) => ({ de: donneurs[i % donneurs.length].nom, vers: v.nom }))
      : pleines.map((p) => ({ de: p.nom, vers: null as string | null }));
    const debut = ajouterJours(jourISO(), -7);
    const mouvements = db
      .prepare(
        `SELECT s.id, s.nom,
           (SELECT COUNT(*) FROM location l WHERE l.station_depart_id = s.id AND l.debut >= ?) AS departs,
           (SELECT COUNT(*) FROM location l WHERE l.station_arrivee_id = s.id AND l.fin >= ?) AS arrivees
         FROM station s ORDER BY s.id`,
      )
      .all(debut, debut);
    res.json({
      stations, suggestions, mouvements, desequilibre: pleines.length + vides.length > 0,
      compteurs: { pleines: pleines.length, vides: vides.length, equilibrees: stations.length - pleines.length - vides.length },
      seuils: { vide: HYPOTHESES.SEUIL_VIDE, pleine: HYPOTHESES.SEUIL_PLEINE },
    });
  });

  // ---------- CU10 – Itinéraires (écran 10)
  r.get('/itineraires', resp, (_req, res) => {
    const its = db.prepare('SELECT * FROM itineraire ORDER BY id DESC').all() as { id: number; date_creation: string }[];
    res.json({
      itineraires: its.map((it) => {
        const etapes = etapesItineraire(db, it.id);
        const ordre = db.prepare('SELECT id, statut FROM ordre_mission WHERE itineraire_id = ? ORDER BY id DESC').get(it.id);
        return { ...it, libelle: libelleItineraire(etapes), etapes, nb_etapes: etapes.length, velos: nbVelosADeplacer(etapes), ordre };
      }),
    });
  });

  r.get('/itineraires/proposition', resp, (_req, res) => {
    const stations = listerStations(db);
    if (!stations.some((s) => s.statut !== 'equilibree')) {
      res.json({ etapes: [], message: 'Aucune station déséquilibrée : pas d’itinéraire à proposer.' });
      return;
    }
    res.json({ etapes: proposerItineraire(db) });
  });

  const enregistrerEtapes = (itId: number, etapes: z.infer<typeof schemaEtapes>['etapes']) => {
    db.prepare('DELETE FROM etape_itineraire WHERE itineraire_id = ?').run(itId);
    const ins = db.prepare('INSERT INTO etape_itineraire (itineraire_id, ordre, station_id, type, nb_velos) VALUES (?,?,?,?,?)');
    etapes.forEach((e, i) => ins.run(itId, i + 1, e.station_id ?? null, e.type, e.nb_velos ?? null));
  };

  r.post('/itineraires', resp, (req, res) => {
    const { etapes } = valider(schemaEtapes, req.body);
    verifierEtapes(db, etapes.map((e) => ({ ...e, station_id: e.station_id ?? null, nb_velos: e.nb_velos ?? null })));
    const id = db.transaction(() => {
      const itId = db.prepare('INSERT INTO itineraire (cree_par, date_creation) VALUES (?,?)')
        .run(utilisateur(req).id, horodatageISO()).lastInsertRowid as number;
      enregistrerEtapes(itId, etapes);
      return itId;
    })();
    res.status(201).json({ id });
  });

  r.put('/itineraires/:id', resp, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM itineraire WHERE id = ?').get(id)) throw new ErreurMetier(404, 'Itinéraire introuvable.');
    const engage = db.prepare(`SELECT 1 FROM ordre_mission WHERE itineraire_id = ? AND statut IN ('en_cours','termine')`).get(id);
    if (engage) throw new ErreurMetier(409, 'Cet itinéraire est déjà en cours d’exécution : il ne peut plus être modifié.');
    const { etapes } = valider(schemaEtapes, req.body);
    verifierEtapes(db, etapes.map((e) => ({ ...e, station_id: e.station_id ?? null, nb_velos: e.nb_velos ?? null })));
    db.transaction(() => enregistrerEtapes(id, etapes))();
    res.json({ id });
  });

  // ---------- CU11 – Ordres de mission (écran 11)
  r.get('/ordres', resp, (_req, res) => {
    const ordres = db
      .prepare(
        `SELECT o.*, t.nom AS technicien, c.nom AS camion FROM ordre_mission o
         JOIN utilisateur t ON t.id = o.technicien_id LEFT JOIN camion c ON c.id = o.camion_id ORDER BY o.date_heure DESC`,
      )
      .all();
    const techniciens = db.prepare(`SELECT id, nom FROM utilisateur WHERE profil = 'technicien' ORDER BY nom`).all();
    const camions = db.prepare('SELECT id, nom, capacite FROM camion ORDER BY nom').all();
    res.json({ ordres, techniciens, camions });
  });

  const verifierOrdre = (d: z.infer<typeof schemaOrdre>, saufId = -1) => {
    if (!db.prepare('SELECT 1 FROM itineraire WHERE id = ?').get(d.itineraire_id)) {
      throw new ErreurMetier(400, 'Itinéraire introuvable.', 'itineraire_id');
    }
    if (!db.prepare(`SELECT 1 FROM utilisateur WHERE id = ? AND profil = 'technicien'`).get(d.technicien_id)) {
      throw new ErreurMetier(400, 'Technicien introuvable.', 'technicien_id');
    }
    if (HYPOTHESES.CAMION_OBLIGATOIRE && !d.camion_id) throw new ErreurMetier(400, 'Choisissez un camion.', 'camion_id');
    if (d.camion_id && !db.prepare('SELECT 1 FROM camion WHERE id = ?').get(d.camion_id)) {
      throw new ErreurMetier(400, 'Camion introuvable.', 'camion_id');
    }
    // H12/H13 – créneau = même journée, ordre non terminé
    const jour = d.date_heure.slice(0, 10);
    const conflit = db
      .prepare(
        `SELECT technicien_id, camion_id FROM ordre_mission
         WHERE id <> ? AND statut IN ('envoye','en_cours') AND substr(date_heure, 1, 10) = ? AND (technicien_id = ? OR camion_id = ?)`,
      )
      .get(saufId, jour, d.technicien_id, d.camion_id ?? -1) as { technicien_id: number; camion_id: number } | undefined;
    if (conflit && d.envoyer) {
      throw new ErreurMetier(
        409,
        conflit.technicien_id === d.technicien_id
          ? 'Ce technicien est déjà affecté à une mission ce jour-là.'
          : 'Ce camion est déjà affecté à une mission ce jour-là.',
      );
    }
  };

  r.post('/ordres', resp, (req, res) => {
    const d = valider(schemaOrdre, req.body);
    verifierOrdre(d);
    const id = db
      .prepare(
        `INSERT INTO ordre_mission (itineraire_id, technicien_id, camion_id, date_heure, consignes, statut) VALUES (?,?,?,?,?,?)`,
      )
      .run(d.itineraire_id, d.technicien_id, d.camion_id ?? null, d.date_heure, d.consignes, d.envoyer ? 'envoye' : 'brouillon')
      .lastInsertRowid;
    res.status(201).json({ id });
  });

  r.put('/ordres/:id', resp, (req, res) => {
    const id = Number(req.params.id);
    const o = db.prepare('SELECT * FROM ordre_mission WHERE id = ?').get(id) as Ordre | undefined;
    if (!o) throw new ErreurMetier(404, 'Ordre de mission introuvable.');
    if (o.statut !== 'brouillon') throw new ErreurMetier(409, 'Seul un brouillon peut être modifié.');
    const d = valider(schemaOrdre, req.body);
    verifierOrdre(d, id);
    db.prepare(
      'UPDATE ordre_mission SET itineraire_id=?, technicien_id=?, camion_id=?, date_heure=?, consignes=?, statut=? WHERE id=?',
    ).run(d.itineraire_id, d.technicien_id, d.camion_id ?? null, d.date_heure, d.consignes, d.envoyer ? 'envoye' : 'brouillon', id);
    res.json({ id });
  });

  r.delete('/ordres/:id', resp, (req, res) => {
    const o = db.prepare('SELECT * FROM ordre_mission WHERE id = ?').get(req.params.id) as Ordre | undefined;
    if (!o) throw new ErreurMetier(404, 'Ordre de mission introuvable.');
    if (o.statut !== 'brouillon') throw new ErreurMetier(409, 'Seul un brouillon peut être annulé.');
    db.prepare('DELETE FROM ordre_mission WHERE id = ?').run(o.id);
    res.json({ ok: true });
  });

  // ---------- CU9 – Ma mission (écrans 22 et 23)
  const maMission = (techId: number) =>
    db
      .prepare(
        `SELECT o.*, c.nom AS camion, c.capacite AS capacite_camion FROM ordre_mission o LEFT JOIN camion c ON c.id = o.camion_id
         WHERE o.technicien_id = ? AND o.statut IN ('envoye','en_cours')
         ORDER BY CASE o.statut WHEN 'en_cours' THEN 0 ELSE 1 END, o.date_heure LIMIT 1`,
      )
      .get(techId) as (Ordre & { camion: string | null; capacite_camion: number | null }) | undefined;

  const detailMission = (o: NonNullable<ReturnType<typeof maMission>>) => {
    const etapes = etapesItineraire(db, o.itineraire_id).map((e) => {
      const x = db
        .prepare('SELECT fait, commentaire, nb_velos_reel, non_realisable FROM execution_etape WHERE ordre_mission_id = ? AND etape_id = ?')
        .get(o.id, e.id) as { fait: number; commentaire: string | null; nb_velos_reel: number | null; non_realisable: number } | undefined;
      return { ...e, fait: !!x?.fait, non_realisable: !!x?.non_realisable, commentaire: x?.commentaire ?? null, nb_velos_reel: x?.nb_velos_reel ?? null };
    });
    const dansCamion = o.camion_id
      ? (db.prepare(`SELECT COUNT(*) n FROM velo WHERE camion_id = ?`).get(o.camion_id) as { n: number }).n
      : 0;
    const prochaine = etapes.find((e) => !e.fait && !e.non_realisable) ?? null;
    return { ordre: o, libelle: libelleItineraire(etapes), etapes, prochaine, dans_camion: dansCamion };
  };

  r.get('/tech/mission', tech, (req, res) => {
    const o = maMission(utilisateur(req).id);
    res.json(o ? detailMission(o) : { ordre: null });
  });

  r.post('/tech/mission/etape', tech, (req, res) => {
    const d = valider(
      z.object({
        etape_id: z.coerce.number().int(),
        nb_velos: z.coerce.number().int().min(0).nullable().optional(),
        non_realisable: z.boolean().default(false),
        commentaire: z.string().trim().optional().default(''),
      }),
      req.body,
    );
    const o = maMission(utilisateur(req).id);
    if (!o) throw new ErreurMetier(404, 'Aucune mission en cours.');
    const { prochaine } = detailMission(o);
    if (!prochaine || prochaine.id !== d.etape_id) throw new ErreurMetier(409, 'Réalisez les étapes dans l’ordre de l’itinéraire.');
    if (d.non_realisable && !d.commentaire) {
      throw new ErreurMetier(400, 'Expliquez en commentaire pourquoi l’étape n’est pas réalisable.', 'commentaire');
    }
    const camion = o.camion_id;
    if (!camion && !d.non_realisable) throw new ErreurMetier(409, 'Aucun camion attribué à cette mission.');
    const enCamion = () => (db.prepare('SELECT COUNT(*) n FROM velo WHERE camion_id = ?').get(camion) as { n: number }).n;

    db.transaction(() => {
      if (o.statut === 'envoye') db.prepare(`UPDATE ordre_mission SET statut = 'en_cours' WHERE id = ?`).run(o.id);
      let reel = 0;
      if (!d.non_realisable) {
        const n = d.nb_velos ?? prochaine.nb_velos ?? 0;
        if (prochaine.type === 'prise') {
          if (o.capacite_camion != null && enCamion() + n > o.capacite_camion) {
            throw new ErreurMetier(409, `Capacité du camion insuffisante (${o.capacite_camion} vélos, ${enCamion()} déjà chargés).`);
          }
          const velos = db
            .prepare(
              `SELECT v.id FROM velo v WHERE v.station_id = ? AND v.etat = 'disponible' AND NOT ${SQL_RECLAMATION_OUVERTE}
               ORDER BY v.id LIMIT ?`,
            )
            .all(prochaine.station_id, n) as { id: number }[];
          if (velos.length < n) {
            throw new ErreurMetier(409, `Seulement ${velos.length} vélo(s) disponible(s) dans cette station : indiquez le nombre réel ou signalez l’étape non réalisable.`);
          }
          const up = db.prepare(`UPDATE velo SET etat = 'en_camion', station_id = NULL, camion_id = ? WHERE id = ?`);
          velos.forEach((v) => up.run(camion, v.id));
          recalculerStation(db, prochaine.station_id!);
          reel = velos.length;
        } else if (prochaine.type === 'depot') {
          const velos = db
            .prepare(`SELECT v.id FROM velo v WHERE v.camion_id = ? AND NOT ${SQL_RECLAMATION_OUVERTE} ORDER BY v.id LIMIT ?`)
            .all(camion, n) as { id: number }[];
          if (velos.length < n) throw new ErreurMetier(409, `Le camion ne contient que ${velos.length} vélo(s) en état de rouler.`);
          const st = db.prepare('SELECT capacite, nb_velos, nom FROM station WHERE id = ?').get(prochaine.station_id) as {
            capacite: number; nb_velos: number; nom: string;
          };
          if (st.nb_velos + n > st.capacite) {
            throw new ErreurMetier(409, `Station pleine : seulement ${st.capacite - st.nb_velos} place(s) libre(s) à ${st.nom}.`);
          }
          const up = db.prepare(`UPDATE velo SET etat = 'disponible', station_id = ?, camion_id = NULL WHERE id = ?`);
          velos.forEach((v) => up.run(prochaine.station_id, v.id));
          recalculerStation(db, prochaine.station_id!);
          reel = velos.length;
        } else {
          // Collecte des vélos en panne (réclamation ouverte), dans la station indiquée ou partout
          const velos = db
            .prepare(
              `SELECT v.id, v.station_id FROM velo v WHERE v.station_id IS NOT NULL AND ${SQL_RECLAMATION_OUVERTE}
               AND (? IS NULL OR v.station_id = ?) ORDER BY v.id LIMIT ?`,
            )
            .all(prochaine.station_id, prochaine.station_id, n || 1000) as { id: number; station_id: number }[];
          if (o.capacite_camion != null && enCamion() + velos.length > o.capacite_camion) {
            throw new ErreurMetier(409, 'Capacité du camion insuffisante pour collecter ces vélos.');
          }
          const up = db.prepare(`UPDATE velo SET etat = 'en_camion', station_id = NULL, camion_id = ? WHERE id = ?`);
          velos.forEach((v) => up.run(camion, v.id));
          new Set(velos.map((v) => v.station_id)).forEach((s) => recalculerStation(db, s));
          reel = velos.length;
        }
      }
      db.prepare(
        `INSERT INTO execution_etape (ordre_mission_id, etape_id, fait, commentaire, nb_velos_reel, non_realisable)
         VALUES (?,?,?,?,?,?)
         ON CONFLICT (ordre_mission_id, etape_id) DO UPDATE SET fait = excluded.fait, commentaire = excluded.commentaire,
           nb_velos_reel = excluded.nb_velos_reel, non_realisable = excluded.non_realisable`,
      ).run(o.id, prochaine.id, d.non_realisable ? 0 : 1, d.commentaire || null, reel, d.non_realisable ? 1 : 0);
    })();
    res.json(detailMission(maMission(utilisateur(req).id)!));
  });

  const recapitulatif = (o: NonNullable<ReturnType<typeof maMission>>) => {
    const { etapes, dans_camion } = detailMission(o);
    const somme = (t: TypeEtape) => etapes.filter((e) => e.type === t && e.fait).reduce((a, e) => a + (e.nb_velos_reel ?? 0), 0);
    return {
      velos_deplaces: somme('depot'), velos_collectes: somme('collecte'),
      etapes_terminees: etapes.filter((e) => e.fait || e.non_realisable).length, etapes_total: etapes.length,
      non_realisables: etapes.filter((e) => e.non_realisable).length, dans_camion,
    };
  };

  r.get('/tech/mission/recap', tech, (req, res) => {
    const o = maMission(utilisateur(req).id);
    if (!o) throw new ErreurMetier(404, 'Aucune mission en cours.');
    res.json({ ordre: o, ...recapitulatif(o) });
  });

  r.post('/tech/mission/cloturer', tech, (req, res) => {
    const { commentaire } = valider(z.object({ commentaire: z.string().trim().optional().default('') }), req.body ?? {});
    const o = maMission(utilisateur(req).id);
    if (!o) throw new ErreurMetier(404, 'Aucune mission en cours.');
    const recap = recapitulatif(o);
    if (recap.etapes_terminees < recap.etapes_total) {
      throw new ErreurMetier(409, `Il reste ${recap.etapes_total - recap.etapes_terminees} étape(s) à réaliser avant de terminer.`);
    }
    db.transaction(() => {
      // Les vélos en panne collectés sont déposés à l'entrepôt pour réparation
      db.prepare(
        `UPDATE velo SET etat = 'en_reparation', camion_id = NULL WHERE camion_id = ? AND id IN
           (SELECT velo_id FROM reclamation WHERE statut <> 'traitee')`,
      ).run(o.camion_id ?? -1);
      db.prepare(`UPDATE ordre_mission SET statut = 'termine', commentaire_cloture = ?, date_cloture = ? WHERE id = ?`).run(
        commentaire || null, horodatageISO(), o.id,
      );
    })();
    res.json({ ok: true, ...recap });
  });

  return r;
}
