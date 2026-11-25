-- VéloSf – schéma (SQLite / PostgreSQL). Les colonnes marquées (H) sont des hypothèses (docs/06).
-- Les éléments marqués (ajout) n'existaient pas dans le schéma proposé (database/schema.original.sql) ;
-- ils sont nécessaires à l'application et listés dans le README (« Écarts »).
PRAGMA foreign_keys = ON;

CREATE TABLE station (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL,            -- (H1) nom
  adresse TEXT NOT NULL, capacite INTEGER NOT NULL CHECK (capacite > 0),
  nb_velos INTEGER NOT NULL DEFAULT 0 CHECK (nb_velos >= 0 AND nb_velos <= capacite),
  carte_x REAL, carte_y REAL,                           -- (ajout) position sur la carte schématique (0 à 100)
  modifie_le TIMESTAMP                                  -- (ajout) tri « Dernière modification »
);
CREATE TABLE fournisseur (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL UNIQUE,
  adresse TEXT, telephone TEXT, email TEXT              -- (H2)
);
CREATE TABLE camion (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL,            -- (H12)
  capacite INTEGER                                      -- (H12, ajout) capacité en vélos ; NULL = non vérifiée
);
CREATE TABLE velo (
  id INTEGER PRIMARY KEY, numero_serie TEXT NOT NULL UNIQUE,
  couleur TEXT NOT NULL, type TEXT NOT NULL,
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseur(id),
  station_id INTEGER REFERENCES station(id),
  camion_id INTEGER REFERENCES camion(id),              -- (ajout) vélo chargé dans un camion
  etat TEXT NOT NULL DEFAULT 'disponible'
    CHECK (etat IN ('disponible','loue','en_reparation','en_camion')),   -- (H7)
  date_achat DATE                                        -- (H)
);
CREATE TABLE utilisateur (
  id INTEGER PRIMARY KEY,
  profil TEXT NOT NULL CHECK (profil IN ('responsable','abonne','technicien')),
  identifiant TEXT NOT NULL UNIQUE,                      -- numéro de carte pour l'abonné
  code_secret_hash TEXT NOT NULL,
  nom TEXT, prenom TEXT,
  essais_echoues INTEGER NOT NULL DEFAULT 0,             -- (H5, ajout)
  bloque INTEGER NOT NULL DEFAULT 0                      -- (H5, ajout)
);
CREATE TABLE occasionnel (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL,
  piece_identite TEXT NOT NULL                           -- (H10)
);
CREATE TABLE carte_temporaire (
  id INTEGER PRIMARY KEY, numero TEXT NOT NULL UNIQUE,
  occasionnel_id INTEGER NOT NULL REFERENCES occasionnel(id),
  valide_jusqu_a TIMESTAMP NOT NULL, restituee INTEGER NOT NULL DEFAULT 0
);
-- (ajout) paiement de l'occasionnel : frais + caution encaissés avant la délivrance de la carte
CREATE TABLE paiement (
  id INTEGER PRIMARY KEY,
  occasionnel_id INTEGER NOT NULL REFERENCES occasionnel(id),
  carte_temp_id INTEGER REFERENCES carte_temporaire(id),
  mode TEXT NOT NULL CHECK (mode IN ('carte_bancaire','especes')),   -- (H11)
  frais NUMERIC, caution NUMERIC,                         -- NULL tant que les tarifs ne sont pas définis (H11)
  station_destination_id INTEGER REFERENCES station(id),
  duree_prevue_min INTEGER NOT NULL,
  date_paiement TIMESTAMP NOT NULL
);
CREATE TABLE location (
  id INTEGER PRIMARY KEY,
  velo_id INTEGER NOT NULL REFERENCES velo(id),
  abonne_id INTEGER REFERENCES utilisateur(id),
  occasionnel_id INTEGER REFERENCES occasionnel(id),
  carte_temp_id INTEGER REFERENCES carte_temporaire(id),
  station_depart_id INTEGER NOT NULL REFERENCES station(id),
  station_destination_id INTEGER REFERENCES station(id),
  station_arrivee_id INTEGER REFERENCES station(id),
  debut TIMESTAMP NOT NULL, duree_prevue_min INTEGER, fin TIMESTAMP,
  frais NUMERIC, caution NUMERIC, caution_remboursee INTEGER DEFAULT 0,
  depassement_min INTEGER,                               -- (ajout) retard constaté au retour (règle non définie)
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee')),
  CHECK ((abonne_id IS NOT NULL) <> (occasionnel_id IS NOT NULL))
);
CREATE TABLE reclamation (
  id INTEGER PRIMARY KEY, velo_id INTEGER NOT NULL REFERENCES velo(id),
  technicien_id INTEGER REFERENCES utilisateur(id),     -- (ajout) NULL si signalée par un abonné (H8)
  signale_par INTEGER REFERENCES utilisateur(id),       -- (ajout) abonné à l'origine du signalement (H8)
  origine TEXT NOT NULL DEFAULT 'controle'
    CHECK (origine IN ('controle','abonne_location','abonne_restitution')),  -- (ajout)
  diagnostic TEXT NOT NULL, date_reclamation DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_planifier'
    CHECK (statut IN ('a_planifier','planifiee','traitee'))              -- (H7)
);
CREATE TABLE reparation (
  id INTEGER PRIMARY KEY, reclamation_id INTEGER NOT NULL UNIQUE REFERENCES reclamation(id),
  date_prevue DATE NOT NULL, technicien_id INTEGER REFERENCES utilisateur(id)  -- (H6)
);
-- (ajout) résultat du contrôle quotidien (CU8)
CREATE TABLE controle (
  id INTEGER PRIMARY KEY,
  velo_id INTEGER NOT NULL REFERENCES velo(id),
  technicien_id INTEGER NOT NULL REFERENCES utilisateur(id),
  date_controle DATE NOT NULL,
  resultat TEXT NOT NULL CHECK (resultat IN ('ok','anomalie')),
  UNIQUE (velo_id, date_controle)
);
CREATE TABLE itineraire (
  id INTEGER PRIMARY KEY, cree_par INTEGER NOT NULL REFERENCES utilisateur(id),
  date_creation TIMESTAMP NOT NULL
);
CREATE TABLE etape_itineraire (
  id INTEGER PRIMARY KEY, itineraire_id INTEGER NOT NULL REFERENCES itineraire(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL, station_id INTEGER REFERENCES station(id),
  type TEXT NOT NULL CHECK (type IN ('prise','depot','collecte')), nb_velos INTEGER
);
CREATE TABLE ordre_mission (
  id INTEGER PRIMARY KEY, itineraire_id INTEGER NOT NULL REFERENCES itineraire(id),
  technicien_id INTEGER NOT NULL REFERENCES utilisateur(id),
  camion_id INTEGER REFERENCES camion(id), date_heure TIMESTAMP NOT NULL, consignes TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','en_cours','termine')),       -- (H13)
  commentaire_cloture TEXT, date_cloture TIMESTAMP       -- (ajout) écran 23
);
CREATE TABLE execution_etape (
  ordre_mission_id INTEGER NOT NULL REFERENCES ordre_mission(id),
  etape_id INTEGER NOT NULL REFERENCES etape_itineraire(id),
  fait INTEGER NOT NULL DEFAULT 0, commentaire TEXT,
  nb_velos_reel INTEGER,                                 -- (ajout) vélos réellement pris / déposés / collectés
  non_realisable INTEGER NOT NULL DEFAULT 0,             -- (ajout) CU9 scénario alternatif
  PRIMARY KEY (ordre_mission_id, etape_id)
);
