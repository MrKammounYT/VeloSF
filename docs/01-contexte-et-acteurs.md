# Contexte et acteurs

## Le cas
**CycloSfaxcity**, nouvelle société, exploite à Sfax un système de location de vélos nommé **VéloSf**.

1. **Gestion du parc**
   - Stations : adresse, capacité, nombre de vélos.
   - Le responsable achète des vélos auprès de fournisseurs (couleur, type, numéro de série, informations du fournisseur).
   - Les techniciens font un contrôle quotidien et déposent des réclamations de réparation (vélo, diagnostic, technicien, date).
   - Le responsable planifie les réparations.
2. **Location**
   - Les **abonnés** utilisent une carte d'abonné et un code secret, choisissent un vélo disponible, peuvent rendre un vélo en mauvais état, et restituent le vélo dans une station proche de leur destination.
   - Les **utilisateurs occasionnels** donnent leur identité, la station de destination et la durée, paient les frais d'utilisation plus une caution, reçoivent une carte de courte durée, et récupèrent la caution en rendant le vélo et la carte.
3. **Redistribution**
   - Les techniciens prennent un camion et un itinéraire préparé à l'entrepôt, déplacent des vélos des stations les plus pleines vers les plus vides, et collectent les vélos en panne.
4. **Itinéraires**
   - Le responsable consulte les mouvements de location, prépare les itinéraires et donne un ordre de mission à un technicien quand les stations sont déséquilibrées.

## Acteurs

| Acteur | Rôle dans le système | Connexion |
|---|---|---|
| Responsable | Stations, fournisseurs, achats, planification des réparations, itinéraires, ordres de mission | Oui |
| Abonné | Louer et restituer avec carte d'abonné et code secret | Oui (carte + code secret) |
| Utilisateur occasionnel | Louer avec identité, paiement et carte courte durée | Non (hypothèse) |
| Technicien | Contrôle quotidien, réclamations, missions de redistribution | Oui |
| Fournisseur | Fournit les vélos ; enregistré par le Responsable | Non (donnée, pas utilisateur) |
