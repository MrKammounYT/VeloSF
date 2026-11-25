import { describe, expect, it, beforeEach } from 'vitest';
import { preparer, connecter, station, velo } from './aide.js';

describe('CU2 – Acheter un vélo', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('enregistre un vélo « disponible » affecté à une station (H3) et met à jour le compteur', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const ref = await a.get('/api/velos/achat');
    expect(ref.body.derniers[0].numero_serie).toBe('VS-0300');
    const gare = station(ctx.db, 'Gare de Sfax');
    const f = ref.body.fournisseurs.find((x: { nom: string }) => x.nom === 'CycloTun');
    const r = await a.post('/api/velos').send({ numero_serie: 'VS-0301', fournisseur_id: f.id, type: 'Ville', couleur: 'Bleu', station_id: gare.id });
    expect(r.status).toBe(201);
    expect(velo(ctx.db, 'VS-0301')).toMatchObject({ etat: 'disponible', station_id: gare.id });
    expect(station(ctx.db, 'Gare de Sfax').nb_velos).toBe(gare.nb_velos + 1);
  });

  it('exceptions : numéro de série déjà utilisé, station pleine', async () => {
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    const { body } = await a.get('/api/velos/achat');
    const f = body.fournisseurs[0].id;
    const doublon = await a.post('/api/velos').send({ numero_serie: 'vs-0142', fournisseur_id: f, type: 'VTT', couleur: 'Rouge', station_id: station(ctx.db, 'Thyna').id });
    expect(doublon.status).toBe(409);
    expect(doublon.body.erreur).toMatch(/déjà utilisé/);
    const pleine = await a.post('/api/velos').send({ numero_serie: 'VS-0999', fournisseur_id: f, type: 'VTT', couleur: 'Rouge', station_id: station(ctx.db, 'Sakiet Eddaïer').id });
    expect(pleine.status).toBe(409);
    expect(pleine.body.erreur).toMatch(/pleine/);
  });
});
