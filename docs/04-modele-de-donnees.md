# Modèle de données (proposition)

Dérivé du cas d'étude. Les attributs marqués **(H)** sont des hypothèses.

| Entité | Attributs | Remarques |
|---|---|---|
| Station | id, nom (H), adresse, capacité, nb_velos | nb_velos peut être calculé ; contrainte nb_velos ≤ capacité |
| Fournisseur | id, nom, adresse (H), téléphone (H), email (H) | |
| Vélo | id, numéro_série (unique), couleur, type, fournisseur_id, station_id (nullable si en location ou en camion), état (disponible, loué, en_réparation, en_camion) (H), date_achat (H) | |
| Utilisateur | id, profil (responsable, abonné, technicien), identifiant, code_secret_hash | un seul compte par personne |
| Abonné | utilisateur_id, numéro_carte, nom, prénom | |
| UtilisateurOccasionnel | id, nom, prénom, pièce_identité (H) | pas de compte |
| CarteTemporaire | id, numéro, occasionnel_id, valide_jusqu_à, restituée | carte courte durée |
| Location | id, vélo_id, abonné_id ou occasionnel_id, carte_temp_id, station_départ_id, station_destination_id, station_arrivée_id, début, durée_prévue, fin, frais, caution, caution_remboursée, statut | |
| Réclamation | id, vélo_id, technicien_id, diagnostic, date, statut (à_planifier, planifiée, traitée) (H) | |
| Réparation | id, réclamation_id, date_prévue, technicien_id (H), statut (H) | « planifier une réparation » |
| Camion | id, nom (H) | |
| Itinéraire | id, créé_par, date_création | |
| ÉtapeItinéraire | id, itinéraire_id, ordre, station_id, type (prise, dépôt, collecte), nb_vélos | |
| OrdreMission | id, itinéraire_id, technicien_id, camion_id (H), date_heure, consignes, statut (brouillon, envoyé, en_cours, terminé) (H) | |
| ExécutionÉtape | ordre_mission_id, étape_id, fait, commentaire | suivi par le technicien |

## Règles d'intégrité
- Numéro de série unique.
- nb_velos ≤ capacité pour chaque station.
- Un vélo loué n'est dans aucune station.
- Une location d'occasionnel suppose frais payés, caution encaissée et carte temporaire.
- Un vélo sous réclamation ouverte n'est pas disponible à la location (H).
