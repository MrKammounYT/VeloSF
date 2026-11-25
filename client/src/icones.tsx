import type { ReactNode } from 'react';

/** Icônes en trait (stroke 2, arrondies), tracés repris des maquettes (style Lucide/Feather). */
const TRACES: Record<string, ReactNode> = {
  velo: (<><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M5.5 16.5L9 8h5l4.5 8.5M9 8L7.5 6H6M14 8l-3 8.5H5.5" /></>),
  panneau: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>),
  section: <circle cx="12" cy="12" r="8" strokeDasharray="2 3.5" />,
  epingle: (<><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  camion: (<><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
  panier: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h3l2.5 11h10L21 7H7" /></>),
  alerte: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>),
  calendrier: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  barres: <path d="M5 20V10M12 20V4M19 20v-7" />,
  parcours: (<><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>),
  document: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" />,
  presse: (<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 14l2 2 4-4" /></>),
  drapeau: <path d="M5 21V4M5 4h12l-2 4 2 4H5" />,
  coche: (<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>),
  identite: (<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h4" /></>),
  retour: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  profil: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  paiement: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 11h18" /></>),
  ticket: (<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h6M7 14h3" /></>),
  carte: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>),
  cadenas: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  deconnexion: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
  grille: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  droite: <path d="M9 6l6 6-6 6" />,
  gauche: <path d="M15 6l-6 6 6 6" />,
  bas: <path d="M6 9l6 6 6-6" />,
  recherche: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  cloche: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  export: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  plus: (<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  horloge: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  haut: <path d="M6 15l6-6 6 6" />,
  croix: <path d="M6 6l12 12M18 6L6 18" />,
};

export type NomIcone = keyof typeof TRACES;

export function Icone({ nom, taille = 16 }: { nom: NomIcone; taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACES[nom]}
    </svg>
  );
}
