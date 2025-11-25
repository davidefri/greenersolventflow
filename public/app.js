// public/app.js

// !!! IMPORTANTE: DEVI USARE IL TUO URL DI DEPLOY !!!
const API_URL = 'https://api-worker.davide-frigatti.workers.dev/solvents'; 
const TOTAL_COLUMNS = 14; 

document.addEventListener('DOMContentLoaded', caricaSolventi);

function getQueryString() {
    // Raccoglie i valori inseriti dall'utente nei campi di filtro
    const search = document.getElementById('search').value;
    const polarita = document.getElementById('polarita').value;
    const categoria = document.getElementById('categoria').value;
    const min_bp = document.getElementById('min_bp').value;
    const max_bp = document.getElementById('max_bp').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (polarita) params.append('polarita', polarita);
    if (categoria) params.append('categoria', categoria);
    if (min_bp) params.append('min_bp', min_bp);
    if (max_bp) params.append('max_bp', max_bp);

    return params.toString(); 
}

async function caricaSolventi() {
    const query = getQueryString();
    const endpoint = query ? `${API_URL}?${query}` : API_URL; 
    
    const tbody = document.getElementById('tabella-corpo');
    const countElement = document.getElementById('risultati-count');
    
    tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}">Caricamento in corso...</td></tr>`;
    countElement.textContent = 'Ricerca in corso...';

    try {
        const response = await fetch(endpoint);
        
        // Se la risposta non è OK, potrebbe essere un errore API o CORS
        if (!response.ok) {
             throw new Error(`API non accessibile o errore HTTP ${response.status}`);
        }
        
        const data = await response.json(); 

        tbody.innerHTML = '';
        
        // Verifica se l'API ha restituito un errore strutturato
        if (data.error) {
             tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: red;">Errore API: ${data.details || data.error}</td></tr>`;
             countElement.textContent = 'Errore API';
             return;
        }

        countElement.textContent = `Trovati ${data.length} solventi.`;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}">Nessun solvente trovato con i filtri selezionati.</td></tr>`;
        } else {
            data.forEach(solvente => {
                const row = tbody.insertRow();
                
                // --- INSERIMENTO DATI (14 COLONNE) ---
                
                // 1. Nome
                row.insertCell().textContent = solvente.iupac_name || '-';
                
                // 2. CAS
                row.insertCell().textContent = solvente.cas || '-';

                // *** CAMPI NUMERICI CORRETTI CON PARSEFLOAT E !ISNAN ***
                
                // 3. P. Eboll. (°C)
                const bp = parseFloat(solvente.boiling_point);
                row.insertCell().textContent = !isNaN(bp) ? bp.toFixed(1) : '-';
                
                // 4. Densità (g/cm³)
                const density = parseFloat(solvente.density);
                row.insertCell().textContent = !isNaN(density) ? density.toFixed(3) : '-';
                
                // 5. Costante Dielett.
                const dc = parseFloat(solvente.dielectric_constant);
                row.insertCell().textContent = !isNaN(dc) ? dc.toFixed(1) : '-';
                
                // 6. Miscibilità H₂O (Campo stringa/booleano)
                row.insertCell().textContent = solvente.water_miscibility || '-'; 
                
                // 7. Alpha (α)
                const alpha = parseFloat(solvente.alpha);
                row.insertCell().textContent = !isNaN(alpha) ? alpha.toFixed(2) : '-'; 

                // 8. Beta (β)
                const beta = parseFloat(solvente.beta);
                row.insertCell().textContent = !isNaN(beta) ? beta.toFixed(2) : '-';

                // 9. Pi Star (π*)
                const piStar = parseFloat(solvente.pistar);
                row.insertCell().textContent = !isNaN(piStar) ? piStar.toFixed(2) : '-';
                
                // *** CAMPI STRINGA ***
                
                // 10. Frasi H
                row.insertCell().textContent = solvente.h_phrases || '-';
                
                // 11. Stabilità Ossid.
                row.insertCell().textContent = solvente.oxidation_resistance || '-';
                
                // 12. Stabilità Riduz.
                row.insertCell().textContent = solvente.reduction_resistance || '-';
                
                // 13. Stabilità Acida
                row.insertCell().textContent = solvente.acid_resistance || '-';
                
                // 14. Stabilità Basica
                row.insertCell().textContent = solvente.basic_resistance || '-';
                
                // --- FINE INSERIMENTO DATI ---
            });
        }
    } catch (error) {
        // Cattura errori di rete, deploy, o connessione fallita
        console.error('Errore nel caricamento dei dati dal Worker:', error);
        tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: red;">Errore nel caricamento dei dati: ${error.message || 'Impossibile raggiungere l\'API.'}</td></tr>`;
        countElement.textContent = 'Errore di Rete';
    }
}

function resetFiltri() {
    // Resetta tutti i campi di input
    document.getElementById('search').value = '';
    document.getElementById('polarita').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';
    caricaSolventi();
}

document.addEventListener('DOMContentLoaded', caricaSolventi);