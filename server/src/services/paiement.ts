/**
 * Paiement de l'utilisateur occasionnel (CU6). Le cas d'étude ne définit aucun prestataire :
 * ce module simule l'encaissement. Pour brancher un vrai terminal, remplacer `prestataire`.
 */
export type ModePaiement = 'carte_bancaire' | 'especes';
export type ResultatPaiement = { accepte: true } | { accepte: false; motif: string };
export type Prestataire = (montant: number | null, mode: ModePaiement) => ResultatPaiement;

const simule: Prestataire = () => ({ accepte: true });
let prestataire: Prestataire = simule;

export function encaisser(montant: number | null, mode: ModePaiement): ResultatPaiement {
  return prestataire(montant, mode);
}
/** Utilisé par les tests pour simuler un paiement refusé. */
export function definirPrestataire(p: Prestataire | null) {
  prestataire = p ?? simule;
}
