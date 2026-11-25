import type { StatutStation } from '../api';

export interface PointCarte { id: number; nom: string; carte_x: number | null; carte_y: number | null; statut?: StatutStation }

/** Position de l'entrepôt (départ des camions) sur la carte schématique. */
export const ENTREPOT = { x: 60, y: 82 };

const COULEUR: Record<StatutStation, string> = { equilibree: '#22c55e', pleine: '#e0892b', vide: '#ef6b6b' };
const W = 400, H = 240;
const px = (x: number) => (x / 100) * W;
const py = (y: number) => (y / 100) * H;

/**
 * Carte schématique de Sfax (choix de l'équipe : pas de fond de carte réel). Les stations sont placées
 * par leurs coordonnées relatives (0 à 100). `trajet` trace un parcours depuis l'entrepôt.
 */
export function CarteSchematique({
  stations, hauteur = 240, trajet, surligner, choix, onChoisir, etapeCourante,
}: {
  stations: PointCarte[];
  hauteur?: number;
  trajet?: (number | null)[];
  surligner?: number;
  choix?: { x: number; y: number } | null;
  onChoisir?: (x: number, y: number) => void;
  etapeCourante?: number;
}) {
  const places = stations.filter((s) => s.carte_x != null && s.carte_y != null);
  const pos = (id: number | null) => {
    const s = id == null ? null : places.find((p) => p.id === id);
    return s ? [px(s.carte_x!), py(s.carte_y!)] : null;
  };
  const points = trajet ? [[px(ENTREPOT.x), py(ENTREPOT.y)], ...trajet.map(pos).filter(Boolean)] as number[][] : [];
  // Supprime les points consécutifs identiques (prise puis collecte dans la même station)
  const chemin = points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);

  const clic = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onChoisir) return;
    const r = e.currentTarget.getBoundingClientRect();
    // preserveAspectRatio="xMidYMid slice" : on recalcule la zone visible
    const echelle = Math.max(r.width / W, r.height / H);
    const dx = (r.width - W * echelle) / 2, dy = (r.height - H * echelle) / 2;
    const x = ((e.clientX - r.left - dx) / echelle / W) * 100;
    const y = ((e.clientY - r.top - dy) / echelle / H) * 100;
    onChoisir(Math.round(Math.min(100, Math.max(0, x))), Math.round(Math.min(100, Math.max(0, y))));
  };

  return (
    <div className={`map${onChoisir ? ' map-clic' : ''}`} style={{ height: hauteur }} role="img"
      aria-label={onChoisir ? 'Carte : cliquez pour placer la station' : 'Carte schématique des stations'}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }} onClick={clic}>
        {/* Mer (golfe de Gabès) et routes principales, schématiques */}
        <path d="M400 150 L400 240 L170 240 Q260 210 300 175 Q350 150 400 150Z" fill="#dfe9ee" />
        <g fill="none" stroke="#cfccc2" strokeWidth="10" strokeLinecap="round">
          <path d="M208 134 L150 50 L120 0" />
          <path d="M208 134 L288 58 L330 0" />
          <path d="M208 134 L120 200 L80 240" />
          <path d="M208 134 L0 120" />
          <path d="M208 134 L250 158 L300 175" />
        </g>
        {chemin.length > 1 && (
          <polyline points={chemin.map((p) => p.join(',')).join(' ')} fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        )}
        {trajet && (
          <g>
            <rect x={px(ENTREPOT.x) - 7} y={py(ENTREPOT.y) - 7} width="14" height="14" rx="3" fill="#111" />
            <text x={px(ENTREPOT.x) + 11} y={py(ENTREPOT.y) + 4} fontSize="10" fill="#111" fontFamily="Inter, sans-serif">Entrepôt</text>
          </g>
        )}
        {places.map((s) => {
          const [x, y] = [px(s.carte_x!), py(s.carte_y!)];
          const rang = trajet ? trajet.indexOf(s.id) : -1;
          const fort = surligner === s.id || (etapeCourante != null && trajet?.[etapeCourante] === s.id);
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={fort ? 10 : 7} fill={s.statut ? COULEUR[s.statut] : '#111'} stroke="#fff" strokeWidth="2" />
              {rang >= 0 && <text x={x} y={y + 3.5} fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700" fontFamily="Inter, sans-serif">{rang + 2}</text>}
              <text x={x + 11} y={y + 4} fontSize="10" fill="#333" fontFamily="Inter, sans-serif" fontWeight={fort ? 600 : 400}>{s.nom}</text>
            </g>
          );
        })}
        {choix && (
          <g>
            <circle cx={px(choix.x)} cy={py(choix.y)} r="10" fill="#111" opacity=".15" />
            <circle cx={px(choix.x)} cy={py(choix.y)} r="6" fill="#111" />
          </g>
        )}
      </svg>
    </div>
  );
}
