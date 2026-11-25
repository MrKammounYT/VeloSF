import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, station } from './aide.js';
import { compteursCoherents } from '../src/db.js';

describe('CU9 – Répartir les vélos entre les stations', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('nominal : prise, dépôts, collecte, clôture avec récapitulatif', async () => {
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    const m = await t.get('/api/tech/mission');
    expect(m.body.libelle).toBe('Sakiet Eddaïer → Thyna → Gare de Sfax');
    expect(m.body.etapes).toHaveLength(4);
    for (const e of m.body.etapes) {
      const r = await t.post('/api/tech/mission/etape').send({ etape_id: e.id });
      expect(r.status, r.body.erreur).toBe(200);
    }
    expect(station(ctx.db, 'Sakiet Eddaïer').nb_velos).toBe(6); // 12 − 5 pris − 1 en panne collecté
    expect(station(ctx.db, 'Thyna').nb_velos).toBe(4);
    expect(station(ctx.db, 'Gare de Sfax').nb_velos).toBe(5);
    const recap = await t.get('/api/tech/mission/recap');
    expect(recap.body).toMatchObject({ velos_deplaces: 5, velos_collectes: 1, etapes_terminees: 4, etapes_total: 4 });
    const fin = await t.post('/api/tech/mission/cloturer').send({ commentaire: 'RAS' });
    expect(fin.status).toBe(200);
    const panne = ctx.db.prepare(`SELECT COUNT(*) n FROM velo WHERE etat = 'en_reparation' AND station_id IS NULL AND camion_id IS NULL`).get() as { n: number };
    expect(panne.n).toBe(1); // à l'entrepôt
    expect(compteursCoherents(ctx.db)).toBe(true);
    expect((await t.get('/api/tech/mission')).body.ordre).toBeNull();
  });

  it('alternatif : étape non réalisable avec commentaire', async () => {
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    const m = await t.get('/api/tech/mission');
    const sans = await t.post('/api/tech/mission/etape').send({ etape_id: m.body.etapes[0].id, non_realisable: true });
    expect(sans.status).toBe(400);
    const r = await t.post('/api/tech/mission/etape').send({ etape_id: m.body.etapes[0].id, non_realisable: true, commentaire: 'Accès bloqué' });
    expect(r.body.prochaine.id).toBe(m.body.etapes[1].id);
    // Rien pris : le dépôt suivant est impossible (camion vide)
    const depot = await t.post('/api/tech/mission/etape').send({ etape_id: m.body.etapes[1].id });
    expect(depot.status).toBe(409);
  });

  it('exceptions : capacité du camion insuffisante (H12), étapes hors ordre, clôture prématurée', async () => {
    ctx.db.prepare(`UPDATE camion SET capacite = 3 WHERE nom = 'Camion 1'`).run();
    const t = await connecter(ctx.app, 'technicien', 'tech1');
    const m = await t.get('/api/tech/mission');
    expect((await t.post('/api/tech/mission/etape').send({ etape_id: m.body.etapes[2].id })).status).toBe(409);
    const cap = await t.post('/api/tech/mission/etape').send({ etape_id: m.body.etapes[0].id });
    expect(cap.status).toBe(409);
    expect(cap.body.erreur).toMatch(/Capacité du camion insuffisante/);
    expect((await t.post('/api/tech/mission/cloturer').send({})).status).toBe(409);
  });
});
