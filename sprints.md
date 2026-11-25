# VéloSf – Backlog produit, découpage en sprints et backlog de sprint

Projet : VéloSf (CycloSfaxcity, région de Sfax) – module MCO, ISET Sfax, DSI 33.

## 0. Hypothèses de planification (à valider par l'équipe)

Le cas d'étude ne fixe ni durée de sprint, ni taille d'équipe, ni charge. Ce qui suit est une proposition :

- 4 sprints de **2 semaines** chacun ;
- vélocité cible d'environ **30 points** par sprint (estimation relative en points d'effort) ;
- priorités selon MoSCoW : **M** = Must (indispensable), **S** = Should (important), **C** = Could (si le temps le permet) ;
- estimations des tickets en **heures** (indicatives) ;
- les cas d'utilisation CU1 à CU12 et les écrans 01 à 23 sont ceux du dossier de projet (`docs/02-cas-utilisation.md` et `docs/03-ecrans.md`) ;
- **(H)** désigne une hypothèse listée dans `docs/06-hypotheses-et-incoherences.md`.

---

## 1. Backlog produit

| ID | User story | Acteur | CU | Écrans | Priorité | Points | Sprint |
|---|---|---|---|---|---|---|---|
| US01 | En tant qu'utilisateur (Responsable, Abonné, Technicien), je veux m'authentifier afin d'accéder à mon espace. | Responsable, Abonné, Technicien | CU12 | 01 | M | 5 | 1 |
| US02 | En tant qu'équipe, je veux un socle technique, une base de données et un jeu de données de démonstration afin de développer les fonctionnalités. | Équipe | – | – | M | 5 | 1 |
| US03 | En tant qu'utilisateur, je veux un menu et des accès adaptés à mon profil afin de ne voir que ce qui me concerne. | Tous | CU12 | 02 à 23 | M | 3 | 1 |
| US04 | En tant que Responsable, je veux consulter la liste des stations afin de connaître leur capacité et leur occupation. | Responsable | CU1 | 02 | M | 3 | 1 |
| US05 | En tant que Responsable, je veux créer et modifier une station afin de tenir à jour le réseau. | Responsable | CU1 | 03 | M | 3 | 1 |
| US06 | En tant que Responsable, je veux consulter le détail d'une station et la supprimer. | Responsable | CU1 | 04 | S | 3 | 1 |
| US07 | En tant que Responsable, je veux gérer les fournisseurs afin d'enregistrer leurs coordonnées. | Responsable | CU3 | 05 | M | 5 | 1 |
| US08 | En tant que Responsable, je veux acheter un vélo (couleur, type, numéro de série, fournisseur) afin de l'ajouter au parc. | Responsable | CU2 | 06 | M | 5 | 1 |
| US09 | En tant que Technicien, je veux faire le contrôle quotidien des vélos afin de repérer les anomalies. | Technicien | CU8 | 20 | M | 5 | 2 |
| US10 | En tant que Technicien, je veux enregistrer une réclamation (vélo, diagnostic, technicien, date). | Technicien | CU8 | 21 | M | 3 | 2 |
| US11 | En tant que Responsable, je veux consulter les réclamations afin de décider des réparations. | Responsable | CU4 | 07 | M | 3 | 2 |
| US12 | En tant que Responsable, je veux planifier une réparation afin de remettre le vélo en service. | Responsable | CU4 | 08 | M | 5 | 2 |
| US13 | En tant qu'Abonné, je veux louer un vélo avec ma carte et mon code secret afin de me déplacer. | Abonné | CU5 | 12, 13, 14 | M | 8 | 2 |
| US14 | En tant qu'Abonné, je veux signaler un vélo défectueux et en prendre un autre. | Abonné | CU5 | 13 | S | 3 | 2 |
| US15 | En tant qu'Abonné, je veux restituer le vélo dans une station proche de ma destination. | Abonné | CU7 | 15 | M | 5 | 2 |
| US16 | En tant qu'Utilisateur occasionnel, je veux donner mon identité, ma station de destination et la durée. | Occasionnel | CU6 | 16 | M | 3 | 3 |
| US17 | En tant qu'Utilisateur occasionnel, je veux voir et payer les frais d'utilisation et la caution. | Occasionnel | CU6 | 17 | M | 5 | 3 |
| US18 | En tant qu'Utilisateur occasionnel, je veux recevoir une carte courte durée et prendre un vélo. | Occasionnel | CU6 | 18 | M | 3 | 3 |
| US19 | En tant qu'Utilisateur occasionnel, je veux rendre le vélo et la carte afin de récupérer ma caution. | Occasionnel | CU7 | 19 | M | 5 | 3 |
| US20 | En tant que Responsable, je veux que le dépassement de durée soit géré (règle à définir). | Responsable, Occasionnel | CU7 | 19 | C | 3 | 3 |
| US21 | En tant que Responsable, je veux voir l'équilibre des stations et les mouvements de location. | Responsable | CU10 | 09 | M | 5 | 3 |
| US22 | En tant que Responsable, je veux préparer un itinéraire de redistribution. | Responsable | CU10 | 10 | M | 5 | 4 |
| US23 | En tant que Responsable, je veux donner un ordre de mission à un technicien. | Responsable | CU11 | 11 | M | 5 | 4 |
| US24 | En tant que Technicien, je veux consulter ma mission. | Technicien | CU9 | 22 | M | 3 | 4 |
| US25 | En tant que Technicien, je veux exécuter les étapes (prendre, déposer, collecter les vélos en panne). | Technicien | CU9 | 22 | M | 5 | 4 |
| US26 | En tant que Technicien, je veux clôturer ma mission avec un récapitulatif. | Technicien | CU9 | 23 | M | 3 | 4 |
| US27 | En tant qu'utilisateur, je veux rechercher, filtrer, paginer et exporter les tableaux. | Responsable, Technicien | – | 02, 05, 07, 13, 20 | S | 3 | 4 |
| US28 | En tant qu'équipe, je veux tester CU1 à CU12 et corriger les anomalies. | Équipe | CU1 à CU12 | tous | M | 5 | 4 |
| US29 | En tant qu'équipe, je veux une documentation et des instructions de lancement. | Équipe | – | – | S | 2 | 4 |

Total : **119 points**.

---

## 2. Découpage en sprints

| Sprint | Objectif | User stories | Points | Cas d'utilisation | Livrable |
|---|---|---|---|---|---|
| **Sprint 1** | Socle, authentification et gestion du parc | US01 à US08 | 32 | CU12, CU1, CU2, CU3 | Le Responsable se connecte, gère stations et fournisseurs, enregistre des achats de vélos |
| **Sprint 2** | Maintenance et location par abonnement | US09 à US15 | 32 | CU8, CU4, CU5, CU7 (abonné) | Un abonné loue et restitue un vélo ; les techniciens signalent les pannes ; le Responsable planifie les réparations |
| **Sprint 3** | Location occasionnelle et suivi de l'équilibre | US16 à US21 | 24 | CU6, CU7 (occasionnel), CU10 (tableau de bord) | Parcours complet de l'occasionnel avec paiement et remboursement ; tableau d'équilibre des stations |
| **Sprint 4** | Redistribution, finitions et recette | US22 à US29 | 31 | CU10, CU11, CU9 + qualité | Itinéraires, ordres de mission, exécution des missions ; recette complète et documentation |

### Dépendances principales
- US13 dépend de US04 et US08 (il faut des stations et des vélos).
- US15 dépend de US13.
- US19 dépend de US17 et US18 ; US20 dépend d'une décision de l'équipe sur la règle de retard.
- US21 dépend de US13 et US15 (mouvements de location).
- US22 dépend de US21 ; US23 de US22 ; US24 à US26 de US23.
- US12 dépend de US10 et US11.

### Risques et décisions à prendre avant le sprint concerné
- **Avant le sprint 3** : tarifs d'utilisation et montant de la caution (aujourd'hui « — TND »), règle de dépassement de durée.
- **Avant le sprint 1** : pile technique de l'équipe.
- Sprints 1, 2 et 4 dépassent légèrement 30 points : déplacer US06, US14 ou US27 (priorité S) si le sprint est trop chargé.

---

## 3. Backlog de sprint

Statut initial de tous les tickets : **À faire**. Types : Back (serveur), Front (interface), BD (base de données), Test, Doc, Analyse. Responsable : à affecter par l'équipe.

### Définition de « terminé » (commune)
- Le code est relu et fusionné.
- L'écran correspond à sa maquette (`mockups/html/`).
- Les scénarios nominal, alternatifs et exceptions du cas d'utilisation sont testés.
- Les hypothèses appliquées sont signalées.

### Sprint 1 – Socle, authentification et gestion du parc (32 points)

| Ticket | US | Titre | Type | Estimation (h) |
|---|---|---|---|---|
| T01 | US02 | Initialiser le projet et sa structure | Back | 4 |
| T02 | US02 | Créer la base de données à partir de `database/schema.sql` | BD | 4 |
| T03 | US02 | Créer le jeu de données de démonstration | BD | 4 |
| T04 | US02 | Intégrer les composants communs (menu, barre du haut, cartes, tableau) | Front | 8 |
| T05 | US01 | API d'authentification (code secret haché, session) | Back | 6 |
| T06 | US01 | Écran 01 : connexion avec choix du profil | Front | 6 |
| T07 | US01 | Messages d'erreur (code incorrect, compte inconnu) | Front | 2 |
| T08 | US01 | Tests du CU12 | Test | 3 |
| T09 | US03 | Contrôle d'accès par profil | Back | 4 |
| T10 | US03 | Menu par profil (icônes et sections) | Front | 4 |
| T11 | US04 | API liste des stations (occupation, statut) | Back | 4 |
| T12 | US04 | Écran 02 : liste des stations | Front | 6 |
| T13 | US05 | API création et modification de station (validations) | Back | 4 |
| T14 | US05 | Écran 03 : formulaire de station | Front | 5 |
| T15 | US06 | API détail et suppression de station (refus si vélos présents, H15) | Back | 3 |
| T16 | US06 | Écran 04 : détail d'une station | Front | 5 |
| T17 | US07 | API fournisseurs | Back | 4 |
| T18 | US07 | Écran 05 : fournisseurs | Front | 6 |
| T19 | US07 | Tests du CU3 | Test | 2 |
| T20 | US08 | API achat de vélo (numéro de série unique) | Back | 4 |
| T21 | US08 | Écran 06 : achat d'un vélo | Front | 5 |
| T22 | US08 | Tests des CU1 et CU2 | Test | 3 |

### Sprint 2 – Maintenance et location par abonnement (32 points)

| Ticket | US | Titre | Type | Estimation (h) |
|---|---|---|---|---|
| T23 | US09 | API liste des vélos à contrôler et enregistrement du résultat | Back | 4 |
| T24 | US09 | Écran 20 : contrôle quotidien | Front | 6 |
| T25 | US10 | API réclamation (technicien et date renseignés automatiquement) | Back | 3 |
| T26 | US10 | Écran 21 : réclamation | Front | 4 |
| T27 | US11 | API liste des réclamations et statuts | Back | 3 |
| T28 | US11 | Écran 07 : réclamations | Front | 6 |
| T29 | US12 | API planification (date, technicien (H), vélo en réparation) | Back | 5 |
| T30 | US12 | Écran 08 : planification avec calendrier | Front | 8 |
| T31 | US12 | Tests des CU4 et CU8 | Test | 3 |
| T32 | US13 | API location abonné (carte, vélo disponible, mise à jour de la station) | Back | 8 |
| T33 | US13 | Écrans 12 et 13 : identification et choix du vélo | Front | 8 |
| T34 | US13 | Écran 14 : confirmation de la location | Front | 3 |
| T35 | US13 | Tests du CU5 | Test | 4 |
| T36 | US14 | API échange d'un vélo défectueux et réclamation associée (H8) | Back | 4 |
| T37 | US14 | Bouton et dialogue « Signaler un vélo défectueux » | Front | 3 |
| T38 | US15 | API restitution abonné (stations avec places libres) | Back | 6 |
| T39 | US15 | Écran 15 : restitution | Front | 5 |
| T40 | US15 | Tests du CU7 côté abonné | Test | 3 |

### Sprint 3 – Location occasionnelle et suivi de l'équilibre (24 points)

| Ticket | US | Titre | Type | Estimation (h) |
|---|---|---|---|---|
| T41 | US16 | Écran 16 : informations de l'utilisateur occasionnel | Front | 4 |
| T42 | US16 | API enregistrement de l'utilisateur occasionnel | Back | 3 |
| T43 | US17 | Service de calcul des frais et de la caution (tarifs configurables) | Back | 5 |
| T44 | US17 | Écran 17 : paiement | Front | 5 |
| T45 | US17 | Gestion du paiement refusé | Back | 3 |
| T46 | US18 | API carte courte durée | Back | 4 |
| T47 | US18 | Écran 18 : carte délivrée | Front | 4 |
| T48 | US18 | Sélection du vélo avec la carte courte durée | Back | 4 |
| T49 | US19 | API restitution occasionnel (carte et vélo, remboursement de la caution) | Back | 6 |
| T50 | US19 | Écran 19 : restitution et remboursement | Front | 5 |
| T51 | US19 | Tests des CU6 et CU7 côté occasionnel | Test | 4 |
| T52 | US20 | Définir avec l'équipe la règle de dépassement de durée | Analyse | 2 |
| T53 | US20 | Implémenter la règle retenue | Back | 4 |
| T54 | US21 | API équilibre des stations (statuts selon H14, mouvements de location) | Back | 5 |
| T55 | US21 | Écran 09 : équilibre des stations | Front | 6 |
| T56 | US21 | Tests de l'équilibre des stations | Test | 2 |

### Sprint 4 – Redistribution, finitions et recette (31 points)

| Ticket | US | Titre | Type | Estimation (h) |
|---|---|---|---|---|
| T57 | US22 | API itinéraire et étapes | Back | 6 |
| T58 | US22 | Écran 10 : préparation d'itinéraire | Front | 8 |
| T59 | US23 | API ordre de mission (technicien, camion (H12), date, consignes) | Back | 5 |
| T60 | US23 | Écran 11 : ordre de mission | Front | 5 |
| T61 | US24 | API et écran 22 : ma mission | Back + Front | 6 |
| T62 | US25 | API exécution des étapes (déplacement des vélos entre stations et camion) | Back | 8 |
| T63 | US25 | Action « Marquer l'étape faite » | Front | 3 |
| T64 | US26 | API clôture de mission et récapitulatif | Back | 4 |
| T65 | US26 | Écran 23 : fin de mission | Front | 4 |
| T66 | US27 | Recherche, filtres et tri des tableaux | Back + Front | 6 |
| T67 | US27 | Export CSV | Back | 3 |
| T68 | US27 | Pagination | Front | 3 |
| T69 | US28 | Scénarios de recette des CU1 à CU12 | Test | 8 |
| T70 | US28 | Correction des anomalies | Back + Front | 8 |
| T71 | US29 | README, jeu de données et instructions de lancement | Doc | 4 |


### Lecture du diagramme
- **Utilisateur** est abstraite et se spécialise en **Responsable**, **Abonné** et **Technicien**. L'**Utilisateur occasionnel** n'a pas de compte : il est une classe à part.
- Une **Location** concerne un seul **Vélo** et soit un Abonné, soit un Utilisateur occasionnel (avec une **Carte temporaire**). Elle référence trois stations : départ, destination et arrivée.
- Une **Réclamation** (déposée par un Technicien sur un Vélo) peut donner lieu à une **Réparation** planifiée par le Responsable.
- Un **Itinéraire** est composé d'**Étapes** ordonnées. Un **Ordre de mission** relie un itinéraire, un technicien et un camion (H12) ; son avancement est suivi par des **Exécutions d'étape**.
- Les attributs et statuts marqués comme hypothèses sont listés dans `docs/06-hypotheses-et-incoherences.md`.
