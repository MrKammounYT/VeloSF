import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { preparer, station, veloDisponible } from './aide.js';
import { definirPrestataire } from '../src/services/paiement.js';
import { HYPOTHESES } from '../src/config/hypotheses.js';
import { compteursCoherents } from '../src/db.js';

const infos = (destination: number, duree = '2 h') => ({
  nom: 'Kammoun', prenom: 'Sami', type_piece: 'CIN', numero_piece: '01234567', station_destination_id: destination, duree,
});

describe('CU6 – Louer un vélo (utilisateur occasionnel)', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));
  afterEach(() => {
    definirPrestataire(null);
    HYPOTHESES.TARIF_HORAIRE_TND = null;
    HYPOTHESES.CAUTION_TND = null;
  });

  it('nominal sans compte : informations → montant « — TND » (H11) → paiement → carte → vélo', async () => {
    const a = request.agent(ctx.app);
    expect((await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Thyna').id))).body.duree_min).toBe(120);
    const devis = await a.get('/api/occ/devis');
    expect(devis.body).toMatchObject({ frais: null, caution: null, total: null, devise: 'TND' });
    expect((await a.post('/api/occ/paiement').send({ mode: 'especes' })).status).toBe(201);
    const carte = await a.get('/api/occ/carte');
    expect(carte.body.carte.numero).toMatch(/^T-\d{6}$/);
    const centre = station(ctx.db, 'Sfax Centre');
    expect((await a.post('/api/occ/location').send({ velo_id: veloDisponible(ctx.db, 'Sfax Centre') })).status).toBe(201);
    expect(station(ctx.db, 'Sfax Centre').nb_velos).toBe(centre.nb_velos - 1);
    expect(compteursCoherents(ctx.db)).toBe(true);
  });

  it('calcule les frais quand les tarifs sont configurés', async () => {
    HYPOTHESES.TARIF_HORAIRE_TND = 2;
    HYPOTHESES.CAUTION_TND = 50;
    const a = request.agent(ctx.app);
    await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Thyna').id, '1h30'));
    expect((await a.get('/api/occ/devis')).body).toMatchObject({ frais: 4, caution: 50, total: 54 });
  });

  it('alternatif : retour en arrière pour modifier la durée avant paiement', async () => {
    const a = request.agent(ctx.app);
    await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Thyna').id, '2 h'));
    await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Médina').id, '45 min'));
    expect((await a.get('/api/occ/devis')).body).toMatchObject({ duree_min: 45, destination: 'Médina' });
  });

  it('exceptions : identité incomplète, destination sans place (H), paiement refusé, vélo indisponible', async () => {
    const a = request.agent(ctx.app);
    const inc = await a.post('/api/occ/informations').send({ ...infos(station(ctx.db, 'Thyna').id), numero_piece: '' });
    expect(inc.status).toBe(400);
    const pleine = await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Sakiet Eddaïer').id));
    expect(pleine.status).toBe(409);
    expect(pleine.body.erreur).toMatch(/aucune place libre/);
    await a.post('/api/occ/informations').send(infos(station(ctx.db, 'Thyna').id));
    definirPrestataire(() => ({ accepte: false, motif: 'carte refusée par la banque.' }));
    const refus = await a.post('/api/occ/paiement').send({ mode: 'carte_bancaire' });
    expect(refus.status).toBe(402);
    expect(refus.body.erreur).toMatch(/Paiement refusé/);
    definirPrestataire(null);
    await a.post('/api/occ/paiement').send({ mode: 'carte_bancaire' });
    const enPanne = (ctx.db.prepare(`SELECT id FROM velo WHERE numero_serie = 'VS-0201'`).get() as { id: number }).id;
    expect((await a.post('/api/occ/location').send({ velo_id: enPanne })).status).toBe(409);
  });
});
