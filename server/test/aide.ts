import request from 'supertest';
import { creerSchema, ouvrirBase, type DB } from '../src/db.js';
import { remplirDemo, CODE_DEMO } from '../src/seed.js';
import { creerApp } from '../src/app.js';
import { fixerHorloge } from '../src/horloge.js';

/** Mercredi 25 novembre 2026, 09:00 – date des maquettes. */
export const DATE_TEST = new Date(2026, 10, 25, 9, 0, 0);

export function preparer() {
  fixerHorloge(DATE_TEST);
  const db = ouvrirBase(':memory:');
  creerSchema(db);
  remplirDemo(db);
  const app = creerApp(db, { secret: 'test' });
  return { db, app };
}

export async function connecter(app: ReturnType<typeof creerApp>, profil: string, identifiant: string, code = CODE_DEMO) {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/connexion').send({ profil, identifiant, code });
  if (r.status !== 200) throw new Error(`Connexion impossible : ${r.body.erreur}`);
  return agent;
}

export const idStation = (db: DB, nom: string) => (db.prepare('SELECT id FROM station WHERE nom = ?').get(nom) as { id: number }).id;
export const station = (db: DB, nom: string) =>
  db.prepare('SELECT * FROM station WHERE nom = ?').get(nom) as { id: number; nb_velos: number; capacite: number };
export const velo = (db: DB, serie: string) =>
  db.prepare('SELECT * FROM velo WHERE numero_serie = ?').get(serie) as {
    id: number; etat: string; station_id: number | null; camion_id: number | null;
  };
export const veloDisponible = (db: DB, nomStation: string) =>
  (db
    .prepare(
      `SELECT v.id FROM velo v JOIN station s ON s.id = v.station_id WHERE s.nom = ? AND v.etat = 'disponible'
       AND NOT EXISTS (SELECT 1 FROM reclamation r WHERE r.velo_id = v.id AND r.statut <> 'traitee') LIMIT 1`,
    )
    .get(nomStation) as { id: number }).id;
