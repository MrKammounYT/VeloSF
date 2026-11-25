/** Horloge remplaçable (les tests fixent la date pour vérifier retards et plannings). */
let decalageMs = 0;
let dateFixe: Date | null = null;

export function maintenant(): Date {
  if (dateFixe) return new Date(dateFixe.getTime() + decalageMs);
  return new Date(Date.now() + decalageMs);
}
export function fixerHorloge(d: Date | null) {
  dateFixe = d;
  decalageMs = 0;
}
export function avancerHorloge(ms: number) {
  decalageMs += ms;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJ. */
export function jourISO(d: Date = maintenant()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Horodatage local au format AAAA-MM-JJTHH:MM:SS (sans fuseau, cohérent pour SQLite). */
export function horodatageISO(d: Date = maintenant()): string {
  return `${jourISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function ajouterJours(jour: string, n: number): string {
  const [a, m, j] = jour.split('-').map(Number);
  return jourISO(new Date(a, m - 1, j + n));
}
/** Lundi de la semaine contenant `jour`. */
export function lundiDe(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  const decalage = (d.getDay() + 6) % 7;
  return ajouterJours(jour, -decalage);
}
export function parseHorodatage(s: string): Date {
  const [jour, heure = '00:00:00'] = s.split('T');
  const [a, m, j] = jour.split('-').map(Number);
  const [h, mi, se = 0] = heure.split(':').map(Number);
  return new Date(a, m - 1, j, h, mi, se);
}
