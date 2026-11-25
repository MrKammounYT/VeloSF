import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Profil, type Utilisateur } from './api';

interface Contexte {
  utilisateur: Utilisateur | null;
  charge: boolean;
  connexion: (profil: Profil, identifiant: string, code: string) => Promise<Utilisateur>;
  deconnexion: () => Promise<void>;
}

const Ctx = createContext<Contexte | null>(null);

export function FournisseurAuth({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    api.get<{ utilisateur: Utilisateur | null }>('/auth/moi')
      .then((r) => setUtilisateur(r.utilisateur))
      .catch(() => setUtilisateur(null))
      .finally(() => setCharge(true));
  }, []);

  const connexion = useCallback(async (profil: Profil, identifiant: string, code: string) => {
    const r = await api.post<{ utilisateur: Utilisateur }>('/auth/connexion', { profil, identifiant, code });
    setUtilisateur(r.utilisateur);
    return r.utilisateur;
  }, []);

  const deconnexion = useCallback(async () => {
    await api.post('/auth/deconnexion');
    setUtilisateur(null);
  }, []);

  return <Ctx.Provider value={{ utilisateur, charge, connexion, deconnexion }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors du FournisseurAuth');
  return c;
}
