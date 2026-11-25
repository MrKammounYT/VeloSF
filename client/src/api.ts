export class ErreurApi extends Error {
  constructor(public status: number, message: string, public champ?: string) {
    super(message);
  }
}

async function requete<T>(methode: string, url: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api${url}`, {
    method: methode,
    credentials: 'same-origin',
    headers: corps !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurApi(r.status, json.erreur ?? 'Erreur de communication avec le serveur.', json.champ);
  return json as T;
}

export const api = {
  get: <T>(url: string) => requete<T>('GET', url),
  post: <T>(url: string, corps: unknown = {}) => requete<T>('POST', url, corps),
  put: <T>(url: string, corps: unknown) => requete<T>('PUT', url, corps),
  del: <T>(url: string) => requete<T>('DELETE', url),
};

// ---------- Types partagés avec l'API
export type Profil = 'responsable' | 'abonne' | 'technicien';
export type ProfilAffiche = Profil | 'occasionnel';
export interface Utilisateur { id: number; profil: Profil; identifiant: string; nom: string }
export type StatutStation = 'vide' | 'pleine' | 'equilibree';
export interface Station {
  id: number; nom: string; adresse: string; capacite: number; nb_velos: number;
  carte_x: number | null; carte_y: number | null; modifie_le: string | null;
  occupation: number; statut: StatutStation; places_libres: number; velos_disponibles: number;
}
export interface StationLocation {
  id: number; nom: string; adresse: string; capacite: number; nb_velos: number;
  places_libres: number; velos_disponibles: number; statut: StatutStation; carte_x: number | null; carte_y: number | null;
}
export interface VeloSimple { id: number; numero_serie: string; type: string; couleur: string }
