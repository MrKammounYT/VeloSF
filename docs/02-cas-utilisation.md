# Cas d'utilisation (CU1 à CU12)

Numérotation unique. CU10 et CU11 sont séparés (ils étaient fusionnés dans l'ancien UC8). CU12 « S'authentifier » est ajouté car plusieurs cas exigent une authentification.
Les points marqués **(H)** sont des hypothèses, voir `06-hypotheses-et-incoherences.md`.

## Liste

| N° | Cas d'utilisation | Acteur principal | Écrans |
|---|---|---|---|
| CU1 | Gérer les stations | Responsable | 02, 03, 04 |
| CU2 | Acheter un vélo | Responsable | 06 |
| CU3 | Gérer les fournisseurs | Responsable | 05 |
| CU4 | Planifier une réparation | Responsable | 07, 08 |
| CU5 | Louer un vélo (abonné) | Abonné | 12, 13, 14 |
| CU6 | Louer un vélo (occasionnel) | Utilisateur occasionnel | 16, 17, 18 |
| CU7 | Restituer un vélo | Abonné, Utilisateur occasionnel | 15, 19 |
| CU8 | Contrôler les vélos et enregistrer une réclamation | Technicien | 20, 21 |
| CU9 | Répartir les vélos entre les stations | Technicien | 22, 23 |
| CU10 | Préparer un itinéraire | Responsable | 09, 10 |
| CU11 | Donner un ordre de mission | Responsable | 11 |
| CU12 | S'authentifier (ajouté) | Responsable, Abonné, Technicien | 01 |

---

## CU1 – Gérer les stations
- **Identification** : acteur Responsable ; objectif : créer, consulter, modifier, supprimer des stations.
- **Préconditions** : Responsable authentifié (CU12).
- **Postconditions** : la station est enregistrée, mise à jour ou supprimée.
- **Scénario nominal**
  1. Le Responsable ouvre la liste des stations (écran 02).
  2. Le système affiche nom (H), adresse, capacité, nombre de vélos, occupation et statut.
  3. Le Responsable choisit « Nouvelle station » (écran 03), saisit nom, adresse, capacité et nombre de vélos.
  4. Le système valide et enregistre.
  5. Le Responsable peut ouvrir le détail (écran 04), modifier ou supprimer.
- **Scénarios alternatifs** : modification d'une station existante ; recherche et filtres de la liste.
- **Exceptions** : champ obligatoire manquant ; nombre de vélos supérieur à la capacité ; capacité inférieure au nombre de vélos présents ; suppression d'une station contenant des vélos (H : refusée).

## CU2 – Acheter un vélo
- **Identification** : acteur Responsable ; objectif : enregistrer un vélo acheté.
- **Préconditions** : Responsable authentifié ; au moins un fournisseur existe (CU3).
- **Postconditions** : le vélo existe avec couleur, type, numéro de série et fournisseur ; il est affecté à une station (H).
- **Scénario nominal** : le Responsable ouvre « Achat de vélos » (écran 06) → saisit numéro de série, fournisseur, type, couleur, station d'affectation (H) → valide → le système crée le vélo à l'état « disponible ».
- **Scénarios alternatifs** : fournisseur absent de la liste → CU3 puis retour.
- **Exceptions** : numéro de série déjà utilisé ; station d'affectation pleine.

## CU3 – Gérer les fournisseurs
- **Identification** : acteur Responsable ; objectif : créer, consulter, modifier des fournisseurs.
- **Préconditions** : Responsable authentifié.
- **Postconditions** : fournisseur enregistré ou mis à jour.
- **Scénario nominal** : le Responsable ouvre « Fournisseurs » (écran 05) → consulte la liste → saisit nom, adresse (H), téléphone (H), e-mail (H) dans « Ajouter un fournisseur » → valide.
- **Scénarios alternatifs** : modifier un fournisseur existant ; rechercher.
- **Exceptions** : nom manquant ; fournisseur déjà existant ; suppression d'un fournisseur lié à des vélos (H : refusée).

## CU4 – Planifier une réparation
- **Identification** : acteur Responsable ; objectif : planifier la réparation d'un vélo faisant l'objet d'une réclamation.
- **Préconditions** : Responsable authentifié ; au moins une réclamation à planifier (CU8).
- **Postconditions** : la réclamation passe à « Planifiée » avec une date ; le vélo est « en réparation » (H).
- **Scénario nominal** : le Responsable ouvre « Réclamations » (écran 07) → choisit « Planifier » → écran 08 : vélo et diagnostic affichés, saisie de la date et du technicien (H) → valide.
- **Scénarios alternatifs** : modifier une planification existante.
- **Exceptions** : date dans le passé ; technicien déjà occupé à cette date (H).

## CU5 – Louer un vélo (abonné)
- **Identification** : acteur Abonné ; objectif : prendre un vélo disponible.
- **Préconditions** : Abonné titulaire d'une carte et d'un code secret ; la station de départ a au moins un vélo disponible.
- **Postconditions** : une location est ouverte pour le vélo choisi ; le vélo n'est plus disponible ; le nombre de vélos de la station diminue.
- **Scénario nominal** : identification par carte et code secret (écran 12 / CU12) → choix de la station de départ et d'un vélo disponible (écran 13) → confirmation (écran 14).
- **Scénarios alternatifs** : l'abonné signale un vélo défectueux, le rend et en choisit un autre (une réclamation peut être créée, H).
- **Exceptions** : carte invalide ou code incorrect ; aucun vélo disponible dans la station ; abonné ayant déjà une location en cours (H).

## CU6 – Louer un vélo (utilisateur occasionnel)
- **Identification** : acteur Utilisateur occasionnel ; objectif : louer un vélo sans abonnement.
- **Préconditions** : au moins un vélo disponible à la station de départ.
- **Postconditions** : frais payés, caution encaissée, carte de courte durée délivrée, location ouverte.
- **Scénario nominal** : saisie de l'identité (H : CIN ou passeport), de la station de destination et de la durée (écran 16) → calcul des frais d'utilisation et de la caution (écran 17) → paiement → délivrance de la carte courte durée (écran 18) → choix du vélo.
- **Scénarios alternatifs** : retour en arrière pour modifier la durée ou la destination.
- **Exceptions** : identité incomplète ; paiement refusé ; aucun vélo disponible ; station de destination sans place (H). **Gestion du retard : non définie, voir 06.**

## CU7 – Restituer un vélo
- **Identification** : acteurs Abonné et Utilisateur occasionnel ; objectif : rendre un vélo dans une station.
- **Préconditions** : une location est en cours.
- **Postconditions** : location clôturée ; vélo disponible dans la station d'arrivée ; pour l'occasionnel, caution remboursée.
- **Scénario nominal (abonné)** : choix d'une station proche de la destination ayant des places libres (écran 15) → indication de l'état du vélo → validation.
- **Scénario nominal (occasionnel)** : saisie du numéro de carte courte durée, choix de la station d'arrivée, retour du vélo et de la carte → calcul et remboursement de la caution (écran 19).
- **Scénarios alternatifs** : le vélo est signalé en mauvais état → réclamation (H).
- **Exceptions** : station pleine → proposer une autre station ; carte courte durée non restituée (H) ; dépassement de durée (règle non définie).

## CU8 – Contrôler les vélos et enregistrer une réclamation
- **Identification** : acteur Technicien ; objectif : contrôle quotidien et réclamations.
- **Préconditions** : Technicien authentifié.
- **Postconditions** : l'état de chaque vélo contrôlé est enregistré ; une réclamation (vélo, diagnostic, technicien, date) existe pour chaque anomalie.
- **Scénario nominal** : écran 20 : liste des vélos à contrôler → pour chacun, résultat OK ou « Signaler » → écran 21 : diagnostic → envoi (technicien et date renseignés automatiquement).
- **Scénarios alternatifs** : plusieurs réclamations dans la même session ; clôture du contrôle.
- **Exceptions** : diagnostic vide ; vélo déjà sous réclamation ouverte.

## CU9 – Répartir les vélos entre les stations
- **Identification** : acteur Technicien ; objectif : exécuter une mission de redistribution.
- **Préconditions** : un ordre de mission a été reçu (CU11).
- **Postconditions** : vélos déplacés des stations les plus pleines vers les plus vides ; vélos en panne collectés ; mission clôturée.
- **Scénario nominal** : le Technicien prend le camion et l'itinéraire à l'entrepôt → consulte sa mission (écran 22) → marque chaque étape (prise ou dépôt de vélos) → collecte les vélos en panne → clôture (écran 23) avec récapitulatif.
- **Scénarios alternatifs** : étape non réalisable (station pleine ou vide) : commentaire.
- **Exceptions** : capacité du camion insuffisante (H) ; vélo introuvable.

## CU10 – Préparer un itinéraire
- **Identification** : acteur Responsable ; objectif : préparer un itinéraire de redistribution.
- **Préconditions** : Responsable authentifié ; données de location disponibles.
- **Postconditions** : itinéraire enregistré (étapes ordonnées, nombre de vélos à prendre ou déposer, collecte des vélos en panne).
- **Scénario nominal** : le Responsable consulte l'équilibre des stations et les mouvements (écran 09) → « Préparer un itinéraire » (écran 10) → ordonne les étapes de la station la plus pleine à la plus vide → enregistre.
- **Scénarios alternatifs** : modifier un itinéraire existant ; ajouter une collecte de vélos en panne.
- **Exceptions** : aucune station déséquilibrée ; étapes incohérentes (plus de vélos déposés que pris).

## CU11 – Donner un ordre de mission
- **Identification** : acteur Responsable ; objectif : confier un itinéraire à un technicien.
- **Préconditions** : un itinéraire existe ; un technicien est disponible (H).
- **Postconditions** : ordre de mission créé et visible dans « Ma mission » du technicien.
- **Scénario nominal** : écran 11 : choix du technicien, de l'itinéraire, du camion (H), de la date et heure, consignes → « Envoyer l'ordre ».
- **Scénarios alternatifs** : enregistrer en brouillon ; annuler.
- **Exceptions** : technicien ou camion déjà affecté au même créneau (H).

## CU12 – S'authentifier (ajouté)
- **Identification** : acteurs Responsable, Abonné, Technicien ; objectif : accéder à son espace.
- **Préconditions** : compte existant.
- **Postconditions** : session ouverte sur le menu du profil.
- **Scénario nominal** : écran 01 : choix du profil → saisie du numéro de carte (Abonné) ou de l'identifiant (H, Technicien et Responsable) et du code secret → le système vérifie → redirection vers la page d'accueil du profil.
- **Scénarios alternatifs** : « Utilisateur occasionnel ? Louer sans compte » → CU6 ; « Code secret oublié » (H).
- **Exceptions** : identifiant ou code incorrect ; compte bloqué après plusieurs essais (H : nombre à décider).
