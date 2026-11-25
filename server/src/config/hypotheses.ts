/**
 * Hypothèses de règles métier (docs/06-hypotheses-et-incoherences.md).
 *
 * Toutes les règles absentes du cas d'étude sont regroupées ici. Pour changer une règle,
 * modifier la valeur correspondante : aucun autre fichier ne code ces valeurs en dur.
 * La valeur `null` signifie « non défini par le cas d'étude » : l'interface affiche alors « — TND »
 * ou « À confirmer » au lieu d'inventer un montant.
 */
export const HYPOTHESES = {
  /** H3 – types de vélo proposés à l'achat. */
  TYPES_VELO: ['Ville', 'VTT', 'Électrique'] as const,

  /** H5 – nombre d'essais de connexion échoués avant blocage du compte (nombre à décider par l'équipe). */
  MAX_ESSAIS_CONNEXION: 5,

  /** H6 – nombre maximal de réparations planifiées par technicien et par jour (« technicien déjà occupé »). */
  MAX_REPARATIONS_PAR_TECHNICIEN_PAR_JOUR: 1,

  /** H8 – un vélo signalé en mauvais état par un abonné (location ou restitution) crée une réclamation. */
  SIGNALEMENT_ABONNE_CREE_RECLAMATION: true,

  /** H9 – nombre maximal de locations en cours pour un abonné. */
  MAX_LOCATIONS_EN_COURS_ABONNE: 1,

  /** H10 – pièces d'identité acceptées pour l'utilisateur occasionnel. */
  PIECES_IDENTITE: ['CIN', 'Passeport'] as const,

  /** H11 – modes de paiement et devise. */
  MODES_PAIEMENT: { carte_bancaire: 'Carte bancaire', especes: 'Espèces' } as const,
  DEVISE: 'TND',
  /** H11 – tarif d'utilisation par heure entamée, en TND. NON DÉFINI par le cas d'étude. */
  TARIF_HORAIRE_TND: null as number | null,
  /** H11 – montant de la caution, en TND. NON DÉFINI par le cas d'étude. */
  CAUTION_TND: null as number | null,

  /** CU6 – durée d'utilisation minimale et maximale acceptée à la saisie (minutes). Bornes techniques, à confirmer. */
  DUREE_MIN_MIN: 15,
  DUREE_MAX_MIN: 24 * 60,

  /** CU6 (H) – refuser la location si la station de destination n'a aucune place libre au moment de la demande. */
  REFUS_DESTINATION_PLEINE: true,

  /**
   * CU7 – règle de dépassement de durée de l'occasionnel. NON DÉFINIE (« section 8 » inexistante).
   * `null` : le retard est mesuré et affiché, aucune retenue n'est appliquée, le montant est « À confirmer ».
   * Exemple de règle possible : { penaliteParHeureTND: 2 } (retenue sur la caution).
   */
  REGLE_DEPASSEMENT: null as null | { penaliteParHeureTND: number },

  /** H12 – un camion est obligatoire dans l'ordre de mission ; sa capacité est vérifiée si elle est renseignée. */
  CAMION_OBLIGATOIRE: true,

  /** H14 – seuils de statut d'une station (taux d'occupation = vélos / capacité). */
  SEUIL_VIDE: 0.2, // « Vide » strictement sous 20 %
  SEUIL_PLEINE: 1.0, // « Pleine » à 100 %

  /** H15 – suppression refusée d'une station qui contient des vélos, ou d'un fournisseur lié à des vélos. */
  REFUS_SUPPRESSION_STATION_AVEC_VELOS: true,
  REFUS_SUPPRESSION_FOURNISSEUR_AVEC_VELOS: true,
};

export type StatutStation = 'vide' | 'pleine' | 'equilibree';

/** H14 – statut d'une station à partir de son occupation. */
export function statutStation(nbVelos: number, capacite: number): StatutStation {
  const taux = capacite > 0 ? nbVelos / capacite : 0;
  if (taux >= HYPOTHESES.SEUIL_PLEINE) return 'pleine';
  if (taux < HYPOTHESES.SEUIL_VIDE) return 'vide';
  return 'equilibree';
}

/** H11 – frais d'utilisation pour une durée donnée ; `null` si le tarif n'est pas défini. */
export function calculerFrais(dureeMin: number): number | null {
  if (HYPOTHESES.TARIF_HORAIRE_TND == null) return null;
  return Math.ceil(dureeMin / 60) * HYPOTHESES.TARIF_HORAIRE_TND;
}

/** CU7 – retenue pour dépassement ; `null` si la règle n'est pas définie. */
export function calculerRetenueDepassement(depassementMin: number): number | null {
  if (depassementMin <= 0) return 0;
  const regle = HYPOTHESES.REGLE_DEPASSEMENT;
  if (regle == null) return null;
  return Math.ceil(depassementMin / 60) * regle.penaliteParHeureTND;
}
