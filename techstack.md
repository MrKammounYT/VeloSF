# VéloSf – Pile technique (proposition à discuter)

Projet : VéloSf (CycloSfaxcity, région de Sfax) – module MCO, ISET Sfax, DSI 33.

> **Statut : brouillon.** Le cas d'étude n'impose aucune technologie. Tout ce qui suit est une recommandation, pas une règle du projet. La décision finale dépend des compétences de l'équipe et des consignes de l'enseignant (voir « Questions à trancher »).

## 1. Ce que la pile doit supporter

Ces contraintes viennent du dossier de projet, pas de préférences techniques.

| Contrainte | Source | Conséquence |
|---|---|---|
| 4 profils (Responsable, Abonné, Technicien, Occasionnel), les trois premiers avec connexion | CU12, H4 | Authentification par session, code secret haché, contrôle d'accès par profil |
| 23 écrans, maquettes HTML 1440×900 avec CSS déjà écrit (`design/`) | `docs/03`, `docs/05` | Réutiliser le CSS existant, éviter un framework de style qui le remplace |
| Modèle relationnel avec contraintes (numéro de série unique, `nb_velos <= capacite`, états énumérés) | `database/schema.sql` | Base SQL qui applique les `CHECK` et les `UNIQUE` |
| Cohérence des compteurs de vélos entre locations, restitutions, achats et missions | `docs/07` (critères d'acceptation) | Transactions SQL sur les opérations qui modifient plusieurs tables |
| Règles non définies (tarifs, caution, dépassement de durée, seuils H14) | `docs/06` | Paramètres isolés dans un fichier de configuration, faciles à changer |
| 4 sprints de 2 semaines, environ 30 points chacun | `sprints.md` | Pile simple, peu d'outils à apprendre en cours de route |

## 2. Recommandation

| Couche | Choix | Pourquoi |
|---|---|---|
| Langage | **TypeScript** partout (front et back) | Un seul langage pour toute l'équipe ; les types évitent beaucoup d'erreurs sur les données (états, statuts, profils) |
| Front | **React + Vite** | Démarrage rapide ; les 23 écrans se découpent en composants communs (menu, barre du haut, tableau avec pagination, pastilles d'état) |
| Style | **CSS existant** de `design/` (`tokens.css`, `app-shell-and-components.css`) | Les maquettes sont déjà stylées ; pas de second système de style à maintenir |
| Back | **Node.js + Express** | Simple, très documenté, suffisant pour une API REST de cette taille |
| Base de données | **SQLite** pour le développement et la démonstration | Aucun serveur à installer ; `schema.sql` est déjà écrit pour SQLite et PostgreSQL |
| Accès aux données | **SQL direct avec `better-sqlite3`** à partir de `schema.sql` | Voir la remarque ci-dessous sur Prisma |
| Authentification | **Session par cookie** (`express-session`) + **bcrypt** pour le code secret | Suffisant pour 3 profils ; pas besoin de JWT |
| Validation | **Zod** (partagé entre front et back) | Les erreurs prévues dans les exceptions des CU (champ manquant, capacité dépassée, série déjà utilisée) sont validées au même endroit |
| Tests | **Vitest** (API et règles métier) ; scénarios manuels documentés pour les écrans | Un test par cas d'utilisation CU1 à CU12 est demandé par `AGENT_PROMPT.md` |
| Export CSV, pagination, filtres | Fonctions maison côté API | Pas de bibliothèque nécessaire |

### Remarque sur Prisma
`AGENT_PROMPT.md` propose « SQLite via Prisma (ou SQL brut) ». Je recommande le SQL brut, car `schema.sql` contient des contraintes `CHECK` (états du vélo, `nb_velos <= capacite`) que Prisma ne sait pas exprimer dans son schéma. Avec Prisma, il faudrait les redéfinir à la main dans des migrations, ou perdre cette protection. C'est un choix de commodité : si l'équipe connaît déjà Prisma, il reste utilisable.

### Structure proposée
```
velosf/
  client/    React + Vite (écrans 01 à 23, CSS de design/)
  server/    Express (routes par cas d'utilisation, services métier, config des hypothèses)
  database/  schema.sql, seed.sql
```

### Hypothèses de règles métier
Les 15 hypothèses H1 à H15 (`docs/06`) sont codées dans un seul fichier de configuration côté serveur (seuils de statut H14, nombre d'essais de connexion H5, tarifs et caution H11). Les tarifs et la caution restent vides tant que l'équipe ne les a pas fournis.

## 3. Alternatives possibles

| Option | Avantage | Inconvénient |
|---|---|---|
| **PHP + Laravel + MySQL** | Souvent connu en formation ; authentification, validation et migrations intégrées | Il faut réécrire les maquettes en vues Blade ; deux langages si le front est interactif |
| **Java + Spring Boot + PostgreSQL** | Robuste ; adapté si le cours est orienté Java | Plus lourd à démarrer ; plus de code pour les 4 sprints |
| **Angular + Node/Express** | Structuré, adapté aux gros formulaires | Courbe d'apprentissage plus raide que React pour une petite équipe |
| **Python + Django + PostgreSQL** | Administration générée automatiquement | Les 23 écrans sur mesure demandent quand même un front dédié |

Aucune de ces options n'est meilleure en soi : le critère décisif est ce que l'équipe maîtrise déjà.

## 4. Risques

- **Compétences :** une pile que personne ne connaît fait perdre un sprint entier. C'est le risque principal.
- **SQLite en production :** adapté à la démonstration, pas à plusieurs utilisateurs simultanés. Si le projet doit être déployé, passer à PostgreSQL (le schéma est déjà compatible).
- **Cohérence des compteurs :** locations, restitutions et missions modifient `nb_velos` ; toutes ces opérations doivent passer par des transactions, sinon les stations affichent des valeurs fausses.
- **Carte :** les écrans 03, 04, 10 et 22 montrent une carte. Une carte réelle (Leaflet + OpenStreetMap) ajoute du travail et une dépendance réseau.

## 5. Questions à trancher

1. Quelle pile le cours ou l'enseignant impose-t-il, ou recommande-t-il ? Quelles technologies l'équipe connaît-elle déjà ?
2. Le projet est-il seulement démontré en local, ou doit-il être déployé en ligne ?
3. La carte des écrans 03, 04, 10 et 22 doit-elle être réelle (Leaflet) ou schématique ?
4. Faut-il livrer le code de l'application, ou seulement la conception (documents et maquettes) ? Cela décide si cette pile est nécessaire.

## 6. Décision

| Date | Décision | Décidé par |
|---|---|---|
| | À remplir par l'équipe | |
