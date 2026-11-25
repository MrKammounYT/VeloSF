import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter } from './aide.js';

describe('CU3 – Gérer les fournisseurs', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('liste, ajoute et modifie un fournisseur (H2)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const l = await a.get('/api/fournisseurs');
    expect(l.body.fournisseurs.map((f: { nom: string; velos_achetes: number }) => [f.nom, f.velos_achetes])).toEqual([
      ['CycloTun', 24], ['Sport&Bike', 10], ['Vélo Plus', 16],
    ]);
    const c = await a.post('/api/fournisseurs').send({ nom: 'Bici Sud', adresse: 'Sfax', telephone: '74 333 333', email: 'bici@sud.example' });
    expect(c.status).toBe(201);
    const m = await a.put(`/api/fournisseurs/${c.body.id}`).send({ nom: 'Bici Sud', telephone: '74 444 444' });
    expect(m.status).toBe(200);
    expect((await a.delete(`/api/fournisseurs/${c.body.id}`)).status).toBe(200);
  });

  it('exceptions : nom manquant, fournisseur déjà existant, suppression d’un fournisseur lié à des vélos (H15)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    expect((await a.post('/api/fournisseurs').send({ nom: ' ' })).body.erreur).toMatch(/nom est obligatoire/);
    const d = await a.post('/api/fournisseurs').send({ nom: 'cyclotun' });
    expect(d.status).toBe(409);
    expect(d.body.erreur).toMatch(/existe déjà/);
    const id = (ctx.db.prepare(`SELECT id FROM fournisseur WHERE nom = 'CycloTun'`).get() as { id: number }).id;
    const s = await a.delete(`/api/fournisseurs/${id}`);
    expect(s.status).toBe(409);
    expect(s.body.erreur).toMatch(/24 vélo/);
  });
});
