export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS Headers + CACHE CONTROL
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (url.pathname === '/solvents') {
            try {
                // Selezione colonne
                let sql = "SELECT cas, iupac_name, boiling_point, density, dielectric_constant, alpha, beta, pistar, water_miscibility, h_phrases, oxidation_resistance, reduction_resistance, acid_resistance, basic_resistance FROM solventi WHERE 1=1";
                
                const params = [];
                let paramIndex = 1;

                // --- FILTRI ESISTENTI ---
                const search = url.searchParams.get('search');
                if (search) {
                    sql += ` AND (iupac_name LIKE ?${paramIndex++} OR cas LIKE ?${paramIndex++})`;
                    params.push(`%${search}%`, `%${search}%`); 
                }

                const waterMiscibility = url.searchParams.get('water_miscibility');
                if (waterMiscibility) {
                    sql += ` AND LOWER(water_miscibility) = LOWER(?${paramIndex++})`;
                    params.push(waterMiscibility);
                }

                const categoria = url.searchParams.get('categoria');
                if (categoria) {
                    sql += ` AND categoria = ?${paramIndex++}`;
                    params.push(categoria);
                }

                const minBp = url.searchParams.get('min_bp');
                if (minBp) {
                    sql += ` AND boiling_point >= ?${paramIndex++}`;
                    params.push(parseFloat(minBp));
                }
                const maxBp = url.searchParams.get('max_bp');
                if (maxBp) {
                    sql += ` AND boiling_point <= ?${paramIndex++}`;
                    params.push(parseFloat(maxBp));
                }

                // --- FILTRI KAMLET-TAFT ---
                
                // Alpha
                const minAlpha = url.searchParams.get('min_alpha');
                if (minAlpha) {
                    sql += ` AND alpha >= ?${paramIndex++}`;
                    params.push(parseFloat(minAlpha));
                }
                const maxAlpha = url.searchParams.get('max_alpha');
                if (maxAlpha) {
                    sql += ` AND alpha <= ?${paramIndex++}`;
                    params.push(parseFloat(maxAlpha));
                }

                // Beta
                const minBeta = url.searchParams.get('min_beta');
                if (minBeta) {
                    sql += ` AND beta >= ?${paramIndex++}`;
                    params.push(parseFloat(minBeta));
                }
                const maxBeta = url.searchParams.get('max_beta');
                if (maxBeta) {
                    sql += ` AND beta <= ?${paramIndex++}`;
                    params.push(parseFloat(maxBeta));
                }

                // Pi Star
                const minPistar = url.searchParams.get('min_pistar');
                if (minPistar) {
                    sql += ` AND pistar >= ?${paramIndex++}`;
                    params.push(parseFloat(minPistar));
                }
                const maxPistar = url.searchParams.get('max_pistar');
                if (maxPistar) {
                    sql += ` AND pistar <= ?${paramIndex++}`;
                    params.push(parseFloat(maxPistar));
                }

                // --- NUOVI FILTRI: Resistenza Chimica (Dal Modal Compatibility) ---

               

                const filterResistance = (paramName, expectedValue) => {
                    const value = url.searchParams.get(paramName);
                    if (value === 'required') {
                        // MODIFICATO: Filtra ESATTAMENTE per il valore specificato (es. 'Yes' o 'High')
                        sql += ` AND ${paramName} = ?${paramIndex++}`;
                        params.push(expectedValue); 
                    }
                }

                // Modifica le chiamate per specificare il valore atteso (es. 'High' o 'Yes')
                // *** SOSTITUISCI 'High' CON IL VALORE ESATTO CHE VUOI FILTRARE (es. 'Yes') ***
                
                filterResistance('oxidation_resistance', 'yes'); // Assumendo che "Yes" sia la resistenza desiderata
                filterResistance('reduction_resistance', 'yes');
                filterResistance('acid_resistance', 'yes');
                filterResistance('basic_resistance', 'yes');

                // Esecuzione
                let statement = env.DB.prepare(sql);
                if (params.length > 0) {
                    statement = statement.bind(...params);
                }

                const { results } = await statement.all();

                return new Response(JSON.stringify(results), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (e) {
                // Logga l'errore per il debug del worker
                console.error("Database Error:", e); 
                return new Response(JSON.stringify({ error: e.message, sql }), { status: 500, headers: corsHeaders });
            }
        }

        return new Response('Not Found', { status: 404 });
    },
};