import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { preparer, connecter, station, veloDisponible } from './aide.js';
import { avancerHorloge } from '../src/horloge.js';
import { HYPOTHESES } from '../src/config/hypotheses.js';
import { compteursCoherents } from '../src/db.js';

describe('CU7 – Restituer un vélo', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));
  afterEach(() => {
    HYPOTHESES.CAUTION_TND = null;
    HYPOTHESES.REGLE_DEPASSEMENT = null;
  });

  async function abonneEnLocation() {
    const a = await connecter(ctx.app, 'abonne', '000123');
    await a.post('/api/abonne/verifier-carte').send({ numero_carte: '000123', code: '1234' });
    await a.post('/api/abonne/locations').send({ velo_id: veloDisponible(ctx.db, 'Sfax Centre') });
    return a;
  }

  it('abonné : restitution dans une station avec places libres, location clôturée', async () => {
    const a = await abonneEnLocation();
    const thyna = station(ctx.db, 'Thyna');
    const r = await a.post('/api/abonne/restitution').send({ station_id: thyna.id, bon_etat: true });
    expect(r.body).toMatchObject({ ok: true, reclamation: false });
    expect(station(ctx.db, 'Thyna').nb_velos).toBe(thyna.nb_velos + 1);
    expect((await a.get('/api/abonne/etat')).body.location).toBeNull();
    expect(compteursCoherents(ctx.db)).toBe(true);
  });

  it('abonné : vélo signalé en mauvais état → réclamation (H8) ; station pleine → autre station proposée', async () => {
    const a = await abonneEnLocation();
    const pleine = await a.post('/api/abonne/restitution').send({ station_id: station(ctx.db, 'Sakiet Eddaïer').id });
    expect(pleine.status).toBe(409);
    expect(pleine.body.erreur).toMatch(/pleine.*Stations avec places libres/);
    const r = await a.post('/api/abonne/restitution').send({ station_id: station(ctx.db, 'Médina').id, bon_etat: false, probleme: 'Frein arrière mou' });
    expect(r.body.reclamation).toBe(true);
  });

  it('occasionnel : carte + station d’arrivée, caution remboursée, dépassement mesuré (règle non définie)', async () => {
    HYPOTHESES.CAUTION_TND = 50;
    const a = request.agent(ctx.app);
    await a.post('/api/occ/informations').send({
      nom: 'Kammoun', prenom: 'Sami', type_piece: 'Passeport', numero_piece: 'X1234567',
      station_destination_id: station(ctx.db, 'Thyna').id, duree: '1 h',
    });
    await a.post('/api/occ/paiement').send({ mode: 'especes' });
    const numero = (await a.get('/api/occ/carte')).body.carte.numero;
    await a.post('/api/occ/location').send({ velo_id: veloDisponible(ctx.db, 'Sfax Centre') });
    avancerHorloge(90 * 60_000); // 30 min de retard
    const apercu = await request(ctx.app).get(`/api/occ/restitution/${numero}`);
    expect(apercu.body).toMatchObject({ caution: 50, depassement_min: 30, retenue: null, rembourse: null, regle_definie: false });
    const r = await request(ctx.app).post('/api/occ/restitution').send({ numero_carte: numero, station_id: station(ctx.db, 'Thyna').id });
    expect(r.status).toBe(200);
    const carte = ctx.db.prepare('SELECT restituee FROM carte_temporaire WHERE numero = ?').get(numero) as { restituee: number };
    expect(carte.restituee).toBe(1);
    expect(compteursCoherents(ctx.db)).toBe(true);
    // carte déjà restituée
    expect((await request(ctx.app).post('/api/occ/restitution').send({ numero_carte: numero, station_id: station(ctx.db, 'Thyna').id })).status).toBe(409);
  });

  it('occasionnel : retenue appliquée si une règle de dépassement est configurée', async () => {
    HYPOTHESES.CAUTION_TND = 50;
    HYPOTHESES.REGLE_DEPASSEMENT = { penaliteParHeureTND: 5 };
    const a = request.agent(ctx.app);
    await a.post('/api/occ/informations').send({
      nom: 'K', prenom: 'S', type_piece: 'CIN', numero_piece: '01234567', station_destination_id: station(ctx.db, 'Thyna').id, duree: '1 h',
    });
    await a.post('/api/occ/paiement').send({ mode: 'especes' });
    const numero = (await a.get('/api/occ/carte')).body.carte.numero;
    await a.post('/api/occ/location').send({ velo_id: veloDisponible(ctx.db, 'Médina') });
    avancerHorloge(130 * 60_000);
    const r = await request(ctx.app).post('/api/occ/restitution').send({ numero_carte: numero, station_id: station(ctx.db, 'Thyna').id });
    expect(r.body).toMatchObject({ depassement_min: 70, retenue: 10, rembourse: 40 });
  });

  it('exception : carte inconnue', async () => {
    const r = await request(ctx.app).post('/api/occ/restitution').send({ numero_carte: 'T-999999', station_id: 1 });
    expect(r.status).toBe(404);
  });
});
