-- api-worker/schema.sql (Versione Finale Obbligatoria)

DROP TABLE IF EXISTS solventi;
CREATE TABLE solventi (
    cas TEXT PRIMARY KEY UNIQUE,
    iupac_name TEXT NOT NULL,       -- ORA TUTTO MINUSCOLO
    boiling_point REAL,
    density REAL,
    dielectric_constant REAL,
    alpha REAL,
    beta REAL,
    pistar REAL,
    water_miscibility REAL,
    h_phrases TEXT,
    oxidation_resistance TEXT,
    reduction_resistance TEXT,
    acid_resistance TEXT,
    basic_resistance TEXT
);