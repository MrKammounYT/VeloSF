import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { preparer, connecter } from './aide.js';
import { HYPOTHESES } from '../src/config/hypotheses.js';

describe('CU12 – S’authentifier', () => {
  let ctx: ReturnType<typeof preparer>;
  beforeEach(() => (ctx = preparer()));

  it('ouvre une session sur le profil choisi (H4)', async () => {
    for (const [profil, id] of [['responsable', 'responsable'], ['technicien', 'tech1'], ['abonne', '000123']]) {
      const a = await connecter(ctx.app, profil, id);
      expect((await a.get('/api/auth/moi')).body.utilisateur.profil).toBe(profil);
    }
  });

  it('contrôle d’accès : chaque profil n’accède qu’à ses écrans', async () => {
    const abo = await connecter(ctx.app, 'abonne', '000123');
    expect((await abo.get('/api/reclamations')).status).toBe(403);
    expect((await abo.get('/api/tech/mission')).status).toBe(403);
    expect((await request(ctx.app).get('/api/stations')).status).toBe(401);
    // L'occasionnel n'a pas de compte mais accède à son parcours
    expect((await request(ctx.app).get('/api/occ/etat')).status).toBe(200);
  });

  it('exceptions : identifiant ou code incorrect, mauvais profil, blocage après plusieurs essais (H5)', async () => {
    const a = request.agent(ctx.app);
    const inconnu = await a.post('/api/auth/connexion').send({ profil: 'technicien', identifiant: 'personne', code: '1234' });
    expect(inconnu.status).toBe(401);
    const profil = await a.post('/api/auth/connexion').send({ profil: 'responsable', identifiant: 'tech1', code: '1234' });
    expect(profil.status).toBe(401);
    for (let i = 1; i < HYPOTHESES.MAX_ESSAIS_CONNEXION; i++) {
      const r = await a.post('/api/auth/connexion').send({ profil: 'technicien', identifiant: 'tech2', code: '0000' });
      expect(r.status).toBe(401);
      expect(r.body.erreur).toMatch(/Il vous reste/);
    }
    const bloque = await a.post('/api/auth/connexion').send({ profil: 'technicien', identifiant: 'tech2', code: '0000' });
    expect(bloque.status).toBe(423);
    const meme = await a.post('/api/auth/connexion').send({ profil: 'technicien', identifiant: 'tech2', code: '1234' });
    expect(meme.status).toBe(423);
  });

  it('code secret oublié et déconnexion', async () => {
    expect((await request(ctx.app).post('/api/auth/code-oublie')).body.message).toMatch(/Responsable/);
    const a = await connecter(ctx.app, 'responsable', 'responsable');
    await a.post('/api/auth/deconnexion');
    expect((await a.get('/api/auth/moi')).body.utilisateur).toBeNull();
  });
});
