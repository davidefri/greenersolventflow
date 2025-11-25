export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        // *** CAMBIAMENTO CRITICO QUI: ORIGINE IMPOSTATA SU TUTTI (*) ***
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*', // TUTTE LE ORIGINI CONSENTITE PER TEST
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // 1. Gestione richiesta OPTIONS (pre-flight)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204, // No Content
                headers: corsHeaders
            });
        }

        // 2. Gestione richiesta GET /solvents
        if (url.pathname === '/solvents') {
            try {
                // Query SQL corretta (SELECT * FROM solventi)
                const { results } = await env.DB.prepare('SELECT * FROM solventi').all();

                return new Response(JSON.stringify(results), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (e) {
                return new Response(e.message || 'Error fetching solvents', { status: 500, headers: corsHeaders });
            }
        }

        // 3. Fallback per altre rotte
        return new Response('API Endpoint Not Found', { status: 404 });
    },
};