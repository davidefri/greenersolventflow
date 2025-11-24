-- api-worker/schema.sql (Versione Finale Obbligatoria)

DROP TABLE IF EXISTS solventi;
CREATE TABLE solventi (
    cas TEXT PRIMARY KEY UNIQUE,
    iupac_name TEXT NOT NULL,       -- ORA TUTTO MINUSCOLO
    formula TEXT,
    boiling_point REAL,
    density REAL,
    dielectric_constant REAL,
    water_miscible INTEGER,
    alpha REAL,
    beta REAL,
    pistar REAL,
    viscosity REAL,
    h_phrases TEXT,
    p_phrases TEXT,
    oxidation_stability TEXT,
    reduction_stability TEXT,
    acid_stability TEXT
);