// AGGIORNA api-worker/src/index.js in questo modo:

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': 'https://greenersolventflow.pages.dev', // Più sicuro che usare '*'
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
                const { results } = await env.DB.prepare('SELECT * FROM solventi').all();

                return new Response(JSON.stringify(results), {
                    headers: {
                        ...corsHeaders, // Includi gli stessi header CORS anche qui
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