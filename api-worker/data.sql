-- api-worker/data.sql (Versione corretta)

INSERT INTO solventi (
    cas, iupac_name, formula, boiling_point, density, dielectric_constant, 
    water_miscible, alpha, beta, pistar, viscosity, h_phrases, p_phrases, 
    oxidation_stability, reduction_stability, acid_stability
)
VALUES 
(
    '67-64-1', 'Acetone', 'C3H6O', 56.1, 0.791, 20.7, 1, 0.08, 0.49, 0.71, 0.32, 
    'H225', 'P210', 'test', 'test', 'test'
);