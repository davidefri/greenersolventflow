// public/app.js (o app_finale.js)

// !!! IMPORTANTE: DEVI USARE IL TUO URL DI DEPLOY !!!
const API_URL = 'https://api-worker.davide-frigatti.workers.dev/solvents'; 
const TOTAL_COLUMNS = 14; 
// Array per memorizzare i criteri di ordinamento (es: [{field: 'alpha', direction: 'asc'}, ...])
let sortCriteria = []; 

document.addEventListener('DOMContentLoaded', () => {
    caricaSolventi();
    // Aggiunge i listener per l'ordinamento dopo che la pagina è stata caricata
    document.getElementById('risultati-tabella').addEventListener('click', handleSort);
});


function getQueryString() {
    // Raccoglie i valori inseriti dall'utente nei campi di filtro
    const search = document.getElementById('search').value;
    const waterMiscibility = document.getElementById('water_miscibility').value; 
    const categoria = document.getElementById('categoria').value;
    const min_bp = document.getElementById('min_bp').value;
    const max_bp = document.getElementById('max_bp').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    // CORREZIONE: Convertiamo il valore a minuscolo prima di inviarlo
    if (waterMiscibility) {
        params.append('water_miscibility', waterMiscibility.toLowerCase()); 
    }
    
    if (categoria) params.append('categoria', categoria);
    if (min_bp) params.append('min_bp', min_bp);
    if (max_bp) params.append('max_bp', max_bp);

    return params.toString(); 
}

// Funzione di ordinamento multi-livello
function multiSort(data) {
    if (sortCriteria.length === 0) {
        return data;
    }

    return data.sort((a, b) => {
        for (const criterion of sortCriteria) {
            const field = criterion.field;
            const dir = criterion.direction === 'asc' ? 1 : -1;

            let valA = a[field];
            let valB = b[field];

            // Conversione a numero se il campo è numerico
            if (['boiling_point', 'density', 'dielectric_constant', 'alpha', 'beta', 'pistar'].includes(field)) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
                // Gestione valori non numerici (es. '-' o stringhe)
                if (isNaN(valA) && isNaN(valB)) continue; // Se entrambi non sono numeri, passa al criterio successivo
                if (isNaN(valA)) return dir; // Sposta i non-numeri alla fine (o all'inizio se decrescente)
                if (isNaN(valB)) return -dir;
            }

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            // Se sono uguali, passa al criterio successivo
        }
        return 0; // Se tutti i criteri sono uguali
    });
}

function handleSort(event) {
    const target = event.target;
    if (target.tagName !== 'TH' || !target.hasAttribute('data-sort')) {
        return;
    }

    const field = target.getAttribute('data-sort');
    let direction = 'asc';
    let index = sortCriteria.findIndex(c => c.field === field);

    // Se la colonna è già nel criterio di ordinamento
    if (index !== -1) {
        // Se si tiene premuto Shift, si inverte la direzione del criterio esistente
        if (event.shiftKey) {
            direction = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
            sortCriteria[index].direction = direction;
        } else {
            // Se non si tiene premuto Shift e il criterio esiste, lo si inverte e si resettano gli altri
            direction = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
            sortCriteria = [{field, direction}];
        }
    } else {
        // Se non si tiene premuto Shift, si resetta e si aggiunge solo il nuovo criterio
        if (!event.shiftKey) {
            sortCriteria = [];
        }
        // Aggiunge il nuovo criterio in fondo
        sortCriteria.push({field, direction});
    }

    // Aggiorna gli indicatori visivi di ordinamento
    document.querySelectorAll('#risultati-tabella th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    sortCriteria.forEach(c => {
        const th = document.querySelector(`#risultati-tabella th[data-sort="${c.field}"]`);
        th.classList.add(`sorted-${c.direction}`);
    });

    // Ricarica i dati con il nuovo ordinamento
    caricaSolventi();
}

async function caricaSolventi() {
    const query = getQueryString();
    const endpoint = query ? `${API_URL}?${query}` : API_URL; 
    
    const tbody = document.getElementById('tabella-corpo');
    const countElement = document.getElementById('risultati-count');
    
    tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}">Loading...</td></tr>`;
    countElement.textContent = 'Searching...';

    try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
             throw new Error(`API unreachable or HTTP error ${response.status}`);
        }
        
        const data = await response.json(); 

        tbody.innerHTML = '';
        
        if (data.error) {
             tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: red;">API Error: ${data.details || data.error}</td></tr>`;
             countElement.textContent = 'API Error';
             return;
        }
        
        // 2. Applicazione dell'ordinamento multi-livello
        const sortedData = multiSort(data);

        countElement.textContent = `Found ${sortedData.length} solvents.`;

        if (sortedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}">No solvents found matching the selected filters.</td></tr>`;
        } else {
            sortedData.forEach(solvente => {
                const row = tbody.insertRow();
                
                // --- INSERIMENTO DATI (14 COLONNE) ---
                
                // 1. Name
                row.insertCell().textContent = solvente.iupac_name || '-';
                
                // 2. CAS
                row.insertCell().textContent = solvente.cas || '-';

                // *** CAMPI NUMERICI CON PARSEFLOAT E !ISNAN ***
                
                // Funzione helper per formattare i numeri in modo coerente
                const formatNumber = (value, decimals) => {
                    const num = parseFloat(value);
                    return !isNaN(num) ? num.toFixed(decimals) : '-';
                };

                // 3. Boiling Point (°C)
                row.insertCell().textContent = formatNumber(solvente.boiling_point, 1);
                
                // 4. Density (g/cm³)
                row.insertCell().textContent = formatNumber(solvente.density, 3);
                
                // 5. Dielectric Constant
                row.insertCell().textContent = formatNumber(solvente.dielectric_constant, 1);
                
                // 6. Water Miscibility (String field)
                row.insertCell().textContent = solvente.water_miscibility || '-'; 
                
                // 7. Alpha (α)
                row.insertCell().textContent = formatNumber(solvente.alpha, 2); 
                
                // 8. Beta (β)
                row.insertCell().textContent = formatNumber(solvente.beta, 2);

                // 9. Pi Star (π*)
                row.insertCell().textContent = formatNumber(solvente.pistar, 2);
                
                // *** STRING FIELDS ***
                
                // 10. H Phrases
                row.insertCell().textContent = solvente.h_phrases || '-';
                
                // 11. Oxidation Resistant
                row.insertCell().textContent = solvente.oxidation_resistance || '-';
                
                // 12. Reduction Resistant
                row.insertCell().textContent = solvente.reduction_resistance || '-';
                
                // 13. Acid Resistant
                row.insertCell().textContent = solvente.acid_resistance || '-';
                
                // 14. Basic Resistant
                row.insertCell().textContent = solvente.basic_resistance || '-';
                
                // --- FINE INSERIMENTO DATI ---
            });
        }
    } catch (error) {
        // Catch network, deploy, or failed connection errors
        console.error('Error loading data from Worker:', error);
        tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: red;">Error loading data: ${error.message || 'API unreachable.'}</td></tr>`;
        countElement.textContent = 'Network Error';
    }
}

function resetFiltri() {
    // Reset all input fields
    document.getElementById('search').value = '';
    document.getElementById('water_miscibility').value = ''; // ID aggiornato
    document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';
    sortCriteria = []; // Reset dell'ordinamento
    
    // Rimuove le classi di ordinamento dai TH (opzionale, richiede CSS)
    document.querySelectorAll('#risultati-tabella th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    caricaSolventi();
}