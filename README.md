# VéloSf – application de location de vélos en libre-service

Projet : **VéloSf**, système de location de vélos de la société **CycloSfaxcity** (région de Sfax).
Contexte : module MCO, ISET Sfax, DSI 33. Interface et documentation en **français**.

Pile retenue : **TypeScript** partout, **React + Vite** (`client/`), **Node.js + Express** (`server/`), **SQLite** via `better-sqlite3` à partir de `database/schema.sql`, sessions par cookie + `bcryptjs`, validation **Zod**, tests **Vitest + Supertest**. Carte **schématique** (SVG, sans dépendance réseau).

---

## 1. Lancer l'application

Prérequis : Node.js 20 ou plus récent (testé avec Node 24), npm 10 ou plus récent.

```bash
npm install          # installe server/ et client/ (workspaces npm)
npm run seed         # (ré)initialise database/velosf.db avec le jeu de démonstration
npm run dev          # API sur http://localhost:3001, interface sur http://localhost:5173
```

Ouvrir **http://localhost:5173**. La base est créée automatiquement au premier lancement si elle n'existe pas ; `npm run seed` la remet à zéro.

> npm 11 peut bloquer les scripts d'installation (`npm warn install-scripts`). Si `better-sqlite3` ne se charge pas, lancer `npm install-scripts approve better-sqlite3 esbuild` puis `npm rebuild`.

Autres commandes :

| Commande | Effet |
|---|---|
| `npm test` | 38 tests automatiques de l'API, un fichier par cas d'utilisation (`server/test/cu01…cu12`) |
| `npm run typecheck` | vérification TypeScript du serveur et du client |
| `npm run build` puis `npm start -w server` | interface compilée servie par Express sur http://localhost:3001 |

### Comptes de démonstration (code secret `1234` pour tous)

| Profil | Identifiant | Page d'accueil |
|---|---|---|
| Responsable | `responsable` | Stations (écran 02) |
| Technicien | `tech1` (a une mission en attente), `tech2` | Contrôle quotidien (écran 20) |
| Abonné | carte `000123`, carte `000124` | Louer un vélo (écran 12) |
| Utilisateur occasionnel | sans compte : lien « Louer sans compte » de l'écran 01 | Mes informations (écran 16) |

Le jeu de données reprend les maquettes : 6 stations, 50 vélos sur 84 places, fournisseurs CycloTun / Vélo Plus / Sport&Bike, réclamations VS-0201, VS-0087, VS-0142 (+ une à Sakiet Eddaïer), itinéraire Sakiet Eddaïer → Thyna → Gare de Sfax envoyé au Technicien 1, 20 locations terminées sur les 7 derniers jours. Toutes les données sont fictives.

---

## 2. Organisation du code

```
client/src/
  App.tsx              routes + contrôle d'accès par profil
  menus.ts             menus par profil (docs/03)
  composants/          Coquille (menu latéral, barre du haut), CarteSchematique, composants communs
  pages/               un fichier par écran ou par parcours (écrans 01 à 23)
server/src/
  config/hypotheses.ts TOUTES les hypothèses H1 à H15 (un seul fichier à modifier)
  routes/              auth (CU12), flotte (CU1-3), maintenance (CU4, CU8), location (CU5-7), redistribution (CU9-11)
  services/paiement.ts paiement simulé (remplaçable par un vrai terminal)
  seed.ts              jeu de démonstration
server/test/           un test par cas d'utilisation
database/schema.sql    schéma utilisé (schema.original.sql = proposition initiale)
docs/08-recette.md     scénarios de recette CU1 à CU12 (automatiques et manuels)
```

Le CSS de référence `design/tokens.css` et `design/app-shell-and-components.css` est importé tel quel ; `client/src/styles/app.css` n'ajoute que les états interactifs, les messages, les dialogues et l'écran de connexion.

**Cohérence des compteurs.** `station.nb_velos` est recalculé à partir des vélos rattachés, dans la même transaction SQL que l'opération qui déplace le vélo (achat, location, restitution, prise, dépôt, collecte). La contrainte `CHECK (nb_velos <= capacite)` refuse tout dépassement. Chaque test qui déplace des vélos vérifie `compteursCoherents()`.

---

## 3. Hypothèses appliquées (docs/06)

Toutes les valeurs sont dans `server/src/config/hypotheses.ts`. La valeur `null` signifie « non défini » : l'interface affiche « — TND » ou « À confirmer » au lieu d'inventer un montant.

| N° | Hypothèse | Mise en œuvre | Constante |
|---|---|---|---|
| H1 | Les stations ont un nom | Champ obligatoire | – |
| H2 | Fournisseur : adresse, téléphone, e-mail | Champs facultatifs, e-mail vérifié s'il est saisi | – |
| H3 | Vélo affecté à une station à l'achat ; types Ville, VTT, Électrique | Station obligatoire, refus si pleine | `TYPES_VELO` |
| H4 | Technicien et Responsable : identifiant + code ; occasionnel sans compte | Session par cookie, code haché bcrypt | – |
| H5 | « Code secret oublié » ; blocage après plusieurs essais | Message « adressez-vous au Responsable » ; blocage après **5** échecs (nombre à décider) | `MAX_ESSAIS_CONNEXION` |
| H6 | Réparation affectée à un technicien et une date | « Technicien occupé » = déjà **1** réparation ce jour-là | `MAX_REPARATIONS_PAR_TECHNICIEN_PAR_JOUR` |
| H7 | Statuts réclamation / états vélo | à planifier → planifiée (vélo « en réparation ») → traitée (vélo « disponible ») | – |
| H8 | Vélo rendu en mauvais état → réclamation | Signalement pendant la location ou à la restitution | `SIGNALEMENT_ABONNE_CREE_RECLAMATION` |
| H9 | Une seule location en cours par abonné | Refus d'une deuxième location | `MAX_LOCATIONS_EN_COURS_ABONNE` |
| H10 | Pièce d'identité : CIN ou passeport | Liste déroulante + numéro | `PIECES_IDENTITE` |
| H11 | Paiement carte bancaire ou espèces, TND ; **tarifs et caution non définis** | Montants `null` → « — TND » ; paiement simulé | `TARIF_HORAIRE_TND`, `CAUTION_TND`, `MODES_PAIEMENT` |
| H12 | Camion attribué dans l'ordre de mission ; capacité | Camion obligatoire ; capacité vérifiée si renseignée (10 dans la démo) ; « même créneau » = même jour | `CAMION_OBLIGATOIRE`, `camion.capacite` |
| H13 | Statuts d'ordre : brouillon, envoyé, en cours, terminé | Brouillon invisible du technicien ; en cours à la 1re étape | – |
| H14 | « Vide » < 20 %, « Pleine » = 100 %, sinon « Équilibrée » | Fonction `statutStation()` | `SEUIL_VIDE`, `SEUIL_PLEINE` |
| H15 | Suppression refusée : station avec vélos, fournisseur lié à des vélos | Message d'erreur explicite | `REFUS_SUPPRESSION_*` |
| CU6 (H) | Station de destination sans place | Refus à la saisie | `REFUS_DESTINATION_PLEINE` |
| CU6 | Bornes de durée saisie | 15 min à 24 h (bornes techniques, à confirmer) | `DUREE_MIN_MIN`, `DUREE_MAX_MIN` |
| CU7 | Dépassement de durée (**règle non définie**) | Retard mesuré et affiché, aucune retenue, « À confirmer » | `REGLE_DEPASSEMENT` |

**Pour fixer les tarifs** : renseigner `TARIF_HORAIRE_TND` (par heure entamée) et `CAUTION_TND`. **Pour une règle de retard** : `REGLE_DEPASSEMENT: { penaliteParHeureTND: 2 }` (retenue sur la caution). Les tests couvrent les deux cas.

---

## 4. Écarts avec les maquettes et le dossier

| Écran / élément | Écart | Raison |
|---|---|---|
| 01 Connexion | Fond clair et cartes blanches au lieu du fond sombre ; encadré « comptes de démonstration » | `docs/03` demande d'aligner l'écran 01 sur les autres ; démo |
| 03 Formulaire station | « Nombre de vélos présents » en lecture seule (calculé) ; clic sur la carte pour placer la station | Un nombre saisi à la main ne correspondrait à aucun vélo réel et casserait la cohérence des compteurs (`docs/04` : « nb_velos peut être calculé ») |
| 04 Détail station | Tuile « État » : Vide / Équilibrée / Pleine (et non « Presque vide ») ; état « Réclamation ouverte » pour un vélo signalé | Libellés de H14 ; vélo sous réclamation non louable |
| 02 Stations | Filtre « Toutes les stations » = disponibilité (avec / sans vélo disponible) ; menu « … » : acheter un vélo, supprimer | Le sens du filtre n'était pas défini |
| 07 Réclamations | Menu « … » : « Marquer la réparation faite » (statut « traitée ») ; colonne Technicien = « Abonné · nom » si signalée par un abonné | H7, H8 : il fallait une façon de clore une réclamation |
| 08 Planification | Navigation semaine précédente / suivante ; clic sur une case du calendrier | Confort |
| 09 Équilibre | Tableau « Mouvements de location · 7 derniers jours » ajouté ; points orange = vélos en panne | CU10 demande de consulter les mouvements |
| 10 Itinéraire | Étapes modifiables (type, station, nombre, ordre), bouton « Proposer », choix d'un itinéraire existant | CU10 scénario alternatif « modifier un itinéraire » |
| 11 Ordre de mission | Camion choisi dans une liste ; liste des ordres ; bouton « Enregistrer en brouillon » | H12, H13, CU11 scénario alternatif |
| 12 Identification abonné | Conservé comme vérification de la carte à la borne (incohérence 6 de `docs/06`) | La location exige carte + code (CU5) |
| CU6 choix du vélo | Écran supplémentaire `/occasionnel/velo` (présentation de l'écran 13) | Le dossier ne maquette pas le choix du vélo de l'occasionnel |
| 22 Ma mission | Saisie du nombre réel, bouton « Étape non réalisable » avec commentaire | CU9 scénario alternatif |
| Barre du haut | Recherche active (stations pour le Responsable, vélos pour le Technicien) ; cloche = réclamations / mission en attente | Rendre les éléments maquettés fonctionnels |

### Ajouts au schéma (`database/schema.sql`, marqués « (ajout) »)

`station.carte_x/carte_y/modifie_le`, `utilisateur.essais_echoues/bloque` (H5), `camion.capacite` (H12), `velo.camion_id`, `reclamation.signale_par/origine` et `technicien_id` facultatif (H8), tables `paiement` et `controle`, `location.depassement_min`, `ordre_mission.commentaire_cloture/date_cloture`, `execution_etape.nb_velos_reel/non_realisable`. Le schéma d'origine est conservé dans `database/schema.original.sql`.

### Règles de fonctionnement choisies (non métier)

- Un vélo collecté en panne va à l'entrepôt à la clôture de la mission (sans station) ; quand sa réclamation est traitée, le Responsable choisit la station où le remettre.
- Les vélos en état de rouler restés dans un camion à la fin d'une mission y restent et peuvent être déposés lors de la mission suivante avec ce camion.
- La suppression d'une station présente dans l'historique (locations, itinéraires) est refusée pour garder l'historique intact.

---

## 5. Questions encore ouvertes (docs/06)

1. Tarifs d'utilisation et montant de la caution (H11) ?
2. Règle en cas de dépassement de durée ou de carte non rendue par l'occasionnel ?
3. Nombre d'essais avant blocage (H5, 5 par défaut) et capacité réelle des camions (H12) ?

---

## 6. Dossier de conception (fourni)

| Dossier / fichier | Rôle |
|---|---|
| `AGENT_PROMPT.md` | Consignes de réalisation |
| `docs/01` à `docs/07` | Contexte, CU1 à CU12, écrans, modèle de données, design system, hypothèses, plan |
| `mockups/` | 23 maquettes HTML (1440×900), référence visuelle |
| `references/` | Images d'inspiration |
| `sprints.md`, `techstack.md` | Backlog et pile technique |
