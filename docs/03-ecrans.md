# Écrans (23)

Fichiers dans `mockups/html/`. Format : 1440×900, bureau. Aucune version mobile n'est maquettée.
Structure commune (écrans 02 à 23) : menu latéral blanc collé à gauche (logo, sections avec icônes, carte « Vélos en station », compte et déconnexion), barre du haut (fil d'Ariane, recherche, notifications), en-tête de page (titre, sous-titre, date, bouton d'action), contenu. L'écran 01 est autonome.

| N° | Fichier | CU | Profil | Contenu principal | Actions |
|---|---|---|---|---|---|
| 01 | 01-connexion.html | CU12 | Tous sauf occasionnel | Choix du profil, carte et code secret | Se connecter ; lien « Louer sans compte » vers 16 |
| 02 | 02-stations-liste.html | CU1 | Responsable | 4 cartes de chiffres, tableau (nom, adresse, capacité, vélos, occupation, statut) avec recherche, filtres, export CSV, pagination | Nouvelle station, Voir, Modifier |
| 03 | 03-station-formulaire.html | CU1 | Responsable | Formulaire nom, adresse, capacité, vélos présents ; carte | Enregistrer, Annuler |
| 04 | 04-station-detail.html | CU1 | Responsable | Capacité, vélos présents, état, liste des vélos de la station, carte | Modifier, Supprimer |
| 05 | 05-fournisseurs.html | CU3 | Responsable | Tableau des fournisseurs + formulaire d'ajout | Voir, Modifier, Enregistrer |
| 06 | 06-achat-velo.html | CU2 | Responsable | Formulaire (série, fournisseur, type, couleur, station) + derniers achats | Enregistrer l'achat |
| 07 | 07-reclamations.html | CU4 | Responsable | Tableau des réclamations (vélo, diagnostic, technicien, date, statut) | Voir, Planifier, Modifier |
| 08 | 08-planification.html | CU4 | Responsable | Réclamation choisie, date, technicien ; calendrier de la semaine | Planifier |
| 09 | 09-equilibre.html | CU10 | Responsable | Stations pleines, vides, équilibrées ; cartes par station ; liste « À rééquilibrer » | Préparer un itinéraire |
| 10 | 10-itineraire.html | CU10 | Responsable | Étapes ordonnées (prise, dépôt, collecte) + parcours | Enregistrer, Donner un ordre de mission |
| 11 | 11-ordre-mission.html | CU11 | Responsable | Technicien, itinéraire, camion, date, consignes ; aperçu | Envoyer l'ordre, Annuler |
| 12 | 12-abonne-identification.html | CU5 | Abonné | Étape 1/4 : carte et code secret | Continuer |
| 13 | 13-abonne-velos.html | CU5 | Abonné | Étape 2/4 : station de départ, liste des vélos disponibles | Choisir, Signaler un vélo défectueux |
| 14 | 14-abonne-confirmation.html | CU5 | Abonné | Étape 3/4 : récapitulatif de la location | Restituer le vélo |
| 15 | 15-abonne-restitution.html | CU7 | Abonné | Étape 4/4 : stations avec places libres, état du vélo | Choisir, Valider la restitution |
| 16 | 16-occ-informations.html | CU6 | Occasionnel | Étape 1/4 : identité, station de destination, durée | Continuer |
| 17 | 17-occ-paiement.html | CU6 | Occasionnel | Étape 2/4 : frais, caution, total, mode de paiement | Payer |
| 18 | 18-occ-carte.html | CU6 | Occasionnel | Étape 3/4 : carte courte durée délivrée | Choisir un vélo |
| 19 | 19-occ-restitution.html | CU7 | Occasionnel | Étape 4/4 : n° de carte, station d'arrivée, remboursement | Valider le retour |
| 20 | 20-tech-controle.html | CU8 | Technicien | Liste des vélos à contrôler (OK / Signaler), progression | Signaler, Terminer le contrôle |
| 21 | 21-tech-reclamation.html | CU8 | Technicien | Vélo, date, technicien, diagnostic | Envoyer, Annuler |
| 22 | 22-tech-mission.html | CU9 | Technicien | Étapes de la mission + parcours | Marquer l'étape faite |
| 23 | 23-tech-fin-mission.html | CU9 | Technicien | Vélos déplacés, collectés, étapes ; commentaire | Terminer la mission |

## Menus par profil
- **Responsable** : Flotte (Stations, Fournisseurs, Achat de vélos) ; Maintenance (Réclamations, Planification) ; Répartition (Équilibre des stations, Itinéraires, Ordres de mission).
- **Technicien** : Maintenance (Contrôle quotidien, Réclamation) ; Répartition (Ma mission, Fin de mission).
- **Abonné** : Location (Identification, Choisir un vélo, Confirmation) ; Retour (Restitution).
- **Utilisateur occasionnel** : Location (Mes informations, Paiement, Carte délivrée) ; Retour (Restitution).

## Points de fidélité
- Les montants sont à « — TND » : le tarif n'est pas défini (voir 06).
- Badges du menu (Stations 6, Réclamations 4) et carte « Vélos en station 50 / 84 » : à calculer depuis la base.
- Les écrans 08, 10 et 22 contiennent une carte factice : la remplacer par une vraie carte (au choix de l'équipe) ou la garder schématique.
- L'écran 01 garde l'ancien style (fond sombre) : à aligner sur le style des autres écrans.
