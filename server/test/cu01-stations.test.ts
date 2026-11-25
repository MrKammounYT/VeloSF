import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, station } from './aide.js';
import { compteursCoherents } from '../src/db.js';

describe('CU1 – Gérer les stations', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('liste les stations avec occupation et statut (H14)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const r = await a.get('/api/stations');
    expect(r.status).toBe(200);
    expect(r.body.totaux).toMatchObject({ stations: 6, capacite: 84, velos: 50, a_reparer: 4 });
    const gare = r.body.stations.find((s: { nom: string }) => s.nom === 'Gare de Sfax');
    expect(gare).toMatchObject({ occupation: 19, statut: 'vide' });
    const eddaier = r.body.stations.find((s: { nom: string }) => s.nom === 'Sakiet Eddaïer');
    expect(eddaier.statut).toBe('pleine');
    expect(compteursCoherents(ctx.db)).toBe(true);
  });

  it('crée, consulte, modifie puis supprime une station', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const c = await a.post('/api/stations').send({ nom: 'Route El Ain', adresse: 'Route El Ain km 3', capacite: 10 });
    expect(c.status).toBe(201);
    const d = await a.get(`/api/stations/${c.body.id}`);
    expect(d.body.station).toMatchObject({ nom: 'Route El Ain', nb_velos: 0, capacite: 10 });
    const m = await a.put(`/api/stations/${c.body.id}`).send({ nom: 'Route El Ain', adresse: 'Route El Ain km 4', capacite: 12 });
    expect(m.status).toBe(200);
    expect((await a.delete(`/api/stations/${c.body.id}`)).status).toBe(200);
  });

  it('exceptions : champ manquant, capacité inférieure aux vélos présents, suppression avec vélos (H15)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const manquant = await a.post('/api/stations').send({ nom: '', adresse: 'x', capacite: 5 });
    expect(manquant.status).toBe(400);
    expect(manquant.body.erreur).toMatch(/nom est obligatoire/);
    const centre = station(ctx.db, 'Sfax Centre');
    const cap = await a.put(`/api/stations/${centre.id}`).send({ nom: 'Sfax Centre', adresse: 'Av. Habib Bourguiba', capacite: 10 });
    expect(cap.status).toBe(409);
    expect(cap.body.erreur).toMatch(/inférieure au nombre de vélos/);
    const sup = await a.delete(`/api/stations/${centre.id}`);
    expect(sup.status).toBe(409);
    expect(sup.body.erreur).toMatch(/contient 17 vélo/);
  });

  it('refuse l’accès aux autres profils', async () => {
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    expect((await t.get('/api/stations')).status).toBe(403);
  });
});
