import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, velo } from './aide.js';

describe('CU4 – Planifier une réparation', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  const reclamation = (serie: string) =>
    (ctx.db.prepare('SELECT r.* FROM reclamation r JOIN velo v ON v.id = r.velo_id WHERE v.numero_serie = ?').get(serie) as { id: number; statut: string });
  const tech = (id: string) => (ctx.db.prepare('SELECT id FROM utilisateur WHERE identifiant = ?').get(id) as { id: number }).id;

  it('planifie : réclamation « planifiée », vélo « en réparation » (H6, H7)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const l = await a.get('/api/reclamations');
    expect(l.body.reclamations[0]).toMatchObject({ statut: 'a_planifier' });
    const r = await a.post('/api/reparations').send({ reclamation_id: reclamation('VS-0201').id, date: '2026-11-26', technicien_id: tech('tech1') });
    expect(r.status).toBe(200);
    expect(reclamation('VS-0201').statut).toBe('planifiee');
    expect(velo(ctx.db, 'VS-0201').etat).toBe('en_reparation');
    const sem = await a.get('/api/planification?semaine=2026-11-25');
    expect(sem.body.debut).toBe('2026-11-23');
    expect(sem.body.reparations.map((x: { numero_serie: string }) => x.numero_serie).sort()).toEqual(['VS-0142', 'VS-0201']);
  });

  it('modifie une planification existante, puis marque la réclamation traitée', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const id = reclamation('VS-0142').id;
    expect((await a.post('/api/reparations').send({ reclamation_id: id, date: '2026-11-27', technicien_id: tech('tech2') })).status).toBe(200);
    expect((await a.post(`/api/reclamations/${id}/traitee`).send({})).status).toBe(200);
    expect(velo(ctx.db, 'VS-0142').etat).toBe('disponible');
  });

  it('exceptions : date dans le passé, technicien déjà occupé (H6)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const passe = await a.post('/api/reparations').send({ reclamation_id: reclamation('VS-0201').id, date: '2026-11-20', technicien_id: tech('tech1') });
    expect(passe.status).toBe(400);
    expect(passe.body.erreur).toMatch(/passé/);
    // VS-0142 est déjà planifié mardi 24/11 pour le Technicien 1 → on teste un jour futur déjà pris
    await a.post('/api/reparations').send({ reclamation_id: reclamation('VS-0201').id, date: '2026-11-26', technicien_id: tech('tech1') });
    const occupe = await a.post('/api/reparations').send({ reclamation_id: reclamation('VS-0087').id, date: '2026-11-26', technicien_id: tech('tech1') });
    expect(occupe.status).toBe(409);
    expect(occupe.body.erreur).toMatch(/déjà occupé/);
  });
});
