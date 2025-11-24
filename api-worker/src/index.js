// --- api-worker/src/index.js (CODICE COMPLETO CHE DEVI INSERIRE) ---

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Controlla il percorso /solvents
    if (url.pathname === '/solvents') {
      try {
        // Esegui la query sul database D1. 'DB' è l'associazione che hai configurato
        const { results } = await env.DB.prepare('SELECT * FROM solvents').all();

        // Restituisci i risultati in formato JSON
        return new Response(JSON.stringify(results), {
          headers: {
            'Content-Type': 'application/json',
            // Headers CORS necessari per Pages
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET',
          },
        });
      } catch (e) {
        // Gestione errore database
        return new Response(e.message || 'Error fetching solvents', { status: 500 });
      }
    }

    // Se l'URL non è /solvents, restituisce un errore 404
    return new Response('API Endpoint Not Found', { status: 404 });
  },
};