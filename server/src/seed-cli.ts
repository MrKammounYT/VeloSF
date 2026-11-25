import { rmSync } from 'node:fs';
import { CHEMIN_BASE, creerSchema, ouvrirBase } from './db.js';
import { CODE_DEMO, remplirDemo } from './seed.js';

// Réinitialise complètement la base de démonstration.
for (const suffixe of ['', '-wal', '-shm']) rmSync(CHEMIN_BASE + suffixe, { force: true });
const db = ouvrirBase();
creerSchema(db);
remplirDemo(db);
db.close();
console.log(`Base réinitialisée : ${CHEMIN_BASE}`);
console.log(`Comptes : responsable / tech1 / tech2 / carte 000123 / carte 000124 – code secret ${CODE_DEMO}`);
