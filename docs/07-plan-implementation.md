# Plan d'implémentation conseillé

Réaliser par étapes, en montrant le résultat à chaque fin d'étape.

1. **Socle** : projet, base de données (`database/schema.sql`), seed cohérent avec les maquettes, composants communs (menu, barre du haut, cartes, tableau avec barre d'outils et pagination) à partir de `design/`.
2. **CU12 – Authentification** (écran 01), sessions, contrôle d'accès par profil et menu par profil.
3. **Responsable – flotte** : CU1 (écrans 02 à 04), CU3 (05), CU2 (06).
4. **Technicien – maintenance** : CU8 (20, 21), puis **Responsable** CU4 (07, 08).
5. **Location abonné** : CU5 (12 à 14), CU7 côté abonné (15). Mise à jour des vélos et des stations à chaque location et restitution.
6. **Location occasionnel** : CU6 (16 à 18), CU7 côté occasionnel (19), calcul des frais et de la caution (tarifs à confirmer).
7. **Redistribution** : CU10 (09, 10), CU11 (11), CU9 (22, 23).
8. **Finitions** : filtres, recherche, export CSV, pagination, états vides et messages d'erreur, tests.

## Critères d'acceptation
- Chaque écran correspond à sa maquette (structure, libellés, style).
- Chaque cas d'utilisation CU1 à CU12 est exécutable de bout en bout, avec ses exceptions décrites dans `02-cas-utilisation.md`.
- Le nombre de vélos d'une station reste cohérent avec les locations, restitutions, achats et missions.
- Un profil n'accède qu'aux écrans de son menu.
- Les hypothèses appliquées sont listées dans le README final.
