-- VéloSf – schéma proposé (SQLite / PostgreSQL). Les colonnes marquées (H) sont des hypothèses.
CREATE TABLE station (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL,            -- (H) nom
  adresse TEXT NOT NULL, capacite INTEGER NOT NULL CHECK (capacite > 0),
  nb_velos INTEGER NOT NULL DEFAULT 0 CHECK (nb_velos >= 0 AND nb_velos <= capacite)
);
CREATE TABLE fournisseur (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL,
  adresse TEXT, telephone TEXT, email TEXT              -- (H)
);
CREATE TABLE velo (
  id INTEGER PRIMARY KEY, numero_serie TEXT NOT NULL UNIQUE,
  couleur TEXT NOT NULL, type TEXT NOT NULL,
  fournisseur_id INTEGER NOT NULL REFERENCES fournisseur(id),
  station_id INTEGER REFERENCES station(id),
  etat TEXT NOT NULL DEFAULT 'disponible'
    CHECK (etat IN ('disponible','loue','en_reparation','en_camion')),   -- (H)
  date_achat DATE                                        -- (H)
);
CREATE TABLE utilisateur (
  id INTEGER PRIMARY KEY,
  profil TEXT NOT NULL CHECK (profil IN ('responsable','abonne','technicien')),
  identifiant TEXT NOT NULL UNIQUE,                      -- numéro de carte pour l'abonné
  code_secret_hash TEXT NOT NULL,
  nom TEXT, prenom TEXT
);
CREATE TABLE occasionnel (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL,
  piece_identite TEXT NOT NULL                           -- (H)
);
CREATE TABLE carte_temporaire (
  id INTEGER PRIMARY KEY, numero TEXT NOT NULL UNIQUE,
  occasionnel_id INTEGER NOT NULL REFERENCES occasionnel(id),
  valide_jusqu_a TIMESTAMP NOT NULL, restituee BOOLEAN NOT NULL DEFAULT 0
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
  frais NUMERIC, caution NUMERIC, caution_remboursee BOOLEAN DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee')),
  CHECK ((abonne_id IS NOT NULL) <> (occasionnel_id IS NOT NULL))
);
CREATE TABLE reclamation (
  id INTEGER PRIMARY KEY, velo_id INTEGER NOT NULL REFERENCES velo(id),
  technicien_id INTEGER NOT NULL REFERENCES utilisateur(id),
  diagnostic TEXT NOT NULL, date_reclamation DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_planifier'
    CHECK (statut IN ('a_planifier','planifiee','traitee'))              -- (H)
);
CREATE TABLE reparation (
  id INTEGER PRIMARY KEY, reclamation_id INTEGER NOT NULL UNIQUE REFERENCES reclamation(id),
  date_prevue DATE NOT NULL, technicien_id INTEGER REFERENCES utilisateur(id)  -- (H)
);
CREATE TABLE camion (id INTEGER PRIMARY KEY, nom TEXT NOT NULL);          -- (H)
CREATE TABLE itineraire (
  id INTEGER PRIMARY KEY, cree_par INTEGER NOT NULL REFERENCES utilisateur(id),
  date_creation TIMESTAMP NOT NULL
);
CREATE TABLE etape_itineraire (
  id INTEGER PRIMARY KEY, itineraire_id INTEGER NOT NULL REFERENCES itineraire(id),
  ordre INTEGER NOT NULL, station_id INTEGER REFERENCES station(id),
  type TEXT NOT NULL CHECK (type IN ('prise','depot','collecte')), nb_velos INTEGER
);
CREATE TABLE ordre_mission (
  id INTEGER PRIMARY KEY, itineraire_id INTEGER NOT NULL REFERENCES itineraire(id),
  technicien_id INTEGER NOT NULL REFERENCES utilisateur(id),
  camion_id INTEGER REFERENCES camion(id), date_heure TIMESTAMP NOT NULL, consignes TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','en_cours','termine'))        -- (H)
);
CREATE TABLE execution_etape (
  ordre_mission_id INTEGER NOT NULL REFERENCES ordre_mission(id),
  etape_id INTEGER NOT NULL REFERENCES etape_itineraire(id),
  fait BOOLEAN NOT NULL DEFAULT 0, commentaire TEXT,
  PRIMARY KEY (ordre_mission_id, etape_id)
);
