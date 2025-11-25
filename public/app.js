// public/app.js (o app_finale.js)

// !!! IMPORTANTE: DEVI USARE IL TUO URL DI DEPLOY !!!
const API_URL = 'https://api-worker.davide-frigatti.workers.dev/solvents'; 
const TOTAL_COLUMNS = 14; 
// Array per memorizzare i criteri di ordinamento
let sortCriteria = []; 

// Array per definire i parametri Kamlet-Taft e i loro range
const KT_SLIDER_PARAMS = ['alpha', 'beta', 'pistar'];

document.addEventListener('DOMContentLoaded', () => {
    caricaSolventi();
    // Aggiunge i listener per l'ordinamento
    document.getElementById('risultati-tabella').addEventListener('click', handleSort);
    // NUOVO: Inizializza gli slider Kamlet-Taft
    setupKTSliders();
});

// --- NUOVE FUNZIONI PER I FILTRI SLIDER ---

// Funzione helper per mappare il valore dello slider (da int 0-120 a float 0.00-1.20)
function mapSliderValue(sliderValue) {
    // La scala è stata impostata moltiplicando per 100 per gestire i decimali
    return (parseFloat(sliderValue) / 100).toFixed(2);
}

// Funzione per aggiornare la visualizzazione del range sulla UI e chiamare la ricerca
function updateSliderDisplayAndFilter(param) {
    const minSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-min-slider`);
    const maxSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-max-slider`);
    const display = document.getElementById(`${param}-range-display`);
    
    if (minSlider && maxSlider) {
        // Forza min <= max per evitare inversione dei thumb
        if (parseInt(minSlider.value) > parseInt(maxSlider.value)) {
            minSlider.value = maxSlider.value;
        }

        const minVal = mapSliderValue(minSlider.value);
        const maxVal = mapSliderValue(maxSlider.value);
        
        display.textContent = `${minVal} - ${maxVal}`;
        caricaSolventi(); // Chiama la ricerca ad ogni rilascio/cambio
    }
}

// Inizializzazione dei listener per gli slider
function setupKTSliders() {
    KT_SLIDER_PARAMS.forEach(param => {
        const group = document.querySelector(`.kt-slider-group[data-param="${param}"]`);
        
        if (group) {
            group.querySelectorAll('input[type="range"]').forEach(slider => {
                // 'input' per aggiornare il display in tempo reale
                slider.addEventListener('input', () => {
                    updateSliderDisplayAndFilter(param);
                });
                
                // 'mouseup' o 'touchend' per chiamare la ricerca quando l'utente finisce di trascinare
                slider.addEventListener('mouseup', caricaSolventi);
                slider.addEventListener('touchend', caricaSolventi);
            });
            
            // Inizializza la visualizzazione al caricamento
            updateSliderDisplayAndFilter(param);
        }
    });
}


function getQueryString() {
    // Raccoglie i valori dei filtri standard
    const search = document.getElementById('search').value;
    const waterMiscibility = document.getElementById('water_miscibility').value; 
    const categoria = document.getElementById('categoria').value;
    const min_bp = document.getElementById('min_bp').value;
    const max_bp = document.getElementById('max_bp').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    if (waterMiscibility) {
        params.append('water_miscibility', waterMiscibility.toLowerCase()); 
    }
    
    if (categoria) params.append('categoria', categoria);
    if (min_bp) params.append('min_bp', min_bp);
    if (max_bp) params.append('max_bp', max_bp);

    // --- NUOVI FILTRI SLIDER KT ---
    KT_SLIDER_PARAMS.forEach(param => {
        const minSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-min-slider`);
        const maxSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-max-slider`);

        if (minSlider && maxSlider) {
            const minVal = mapSliderValue(minSlider.value);
            const maxVal = mapSliderValue(maxSlider.value);
            
            // Invia il range all'API
            params.append(`min_${param}`, minVal);
            params.append(`max_${param}`, maxVal);
        }
    });

    return params.toString(); 
}

// Funzione di ordinamento multi-livello (MANTENUTA per il sort manuale delle colonne)
function multiSort(data) {
    if (sortCriteria.length === 0) {
        return data;
    }

    return data.sort((a, b) => {
        for (let i = 0; i < sortCriteria.length; i++) {
            const criterion = sortCriteria[i];
            const field = criterion.field;
            const dir = criterion.direction === 'asc' ? 1 : -1;
            
            const isLastCriterion = (i === sortCriteria.length - 1);

            // 1. GESTIONE CAMPI NUMERICI
            if (['boiling_point', 'density', 'dielectric_constant', 'alpha', 'beta', 'pistar'].includes(field)) {
                
                // Gestione null/vuoti
                const valA_raw = a[field];
                const valB_raw = b[field];
                
                const isBlank = (val) => val === null || val === undefined || val === '' || val === '-';
                const aBlank = isBlank(valA_raw);
                const bBlank = isBlank(valB_raw);

                if (aBlank && bBlank) continue; 
                if (aBlank) return 1; 
                if (bBlank) return -1;
                
                let valA = parseFloat(valA_raw);
                let valB = parseFloat(valB_raw);

                // Trucco per il multi-level sort (Arrotondamento a 0 cifre)
                if (!isLastCriterion && ['alpha', 'beta', 'pistar'].includes(field)) {
                    const roundedA = Number(valA.toFixed(0)); 
                    const roundedB = Number(valB.toFixed(0));
                    
                    if (roundedA < roundedB) return -1 * dir;
                    if (roundedA > roundedB) return 1 * dir;
                } else {
                    // Confronto preciso
                    if (valA < valB) return -1 * dir;
                    if (valA > valB) return 1 * dir;
                }

            } else { 
                // 2. GESTIONE CAMPI STRINGA
                let sA = String(a[field] || '').toLowerCase();
                let sB = String(b[field] || '').toLowerCase();
                
                if (sA < sB) return -1 * dir;
                if (sA > sB) return 1 * dir;
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
    
    // Logica di gestione del sort (Shift+Click per concatenare, Click singolo per resettare)
    if (index !== -1) {
        if (event.shiftKey) {
            sortCriteria[index].direction = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
        } else {
            const newDirection = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
            sortCriteria = [{field, direction: newDirection}];
        }
    } 
    else {
        if (!event.shiftKey) {
            sortCriteria = [];
        }
        sortCriteria.push({field, direction: 'asc'}); 
    }

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
                
                const formatNumber = (value, decimals) => {
                    const num = parseFloat(value);
                    return !isNaN(num) ? num.toFixed(decimals) : '-';
                };

                // Inserimento dei dati nelle 14 colonne
                row.insertCell().textContent = solvente.iupac_name || '-';
                row.insertCell().textContent = solvente.cas || '-';
                row.insertCell().textContent = formatNumber(solvente.boiling_point, 1);
                row.insertCell().textContent = formatNumber(solvente.density, 3);
                row.insertCell().textContent = formatNumber(solvente.dielectric_constant, 1);
                row.insertCell().textContent = solvente.water_miscibility || '-'; 
                row.insertCell().textContent = formatNumber(solvente.alpha, 2); 
                row.insertCell().textContent = formatNumber(solvente.beta, 2);
                row.insertCell().textContent = formatNumber(solvente.pistar, 2);
                row.insertCell().textContent = solvente.h_phrases || '-';
                row.insertCell().textContent = solvente.oxidation_resistance || '-';
                row.insertCell().textContent = solvente.reduction_resistance || '-';
                row.insertCell().textContent = solvente.acid_resistance || '-';
                row.insertCell().textContent = solvente.basic_resistance || '-';
            });
        }
    } catch (error) {
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
        if (th) { 
            th.classList.add(`sorted-${c.direction}`);
            th.setAttribute('data-sort-order', i + 1); 
        }
    });
}

function resetFiltri() {
    // Reset standard input fields
    document.getElementById('search').value = '';
    document.getElementById('water_miscibility').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';
    
    // Reset degli slider Kamlet-Taft
    KT_SLIDER_PARAMS.forEach(param => {
        const minSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-min-slider`);
        const maxSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-max-slider`);
        
        if (minSlider && maxSlider) {
            // Usa min e max definiti nell'HTML per resettare al range completo
            minSlider.value = minSlider.getAttribute('min');
            maxSlider.value = maxSlider.getAttribute('max');
            updateSliderDisplayAndFilter(param); // Aggiorna il display e ricarica i solventi
        }
    });

    sortCriteria = []; // Reset dell'ordinamento manuale
    updateSortVisuals();
    caricaSolventi();
}

// !!! Le vecchie funzioni Kamlet-Taft (toggleKamletTaftFilters, applyKamletTaftSort, resetKamletTaftSort) sono state rimosse !!!