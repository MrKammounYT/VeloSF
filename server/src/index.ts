import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { baseExiste, creerSchema, ouvrirBase, CHEMIN_BASE } from './db.js';
import { remplirDemo } from './seed.js';
import { creerApp } from './app.js';

const db = ouvrirBase();
if (!baseExiste(db)) {
  creerSchema(db);
  remplirDemo(db);
  console.log(`Base créée avec le jeu de démonstration : ${CHEMIN_BASE}`);
}

const app = creerApp(db);

// En production (npm run build), le serveur sert aussi l'interface compilée.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API VéloSf : http://localhost:${port}/api`));
