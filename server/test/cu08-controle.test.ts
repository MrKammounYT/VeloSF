import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter } from './aide.js';

describe('CU8 – Contrôler les vélos et enregistrer une réclamation', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('nominal : contrôle OK, réclamation avec technicien et date automatiques, clôture du contrôle', async () => {
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    const l = await t.get('/api/controle');
    expect(l.body.velos).toHaveLength(50);
    const [premier] = l.body.velos;
    expect((await t.post('/api/controle').send({ velo_id: premier.id })).status).toBe(200);
    const sain = l.body.velos.find((v: { reclamation_ouverte: number; numero_serie: string }) => !v.reclamation_ouverte && v.numero_serie !== premier.numero_serie);
    const r = await t.post('/api/reclamations').send({ numero_serie: sain.numero_serie, diagnostic: 'Éclairage défectueux' });
    expect(r.status).toBe(201);
    const recl = ctx.db.prepare('SELECT r.*, u.identifiant FROM reclamation r JOIN utilisateur u ON u.id = r.technicien_id WHERE r.id = ?').get(r.body.id);
    expect(recl).toMatchObject({ identifiant: 'tech1', date_reclamation: '2026-11-25', statut: 'a_planifier' });
    const fin = await t.post('/api/controle/terminer');
    expect(fin.body).toMatchObject({ total: 50, ok: 1, anomalies: 1, non_controles: 48 });
  });

  it('exceptions : diagnostic vide, vélo déjà sous réclamation ouverte', async () => {
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    expect((await t.post('/api/reclamations').send({ numero_serie: 'VS-0150', diagnostic: '' })).status).toBe(400);
    const deja = await t.post('/api/reclamations').send({ numero_serie: 'VS-0201', diagnostic: 'Chaîne' });
    expect(deja.status).toBe(409);
    expect(deja.body.erreur).toMatch(/déjà une réclamation ouverte/);
  });
});
