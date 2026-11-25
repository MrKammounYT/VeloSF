# Prompt pour l'agent de code

Tu es un développeur full-stack. Tu dois réaliser l'application web **VéloSf** (location de vélos en libre-service, région de Sfax) à partir de ce dossier.

## À lire dans cet ordre
1. `README.md`
2. `docs/01-contexte-et-acteurs.md`, `docs/02-cas-utilisation.md`
3. `docs/03-ecrans.md` et les maquettes `mockups/html/*.html` (ouvre-les dans un navigateur)
4. `docs/04-modele-de-donnees.md` et `database/schema.sql`
5. `docs/05-design-system.md`, `design/`, `references/`
6. `docs/06-hypotheses-et-incoherences.md` (avant de coder une règle métier)
7. `docs/07-plan-implementation.md`

## Contraintes
- Interface 100 % en **français**.
- Reproduire fidèlement les maquettes : menu latéral blanc collé à gauche avec icônes et sections, barre du haut, cartes, tableaux avec barre d'outils, pastilles d'état, pagination. Réutiliser `design/app-shell-and-components.css` comme base.
- 4 profils : Responsable, Abonné, Technicien (avec connexion), Utilisateur occasionnel (sans compte). Le Fournisseur est une donnée gérée par le Responsable, pas un utilisateur.
- Contrôle d'accès par profil (chaque profil ne voit que son menu).
- Ne pas inventer de règle métier. Pour chaque hypothèse de `docs/06`, l'implémenter de façon isolée et facile à changer (constante ou configuration), et la lister dans le README final.
- Pas de données réelles : fournir un jeu de données de démonstration (seed) cohérent avec les maquettes.

## Pile technique
Aucune pile n'est imposée par le cas d'étude. Par défaut : TypeScript, React (Vite) pour le front, Node.js + Express pour l'API, SQLite via Prisma (ou SQL brut avec `database/schema.sql`). Si l'équipe utilise une autre pile (Laravel, Java, etc.), demande-le avant de commencer.

## Livrables
1. Code source complet avec instructions de lancement (`README`).
2. Base de données + seed.
3. Un test (automatique ou manuel documenté) par cas d'utilisation CU1 à CU12.
4. Liste des hypothèses appliquées et des écarts avec les maquettes.

Avance par étapes selon `docs/07-plan-implementation.md` et montre le résultat après chaque étape.
