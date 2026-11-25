import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ErreurMetier } from './erreurs.js';

export type DB = Database.Database;

const ici = path.dirname(fileURLToPath(import.meta.url));
export const CHEMIN_SCHEMA = path.resolve(ici, '../../database/schema.sql');
export const CHEMIN_BASE = path.resolve(ici, '../../database/velosf.db');

export function ouvrirBase(fichier: string = CHEMIN_BASE): DB {
  const db = new Database(fichier);
  db.pragma('foreign_keys = ON');
  return db;
}

export function creerSchema(db: DB) {
  db.exec(readFileSync(CHEMIN_SCHEMA, 'utf8'));
}

export function baseExiste(db: DB): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='station'").get();
}

/**
 * Recalcule le compteur nb_velos d'une station à partir des vélos qui y sont rattachés.
 * Toute opération qui déplace un vélo (achat, location, restitution, mission) l'appelle dans sa transaction :
 * la contrainte CHECK (nb_velos <= capacite) refuse alors le dépassement.
 */
export function recalculerStation(db: DB, stationId: number) {
  try {
    db.prepare(
      `UPDATE station SET nb_velos = (SELECT COUNT(*) FROM velo WHERE station_id = @id) WHERE id = @id`,
    ).run({ id: stationId });
  } catch (e) {
    if (String((e as Error).message).includes('CHECK')) {
      throw new ErreurMetier(409, 'La station est pleine : aucune place libre.');
    }
    throw e;
  }
}

/** Vérifie que chaque compteur de station correspond aux vélos rattachés (utilisé par les tests). */
export function compteursCoherents(db: DB): boolean {
  const r = db
    .prepare(
      `SELECT COUNT(*) n FROM station s
       WHERE s.nb_velos <> (SELECT COUNT(*) FROM velo v WHERE v.station_id = s.id)`,
    )
    .get() as { n: number };
  return r.n === 0;
}
