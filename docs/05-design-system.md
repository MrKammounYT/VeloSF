# Design system

Référence visuelle : `references/ref-5-flowai-dashboard-STYLE-PRINCIPAL.png` (pages et cartes) et `ref-6-flowai-tableaux-STYLE-TABLEAUX.png` (tableaux). Le CSS complet est dans `design/app-shell-and-components.css` ; les variables sont dans `design/tokens.css`.

## Typographie
- Police : **Inter** (Google Fonts, graisses 400, 500, 600, 700). Corps 13 px. Titre de page 22 px, graisse 500. Texte secondaire 12,5 px gris.

## Couleurs
| Usage | Valeur |
|---|---|
| Fond de page | `#f7f7f7` |
| Cartes, menu, barre du haut | `#ffffff`, bordure `#ececec` |
| Tuiles et lignes d'en-tête de tableau | `#f4f4f3` / `#f6f6f5` |
| Texte principal | `#111111` |
| Texte secondaire | `#6b6b66` |
| Action principale | fond `#111`, texte blanc |
| Succès | texte `#15803d`, fond `#e6f6ec` |
| Alerte | texte `#8a5206`, fond `#fdf1de` |
| Erreur | texte `#b91c1c`, fond `#fdecec` |
| Badge du menu | fond `#e0ecff`, texte `#1d4ed8` |

## Formes
- Cartes : rayon 14 px. Boutons et champs : rayon 8 px, hauteur 36 px (boutons) et 40 px (champs). Pastilles : rayon 6 px.
- Menu latéral : 248 px de large, collé à gauche, pleine hauteur, bordure droite.

## Composants (classes CSS)
`.sb` menu · `.sec` titre de section · `.nav` / `.nav.on` entrée de menu · `.tb` barre du haut · `.hd` en-tête de page · `.stat` carte de chiffre · `.card` carte · `.tbar` barre d'outils du tableau · `table` + `.chip.ok/.warn/.bad` · `.pc.ok/.warn/.bad` pourcentage coloré · `.acts` actions de ligne · `.pgf` / `.pg` pagination · `.li` ligne de liste · `.n` pastille numérotée · `.steps` barre d'étapes · `.tc` carte de station (écran 09) · `.btn`, `.btn.p`, `.btn.g`.

## Icônes
Icônes en trait (stroke 2, arrondies), 16 px dans le menu, 14 à 18 px ailleurs, au style Lucide/Feather. Les tracés SVG utilisés sont dans les fichiers HTML ; une bibliothèque équivalente (Lucide) peut les remplacer.
Correspondance du menu : Stations (épingle), Fournisseurs (camion), Achat de vélos (panier), Réclamations (triangle d'alerte), Planification (calendrier), Équilibre des stations (barres), Itinéraires (parcours), Ordres de mission (document), Contrôle quotidien (presse-papiers), Ma mission (drapeau), Fin de mission et Confirmation (coche dans un cercle), Identification (carte d'identité), Choisir un vélo (vélo), Restitution (flèche retour), Mes informations (profil), Paiement (carte bancaire), Carte délivrée (ticket).

## Accessibilité
Utiliser de vrais `<button>`, `<a>`, `<label>` + `<input>` ; `aria-label` sur les boutons-icônes ; contrastes d'au moins 4,5:1 pour le texte.
