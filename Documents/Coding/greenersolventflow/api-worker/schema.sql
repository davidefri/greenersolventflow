-- schema.sql
DROP TABLE IF EXISTS solventi;
CREATE TABLE solventi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cas TEXT UNIQUE,
    formula TEXT,
    punto_ebollizione REAL,
    densita REAL,
    costante_dielettrica REAL,
    polarita TEXT,
    categoria TEXT
);