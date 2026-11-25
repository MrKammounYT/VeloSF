# Hypothèses et incohérences à confirmer

## Incohérences du cas d'étude et de la documentation (corrigées ou signalées)
1. **Double numérotation** CU1–CU11 / UC1–UC8 : unifiée en CU1–CU12.
2. **UC8 fusionnait CU10 et CU11** : séparés.
3. **CU3 et CU7** n'avaient pas de description détaillée : rédigées dans `02-cas-utilisation.md`.
4. **« Section 8 » inexistante** (gestion de la location occasionnelle en retard) : la règle n'est pas définie. L'écran 19 affiche une ligne « Dépassement de durée (hypothèse) ».
5. **Pas de cas « S'authentifier »** alors que CU1 à CU5, CU8 à CU11 exigent une authentification : CU12 ajouté.
6. **Écran 12 (identification de l'abonné)** fait doublon avec l'écran 01 pour l'abonné : à garder comme vérification de carte au début de la location, ou à supprimer.
7. **L'écran 01** n'a pas encore le style des autres écrans.

## Hypothèses (absentes du cas d'étude)
| N° | Hypothèse | Où |
|---|---|---|
| H1 | Les stations ont un nom | CU1, écrans 02 à 04 |
| H2 | Le fournisseur a adresse, téléphone, e-mail | CU3, écran 05 |
| H3 | Le vélo est affecté à une station à l'achat ; types : Ville, VTT, Électrique | CU2, écran 06 |
| H4 | Le Technicien et le Responsable se connectent par identifiant et code secret ; l'occasionnel et le Fournisseur n'ont pas de compte | CU12, écran 01 |
| H5 | « Code secret oublié » existe ; blocage après plusieurs essais (nombre à décider) | CU12 |
| H6 | Une réparation est affectée à un technicien et à une date | CU4, écran 08 |
| H7 | Statuts de réclamation : à planifier, planifiée, traitée ; états du vélo : disponible, loué, en réparation, en camion | modèle de données |
| H8 | Un vélo rendu en mauvais état crée une réclamation | CU5, CU7 |
| H9 | Un abonné ne peut avoir qu'une location en cours | CU5 |
| H10 | Pièce d'identité de l'occasionnel : CIN ou passeport | CU6, écran 16 |
| H11 | Paiement par carte bancaire ou espèces ; devise TND ; **tarifs et caution non définis (« — TND »)** | CU6, écran 17 |
| H12 | Un camion est attribué dans l'ordre de mission ; capacité du camion | CU9, CU11 |
| H13 | Statuts d'ordre de mission : brouillon, envoyé, en cours, terminé | CU11 |
| H14 | Seuils de statut d'une station : « Vide » sous 20 % d'occupation, « Pleine » à 100 %, sinon « Équilibrée » | écrans 02, 09 |
| H15 | Suppression d'une station avec vélos ou d'un fournisseur lié à des vélos refusée | CU1, CU3 |

Pour chaque hypothèse, l'agent doit l'implémenter de façon isolée (constante ou configuration) et la signaler dans son compte rendu.

## Questions ouvertes à poser à l'équipe
- Quels sont les tarifs d'utilisation et le montant de la caution ?
- Que se passe-t-il si l'occasionnel dépasse la durée choisie ou ne rend pas la carte ?
- Quelle pile technique l'équipe veut-elle utiliser ?
- La carte (écrans 03, 04, 10, 22) doit-elle être réelle (OpenStreetMap, Leaflet) ou schématique ?
