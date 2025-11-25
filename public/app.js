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

// Funzione di ordinamento multi-livello AGGIORNATA
function multiSort(data) {
    if (sortCriteria.length === 0) {
        return data;
    }

    return data.sort((a, b) => {
        for (const criterion of sortCriteria) {
            const field = criterion.field;
            const dir = criterion.direction === 'asc' ? 1 : -1;

            // 1. GESTIONE CAMPI NUMERICI
            if (['boiling_point', 'density', 'dielectric_constant', 'alpha', 'beta', 'pistar'].includes(field)) {
                
                // Funzione helper per controllare se il valore è nullo/vuoto
                const isBlank = (val) => val === null || val === undefined || val === '' || val === '-';

                const aBlank = isBlank(a[field]);
                const bBlank = isBlank(b[field]);

                // Se entrambi sono vuoti, sono uguali per questo criterio
                if (aBlank && bBlank) continue;
                
                // Manda sempre i valori vuoti in fondo (indipendentemente se asc o desc)
                // Se vuoi che in 'desc' i vuoti stiano in alto, rimuovi il controllo fisso, 
                // ma di standard i dati mancanti vanno in fondo.
                if (aBlank) return 1; 
                if (bBlank) return -1;
                
                // Conversione sicura a numero
                let valA = parseFloat(a[field]);
                let valB = parseFloat(b[field]);

                // Confronto numerico
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;

            } else { 
                // 2. GESTIONE CAMPI STRINGA
                let valA = String(a[field] || '').toLowerCase();
                let valB = String(b[field] || '').toLowerCase();
                
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
            }
        }
        return 0;
    });
}

function handleSort(event) {
    const target = event.target;
    if (target.tagName !== 'TH' || !target.hasAttribute('data-sort')) {
        return;
    }

    const field = target.getAttribute('data-sort');
    let index = sortCriteria.findIndex(c => c.field === field);
    
    // 1. Caso: Colonna già in sortCriteria
    if (index !== -1) {
        // Shift premuto: inverte solo la direzione del criterio esistente (mantenendo gli altri)
        if (event.shiftKey) {
            sortCriteria[index].direction = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Shift NON premuto: resetta e imposta il singolo criterio invertendo la direzione esistente
            const newDirection = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
            sortCriteria = [{field, direction: newDirection}];
        }
    } 
    // 2. Caso: Nuova colonna
    else {
        // Shift NON premuto: resetta e imposta il nuovo criterio (default 'asc')
        if (!event.shiftKey) {
            sortCriteria = [];
        }
        // Aggiunge il nuovo criterio (default 'asc')
        sortCriteria.push({field, direction: 'asc'}); 
    }

    // Aggiorna gli indicatori visivi e ricarica i dati
    updateSortVisuals();
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
             // L'errore 500 verrà catturato qui
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
                
                // Funzione helper per formattare i numeri in modo coerente
                const formatNumber = (value, decimals) => {
                    const num = parseFloat(value);
                    return !isNaN(num) ? num.toFixed(decimals) : '-';
                };

                // 1. Name
                row.insertCell().textContent = solvente.iupac_name || '-';
                // 2. CAS
                row.insertCell().textContent = solvente.cas || '-';
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
                row.insertCell().textContent = formatNumber(solvente.pistar, 2); // Usa .pistar
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
            });
        }
    } catch (error) {
        // Catch network, deploy, or failed connection errors
        console.error('Error loading data from Worker:', error);
        tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: red;">Error loading data: ${error.message || 'API unreachable.'}</td></tr>`;
        countElement.textContent = 'Network Error';
    }
}

// Funzione helper per aggiornare gli indicatori visivi di ordinamento
function updateSortVisuals() {
    document.querySelectorAll('#risultati-tabella th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.removeAttribute('data-sort-order'); 
    });

    sortCriteria.forEach((c, i) => {
        const th = document.querySelector(`#risultati-tabella th[data-sort="${c.field}"]`);
        if (th) { // Controllo se il TH esiste
            th.classList.add(`sorted-${c.direction}`);
            th.setAttribute('data-sort-order', i + 1); 
        }
    });
}

function resetFiltri() {
    // Reset all input fields
    document.getElementById('search').value = '';
    document.getElementById('water_miscibility').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';
    sortCriteria = []; // Reset dell'ordinamento
    
    // Reset Kamlet-Taft selects
    document.getElementById('kt_alpha_dir').value = '';
    document.getElementById('kt_beta_dir').value = '';
    document.getElementById('kt_pistar_dir').value = '';
    
    updateSortVisuals();
    caricaSolventi();
}

// =======================================================
// --- NUOVE FUNZIONI PER I FILTRI KAMLET-TAFT ---
// =======================================================

function toggleKamletTaftFilters() {
    const ktFilters = document.getElementById('kamlet-taft-filters');
    ktFilters.classList.toggle('hidden-filters');
    
    // Sincronizza l'interfaccia con il sortCriteria corrente, se visibile
    if (!ktFilters.classList.contains('hidden-filters')) {
        // Resetta tutti i selettori Kamlet-Taft
        document.getElementById('kt_alpha_dir').value = '';
        document.getElementById('kt_beta_dir').value = '';
        document.getElementById('kt_pistar_dir').value = '';

        // Pre-popola i selettori in base a sortCriteria (solo se sono Kamlet-Taft)
        sortCriteria.forEach(c => {
            if (['alpha', 'beta', 'pistar'].includes(c.field)) {
                const selectElement = document.getElementById(`kt_${c.field}_dir`);
                if (selectElement) {
                    selectElement.value = c.direction;
                }
            }
        });
    }
}


function applyKamletTaftSort() {
    const ktCriteria = [];
    
    // Raccoglie i criteri (l'ordine è dato dall'ordine in cui li pushiamo: alpha, beta, pistar)
    const alphaDir = document.getElementById('kt_alpha_dir').value;
    if (alphaDir) ktCriteria.push({field: 'alpha', direction: alphaDir});
    
    const betaDir = document.getElementById('kt_beta_dir').value;
    if (betaDir) ktCriteria.push({field: 'beta', direction: betaDir});

    const piStarDir = document.getElementById('kt_pistar_dir').value;
    if (piStarDir) ktCriteria.push({field: 'pistar', direction: piStarDir});

    // Imposta il sortCriteria globale con solo i parametri Kamlet-Taft selezionati
    sortCriteria = ktCriteria;
    
    // Aggiorna gli indicatori visivi e ricarica i dati
    updateSortVisuals();
    caricaSolventi();
}

function resetKamletTaftSort() {
    // Resetta solo i selettori KT
    document.getElementById('kt_alpha_dir').value = '';
    document.getElementById('kt_beta_dir').value = '';
    document.getElementById('kt_pistar_dir').value = '';
    
    // Rimuove i criteri KT dal sortCriteria generale
    sortCriteria = sortCriteria.filter(c => !['alpha', 'beta', 'pistar'].includes(c.field));
    
    // Se non ci sono altri criteri, resetta l'array
    if (sortCriteria.length === 0) {
        sortCriteria = [];
    }

    // Aggiorna gli indicatori visivi e ricarica i dati
    updateSortVisuals();
    caricaSolventi();
}