import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

/** Erreur prévue par un cas d'utilisation (exception) : renvoyée telle quelle à l'interface. */
export class ErreurMetier extends Error {
  constructor(
    public status: number,
    message: string,
    public champ?: string,
  ) {
    super(message);
  }
}

export function valider<T>(schema: ZodType<T>, donnees: unknown): T {
  const r = schema.safeParse(donnees);
  if (!r.success) {
    const premier = r.error.issues[0];
    throw new ErreurMetier(400, premier?.message ?? 'Données invalides.', premier?.path.join('.'));
  }
  return r.data;
}

export function gestionnaireErreurs(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ErreurMetier) {
    res.status(err.status).json({ erreur: err.message, champ: err.champ });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ erreur: err.issues[0]?.message ?? 'Données invalides.' });
    return;
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
}
