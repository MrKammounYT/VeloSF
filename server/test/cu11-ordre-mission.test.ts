import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, idStation } from './aide.js';

describe('CU11 – Donner un ordre de mission', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  const id = (table: string, col: string, val: string) =>
    (ctx.db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val) as { id: number }).id;

  async function nouvelItineraire(a: Awaited<ReturnType<typeof connecter>>) {
    const r = await a.post('/api/itineraires').send({
      etapes: [
        { type: 'prise', station_id: idStation(ctx.db, 'Sfax Centre'), nb_velos: 2 },
        { type: 'depot', station_id: idStation(ctx.db, 'Thyna'), nb_velos: 2 },
      ],
    });
    return r.body.id as number;
  }

  it('nominal : l’ordre envoyé apparaît dans « Ma mission » du technicien', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const it = await nouvelItineraire(a);
    const r = await a.post('/api/ordres').send({
      itineraire_id: it, technicien_id: id('utilisateur', 'identifiant', 'tech2'), camion_id: id('camion', 'nom', 'Camion 2'),
      date_heure: '2026-11-25T14:00', consignes: 'Vérifier les pneus',
    });
    expect(r.status).toBe(201);
    const t = await connecter(ctx.app, 'technicien', 'tech2');
    const m = await t.get('/api/tech/mission');
    expect(m.body.ordre).toMatchObject({ statut: 'envoye', consignes: 'Vérifier les pneus' });
  });

  it('alternatif : brouillon (non visible du technicien), puis envoi', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const it = await nouvelItineraire(a);
    const corps = {
      itineraire_id: it, technicien_id: id('utilisateur', 'identifiant', 'tech2'), camion_id: id('camion', 'nom', 'Camion 2'),
      date_heure: '2026-11-26T09:00', envoyer: false,
    };
    const b = await a.post('/api/ordres').send(corps);
    const t = await connecter(ctx.app, 'technicien', 'tech2');
    expect((await t.get('/api/tech/mission')).body.ordre).toBeNull();
    expect((await a.put(`/api/ordres/${b.body.id}`).send({ ...corps, envoyer: true })).status).toBe(200);
    expect((await t.get('/api/tech/mission')).body.ordre.statut).toBe('envoye');
  });

  it('exceptions : technicien ou camion déjà affecté au même créneau (H12, H13)', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const it = await nouvelItineraire(a);
    const tech = await a.post('/api/ordres').send({
      itineraire_id: it, technicien_id: id('utilisateur', 'identifiant', 'tech1'), camion_id: id('camion', 'nom', 'Camion 2'),
      date_heure: '2026-11-25T15:00',
    });
    expect(tech.status).toBe(409);
    expect(tech.body.erreur).toMatch(/technicien est déjà affecté/);
    const camion = await a.post('/api/ordres').send({
      itineraire_id: it, technicien_id: id('utilisateur', 'identifiant', 'tech2'), camion_id: id('camion', 'nom', 'Camion 1'),
      date_heure: '2026-11-25T15:00',
    });
    expect(camion.status).toBe(409);
    expect(camion.body.erreur).toMatch(/camion est déjà affecté/);
  });
});
