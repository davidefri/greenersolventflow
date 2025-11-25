export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // 1. Gestione richiesta OPTIONS (pre-flight)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // 2. Gestione richiesta GET /solvents
        if (url.pathname === '/solvents') {
            try {
        // --- INIZIALIZZAZIONE DELLA QUERY SQL CORRETTA ---
        // Vengono elencate tutte le 14 colonne ESATTE come nel database D1
        let sql = "SELECT cas, iupac_name, boiling_point, density, dielectric_constant, alpha, beta, pistar, water_miscibility, h_phrases, oxidation_resistance, reduction_resistance, acid_resistance, basic_resistance FROM solventi WHERE 1=1";
        // --------------------------------------------------

        const params = [];
        let paramIndex = 1;

                // --- LOGICA DI FILTRO DINAMICO ---

                // Filtro 1: Search (Nome o CAS)
                const search = url.searchParams.get('search');
                if (search) {
                    // Cerca il testo nel nome o nel CAS (case-insensitive)
                    sql += ` AND (iupac_name LIKE ?${paramIndex++} OR cas LIKE ?${paramIndex++})`;
                    // Aggiungi % per la ricerca parziale (wildcard)
                    params.push(`%${search}%`, `%${search}%`); 
                }

                // Filtro 2: Water Miscibility (Correzione Case-Insensitive)
                const waterMiscibility = url.searchParams.get('water_miscibility');
                if (waterMiscibility) {
                    // Conversione in minuscolo sia del database che del parametro
                    sql += ` AND LOWER(water_miscibility) = LOWER(?${paramIndex++})`;
                    params.push(waterMiscibility);
                }

                // Filtro 3: Categoria
                const categoria = url.searchParams.get('categoria');
                if (categoria) {
                    sql += ` AND categoria = ?${paramIndex++}`;
                    params.push(categoria);
                }

                // Filtro 4 & 5: Punto di Ebollizione (Range)
                const minBp = url.searchParams.get('min_bp');
                if (minBp && !isNaN(parseFloat(minBp))) {
                    sql += ` AND boiling_point >= ?${paramIndex++}`;
                    params.push(parseFloat(minBp));
                }
                const maxBp = url.searchParams.get('max_bp');
                if (maxBp && !isNaN(parseFloat(maxBp))) {
                    sql += ` AND boiling_point <= ?${paramIndex++}`;
                    params.push(parseFloat(maxBp));
                }

                // --- ESECUZIONE DELLA QUERY ---
                
                // Prepara lo statement e lega i parametri
                let statement = env.DB.prepare(sql);
                if (params.length > 0) {
                    statement = statement.bind(...params);
                }

                const { results } = await statement.all();

                return new Response(JSON.stringify(results), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (e) {
                // In caso di errore SQL o altro
                return new Response(JSON.stringify({
                    error: "Internal Server Error", 
                    details: e.message || 'Error fetching solvents'
                }), { status: 500, headers: corsHeaders });
            }
        }

        // 3. Fallback per altre rotte
        return new Response('API Endpoint Not Found', { status: 404 });
    },
};