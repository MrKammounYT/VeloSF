import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, idStation } from './aide.js';

describe('CU10 – Préparer un itinéraire', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('consulte l’équilibre (H14) et les mouvements de location', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const e = await a.get('/api/equilibre');
    expect(e.body.compteurs).toEqual({ pleines: 1, vides: 2, equilibrees: 3 });
    expect(e.body.suggestions).toEqual([
      { de: 'Sakiet Eddaïer', vers: 'Thyna' },
      { de: 'Sakiet Eddaïer', vers: 'Gare de Sfax' },
    ]);
    expect(e.body.mouvements.reduce((s: number, m: { departs: number }) => s + m.departs, 0)).toBe(20);
  });

  it('propose puis enregistre un itinéraire ordonné du plus plein au plus vide, et le modifie', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const p = await a.get('/api/itineraires/proposition');
    expect(p.body.etapes[0]).toMatchObject({ type: 'prise', station: 'Sakiet Eddaïer' });
    expect(p.body.etapes.some((x: { type: string }) => x.type === 'collecte')).toBe(true);
    const c = await a.post('/api/itineraires').send({ etapes: p.body.etapes });
    expect(c.status).toBe(201);
    const m = await a.put(`/api/itineraires/${c.body.id}`).send({
      etapes: [
        { type: 'prise', station_id: idStation(ctx.db, 'Sakiet Eddaïer'), nb_velos: 4 },
        { type: 'depot', station_id: idStation(ctx.db, 'Thyna'), nb_velos: 4 },
        { type: 'collecte', station_id: null, nb_velos: null },
      ],
    });
    expect(m.status).toBe(200);
    const l = await a.get('/api/itineraires');
    expect(l.body.itineraires[0]).toMatchObject({ libelle: 'Sakiet Eddaïer → Thyna', velos: 4, nb_etapes: 3 });
  });

  it('exceptions : étapes incohérentes (plus de vélos déposés que pris), aucune station déséquilibrée', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const r = await a.post('/api/itineraires').send({
      etapes: [
        { type: 'prise', station_id: idStation(ctx.db, 'Sakiet Eddaïer'), nb_velos: 2 },
        { type: 'depot', station_id: idStation(ctx.db, 'Thyna'), nb_velos: 3 },
      ],
    });
    expect(r.status).toBe(400);
    expect(r.body.erreur).toMatch(/incohérentes/);
    // On équilibre artificiellement toutes les stations
    ctx.db.exec(`UPDATE velo SET station_id = NULL, etat = 'loue' WHERE station_id IN (SELECT id FROM station WHERE nom = 'Sakiet Eddaïer') AND id IN (SELECT id FROM velo WHERE station_id = (SELECT id FROM station WHERE nom = 'Sakiet Eddaïer') LIMIT 4)`);
    ctx.db.exec(`UPDATE velo SET station_id = (SELECT id FROM station WHERE nom = 'Thyna'), etat = 'disponible' WHERE etat = 'loue' AND id IN (SELECT id FROM velo WHERE etat = 'loue' LIMIT 2)`);
    ctx.db.exec(`UPDATE velo SET station_id = (SELECT id FROM station WHERE nom = 'Gare de Sfax'), etat = 'disponible' WHERE etat = 'loue'`);
    ctx.db.exec(`UPDATE station SET nb_velos = (SELECT COUNT(*) FROM velo v WHERE v.station_id = station.id)`);
    const p = await a.get('/api/itineraires/proposition');
    expect(p.body.message).toMatch(/Aucune station déséquilibrée/);
  });
});
