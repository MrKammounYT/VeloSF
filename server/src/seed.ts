import bcrypt from 'bcryptjs';
import type { DB } from './db.js';
import { recalculerStation } from './db.js';
import { ajouterJours, horodatageISO, jourISO, lundiDe, maintenant } from './horloge.js';

/** Code secret de tous les comptes de démonstration. */
export const CODE_DEMO = '1234';

/**
 * Jeu de données de démonstration, cohérent avec les maquettes (6 stations, 50 vélos sur 84 places,
 * 3 fournisseurs, réclamations VS-0201 / VS-0087 / VS-0142, itinéraire Sakiet Eddaïer → Thyna → Gare).
 * Toutes les données sont fictives.
 */
export function remplirDemo(db: DB) {
  const hash = bcrypt.hashSync(CODE_DEMO, 8);
  const auj = jourISO();
  const maintenantTs = horodatageISO();

  const tx = db.transaction(() => {
    // --- Utilisateurs (H4)
    const u = db.prepare(
      'INSERT INTO utilisateur (profil, identifiant, code_secret_hash, nom, prenom) VALUES (?,?,?,?,?)',
    );
    const resp = u.run('responsable', 'responsable', hash, 'Responsable', 'Parc').lastInsertRowid as number;
    const tech1 = u.run('technicien', 'tech1', hash, 'Technicien 1', '').lastInsertRowid as number;
    const tech2 = u.run('technicien', 'tech2', hash, 'Technicien 2', '').lastInsertRowid as number;
    const abo1 = u.run('abonne', '000123', hash, 'Ben Salah', 'Amira').lastInsertRowid as number;
    u.run('abonne', '000124', hash, 'Trabelsi', 'Karim');

    // --- Stations (H1) : [nom, adresse, capacité, vélos, x, y]
    const stations: [string, string, number, number, number, number][] = [
      ['Sfax Centre', 'Av. Habib Bourguiba', 20, 17, 52, 56],
      ['Gare de Sfax', 'Place de la Gare', 16, 3, 63, 66],
      ['Sakiet Ezzit', 'Route de Tunis', 12, 9, 38, 22],
      ['Sakiet Eddaïer', 'Route de Gremda', 12, 12, 72, 24],
      ['Thyna', 'Route de Mahdia', 10, 1, 30, 84],
      ['Médina', 'Bab Diwan', 14, 8, 44, 46],
    ];
    const s = db.prepare(
      'INSERT INTO station (nom, adresse, capacite, nb_velos, carte_x, carte_y, modifie_le) VALUES (?,?,?,0,?,?,?)',
    );
    const idsStation = stations.map(
      ([nom, adr, cap, , x, y], i) =>
        s.run(nom, adr, cap, x, y, horodatageISO(new Date(maintenant().getTime() - i * 86_400_000))).lastInsertRowid as number,
    );
    const [sfaxCentre, gare, , eddaier] = idsStation;

    // --- Fournisseurs (H2)
    const f = db.prepare('INSERT INTO fournisseur (nom, adresse, telephone, email) VALUES (?,?,?,?)');
    const cyclotun = f.run('CycloTun', 'Zone industrielle Poudrière, Sfax', '74 000 000', 'contact@cyclotun.example').lastInsertRowid as number;
    const veloplus = f.run('Vélo Plus', 'Route de Tunis km 4, Sfax', '74 111 111', 'info@veloplus.example').lastInsertRowid as number;
    const sportbike = f.run('Sport&Bike', 'Rue Habib Thameur, Sfax', '74 222 222', 'vente@sportbike.example').lastInsertRowid as number;

    // --- Camions (H12) – capacités d'exemple
    const c = db.prepare('INSERT INTO camion (nom, capacite) VALUES (?,?)');
    const camion1 = c.run('Camion 1', 10).lastInsertRowid as number;
    c.run('Camion 2', 10);

    // --- Vélos : 50 vélos répartis selon les maquettes ; 24 CycloTun, 16 Vélo Plus, 10 Sport&Bike
    const v = db.prepare(
      'INSERT INTO velo (numero_serie, couleur, type, fournisseur_id, station_id, etat, date_achat) VALUES (?,?,?,?,?,?,?)',
    );
    const couleurs = ['Bleu', 'Rouge', 'Vert', 'Noir', 'Blanc', 'Gris'];
    const types = ['Ville', 'Ville', 'VTT', 'Ville', 'Électrique'];
    const idVelo: Record<string, number> = {};
    // Vélos nommés dans les maquettes
    const nommes: [string, string, string, number, number][] = [
      ['VS-0142', 'Bleu', 'Ville', cyclotun, gare],
      ['VS-0087', 'Rouge', 'VTT', veloplus, gare],
      ['VS-0201', 'Vert', 'Ville', sportbike, gare],
      ['VS-0150', 'Noir', 'Ville', cyclotun, sfaxCentre],
    ];
    for (const [serie, coul, type, fourn, st] of nommes) {
      idVelo[serie] = v.run(serie, coul, type, fourn, st, 'disponible', ajouterJours(auj, -200)).lastInsertRowid as number;
    }
    // Places restantes par station
    const restant = stations.map(([, , , n], i) => n - nommes.filter((x) => x[4] === idsStation[i]).length);
    const fournisseurs = [
      ...Array(20).fill(cyclotun),
      ...Array(14).fill(veloplus),
      ...Array(9).fill(sportbike),
      cyclotun, veloplus, cyclotun, // VS-0298, VS-0299, VS-0300 : « Derniers achats » de l'écran 06
    ];
    let k = 0;
    for (let i = 0; i < stations.length; i++) {
      for (let j = 0; j < restant[i]; j++) {
        const num = 255 + k; // VS-0255 … VS-0300
        const serie = `VS-0${num}`;
        const fourn = fournisseurs[k];
        let type = types[k % types.length];
        if (serie === 'VS-0300' || serie === 'VS-0298') type = 'Ville';
        if (serie === 'VS-0299') type = 'VTT';
        idVelo[serie] = v.run(
          serie, couleurs[k % couleurs.length], type, fourn, idsStation[i], 'disponible', ajouterJours(auj, -(60 - k)),
        ).lastInsertRowid as number;
        k++;
      }
    }
    idsStation.forEach((id) => recalculerStation(db, id));

    // --- Réclamations (CU8) et réparation planifiée (CU4)
    const r = db.prepare(
      'INSERT INTO reclamation (velo_id, technicien_id, diagnostic, date_reclamation, statut) VALUES (?,?,?,?,?)',
    );
    r.run(idVelo['VS-0201'], tech1, 'Chaîne cassée', ajouterJours(auj, -1), 'a_planifier');
    r.run(idVelo['VS-0087'], tech2, 'Frein avant usé', ajouterJours(auj, -1), 'a_planifier');
    const recl142 = r.run(idVelo['VS-0142'], tech1, 'Pneu crevé', ajouterJours(auj, -2), 'planifiee').lastInsertRowid;
    const veloEddaier = (db.prepare('SELECT id FROM velo WHERE station_id = ? ORDER BY id LIMIT 1').get(eddaier) as { id: number }).id;
    r.run(veloEddaier, tech2, 'Garde-boue cassé', ajouterJours(auj, -3), 'a_planifier');
    db.prepare('INSERT INTO reparation (reclamation_id, date_prevue, technicien_id) VALUES (?,?,?)').run(
      recl142, ajouterJours(lundiDe(auj), 1), tech1,
    );
    db.prepare("UPDATE velo SET etat = 'en_reparation' WHERE id = ?").run(idVelo['VS-0142']);

    // --- Mouvements de location des 7 derniers jours (locations terminées, CU10)
    const flux: [number, number][] = [
      [0, 3], [0, 3], [0, 3], [1, 0], [1, 3], [4, 3], [4, 0], [0, 2], [5, 3], [1, 2],
      [2, 3], [4, 5], [0, 3], [1, 0], [5, 0], [4, 3], [2, 0], [1, 3], [0, 5], [4, 2],
    ];
    const l = db.prepare(
      `INSERT INTO location (velo_id, abonne_id, station_depart_id, station_destination_id, station_arrivee_id,
        debut, duree_prevue_min, fin, statut) VALUES (?,?,?,?,?,?,?,?, 'terminee')`,
    );
    const velosArrivee = (st: number) => (db.prepare('SELECT id FROM velo WHERE station_id = ?').all(st) as { id: number }[]);
    flux.forEach(([dep, arr], i) => {
      const velos = velosArrivee(idsStation[arr]);
      const velo = velos[i % velos.length].id;
      const debut = new Date(maintenant().getTime() - (i % 7 + 1) * 86_400_000 - 3_600_000 * (i % 5));
      const fin = new Date(debut.getTime() + 25 * 60_000);
      l.run(velo, abo1, idsStation[dep], idsStation[arr], idsStation[arr], horodatageISO(debut), null, horodatageISO(fin));
    });

    // --- Itinéraire et ordre de mission envoyé au Technicien 1 (CU10, CU11)
    const it = db.prepare('INSERT INTO itineraire (cree_par, date_creation) VALUES (?,?)').run(resp, maintenantTs).lastInsertRowid;
    const e = db.prepare('INSERT INTO etape_itineraire (itineraire_id, ordre, station_id, type, nb_velos) VALUES (?,?,?,?,?)');
    e.run(it, 1, eddaier, 'prise', 5);
    e.run(it, 2, idsStation[4], 'depot', 3);
    e.run(it, 3, gare, 'depot', 2);
    e.run(it, 4, eddaier, 'collecte', 1);
    db.prepare(
      `INSERT INTO ordre_mission (itineraire_id, technicien_id, camion_id, date_heure, consignes, statut)
       VALUES (?,?,?,?,?, 'envoye')`,
    ).run(it, tech1, camion1, `${auj}T08:30:00`, 'Commencer par Sakiet Eddaïer. Vérifier les freins des vélos déposés.');
  });
  tx();
}
