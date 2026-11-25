import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, station, veloDisponible } from './aide.js';
import { compteursCoherents } from '../src/db.js';

describe('CU5 – Louer un vélo (abonné)', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('nominal : carte + code (écran 12), choix du vélo (13), location ouverte (14)', async () => {
    const a = await connecter(ctx.app, 'abonne', '000123');
    expect((await a.post('/api/abonne/verifier-carte').send({ numero_carte: '000123', code: '1234' })).status).toBe(200);
    const centre = station(ctx.db, 'Sfax Centre');
    const velos = await a.get(`/api/location/velos?station_id=${centre.id}`);
    expect(velos.body.velos.length).toBeGreaterThan(0);
    const r = await a.post('/api/abonne/locations').send({ velo_id: velos.body.velos[0].id });
    expect(r.status).toBe(201);
    expect(station(ctx.db, 'Sfax Centre').nb_velos).toBe(centre.nb_velos - 1);
    const etat = await a.get('/api/abonne/etat');
    expect(etat.body.location).toMatchObject({ station_depart: 'Sfax Centre', statut: 'en_cours' });
    expect(compteursCoherents(ctx.db)).toBe(true);
  });

  it('alternatif : signale un vélo défectueux, le rend et en prend un autre (H8)', async () => {
    const a = await connecter(ctx.app, 'abonne', '000123');
    await a.post('/api/abonne/verifier-carte').send({ numero_carte: '000123', code: '1234' });
    const v1 = veloDisponible(ctx.db, 'Médina');
    await a.post('/api/abonne/locations').send({ velo_id: v1 });
    expect((await a.post('/api/abonne/signaler').send({ velo_id: v1, diagnostic: 'Selle cassée' })).status).toBe(200);
    expect(ctx.db.prepare(`SELECT origine FROM reclamation WHERE velo_id = ? AND statut = 'a_planifier'`).get(v1)).toMatchObject({ origine: 'abonne_location' });
    const v2 = veloDisponible(ctx.db, 'Médina');
    expect(v2).not.toBe(v1);
    expect((await a.post('/api/abonne/locations').send({ velo_id: v2 })).status).toBe(201);
    expect(compteursCoherents(ctx.db)).toBe(true);
  });

  it('exceptions : code incorrect, aucun vélo disponible, location déjà en cours (H9)', async () => {
    const a = await connecter(ctx.app, 'abonne', '000123');
    const faux = await a.post('/api/abonne/verifier-carte').send({ numero_carte: '000123', code: '0000' });
    expect(faux.status).toBe(401);
    expect(faux.body.erreur).toMatch(/incorrect/);
    expect((await a.post('/api/abonne/locations').send({ velo_id: veloDisponible(ctx.db, 'Thyna') })).status).toBe(401);
    await a.post('/api/abonne/verifier-carte').send({ numero_carte: '000123', code: '1234' });
    // Gare de Sfax : 3 vélos, tous sous réclamation → aucun disponible
    expect((await a.get(`/api/location/velos?station_id=${station(ctx.db, 'Gare de Sfax').id}`)).body.velos).toEqual([]);
    await a.post('/api/abonne/locations').send({ velo_id: veloDisponible(ctx.db, 'Thyna') });
    const deux = await a.post('/api/abonne/locations').send({ velo_id: veloDisponible(ctx.db, 'Sfax Centre') });
    expect(deux.status).toBe(409);
    expect(deux.body.erreur).toMatch(/déjà une location en cours/);
  });
});
