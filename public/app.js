// public/app.js (o app_finale.js) - Versione Ottimizzata e Corretta

// !!! IMPORTANTE: DEVI USARE IL TUO URL DI DEPLOY !!!
const API_URL = 'https://api-worker.davide-frigatti.workers.dev/solvents'; 
const TOTAL_COLUMNS = 14; 

// Array per memorizzare i criteri di ordinamento
let sortCriteria = []; 

// Array per definire i parametri Kamlet-Taft e i loro range
const KT_SLIDER_PARAMS = ['alpha', 'beta', 'pistar'];

document.addEventListener('DOMContentLoaded', () => {
    caricaSolventi();
    
    // --- Listener per Eventi Globali ---
    document.getElementById('risultati-tabella').addEventListener('click', handleSort);
    setupKTSliders();

    // Listener per i filtri standard non-slider (ricerca istantanea o on change)
    document.getElementById('search').addEventListener('input', caricaSolventi);
    document.getElementById('water_miscibility').addEventListener('change', caricaSolventi);
    document.getElementById('categoria').addEventListener('change', caricaSolventi);
    
    // Listener on blur/change per i campi min/max BP
    document.getElementById('min_bp').addEventListener('blur', caricaSolventi);
    document.getElementById('max_bp').addEventListener('blur', caricaSolventi);
    document.getElementById('min_bp').addEventListener('change', caricaSolventi);
    document.getElementById('max_bp').addEventListener('change', caricaSolventi);

    // Listener per il pulsante 'Mostra Filtri KT' (toggle)
    const toggleButton = document.getElementById('toggle-kt-filters');
    if (toggleButton) {
        // Quando il selettore viene nascosto, i suoi filtri NON vengono inviati all'API, 
        // e la ricarica è gestita dal click che esegue il toggle.
        toggleButton.addEventListener('click', () => {
            toggleKTSliders();
            caricaSolventi(); // Ricarica dopo il toggle
        });
    }
    
    // Listener per il pulsante 'Reset Filtri'
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFiltri);
    }

    // Rimuovi l'handler obsoleto sul pulsante "Apply Filters" e usa gli handler specifici
    // document.getElementById('apply-filters').addEventListener('click', caricaSolventi); 
    // Manteniamo solo la ricarica implicita dai singoli filtri.

});

// -----------------------------------------------------------------
// FUNZIONI PER I FILTRI SLIDER (KAMLET-TAFT) 🔬
// -----------------------------------------------------------------

/**
 * Funzione per mostrare/nascondere il blocco Kamlet-Taft.
 */
function toggleKTSliders() {
    const ktFiltersDiv = document.getElementById('kt-slider-filters');
    if (ktFiltersDiv) {
        ktFiltersDiv.classList.toggle('hidden');
    }
}


/**
 * Funzione helper per mappare il valore intero dello slider a float (due decimali).
 * @param {string | number} sliderValue - Valore dello slider (es. 120 per 1.20).
 * @returns {string} Il valore float formattato a due decimali (es. "1.20").
 */
function mapSliderValue(sliderValue) {
    // La scala è stata impostata moltiplicando per 100 per gestire i decimali
    return (parseFloat(sliderValue) / 100).toFixed(2);
}

/**
 * Gestisce l'aggiornamento visivo (riempimento e display) per gli slider a doppio manico.
 * Include la logica per impedire l'inversione di min e max.
 * @param {string} param - Il nome del parametro KT ('alpha', 'beta', 'pistar').
 */
function updateSliderDisplayAndFilter(param) {
    const group = document.querySelector(`.kt-slider-group[data-param="${param}"]`);
    const minSlider = group.querySelector('.kt-min-slider');
    const maxSlider = group.querySelector('.kt-max-slider');
    const fill = group.querySelector('.range-fill');
    const display = document.getElementById(`${param}-range-display`);
    
    if (minSlider && maxSlider) {
        let minValue = parseInt(minSlider.value);
        let maxValue = parseInt(maxSlider.value);
        
        // --- LOGICA DI SICUREZZA ANTI-INVERSIONE (Corretta e pulita) ---
        if (minValue > maxValue) {
            // Se min ha superato max, forza il manico in movimento ad eguagliare l'altro
            const focusedSlider = document.activeElement; 
            
            if (focusedSlider === minSlider) {
                maxSlider.value = minValue;
                maxValue = minValue;
            } else if (focusedSlider === maxSlider) {
                minSlider.value = maxValue;
                minValue = maxValue;
            }
            // Se nessun manico è attivo (raro), usiamo Math.min per evitare incroci
            else {
                 minSlider.value = Math.min(minValue, maxValue);
                 maxSlider.value = Math.max(minValue, maxValue);
                 minValue = parseInt(minSlider.value);
                 maxValue = parseInt(maxSlider.value);
            }
        }
        
        // --- LOGICA DI RIEMPIMENTO (Corretta) ---
        const minAttr = parseInt(minSlider.getAttribute('min'));
        const maxAttr = parseInt(minSlider.getAttribute('max'));
        const range = maxAttr - minAttr;
        
        // Calcola la posizione percentuale di inizio e fine
        const percentMin = ((minValue - minAttr) / range) * 100;
        const percentMax = ((maxValue - minAttr) / range) * 100;

        // Applica stili per il riempimento dinamico
        if (fill) {
            fill.style.left = percentMin + '%';
            fill.style.width = (percentMax - percentMin) + '%';
        }
        // ------------------------------------

        const minVal = mapSliderValue(minValue);
        const maxVal = mapSliderValue(maxValue);
        
        display.textContent = `${minVal} - ${maxVal}`;
    }
}

/**
 * Inizializza i listener per tutti gli slider Kamlet-Taft.
 */
function setupKTSliders() {
    KT_SLIDER_PARAMS.forEach(param => {
        const group = document.querySelector(`.kt-slider-group[data-param="${param}"]`);
        
        if (group) {
            group.querySelectorAll('input[type="range"]').forEach(slider => {
                // 'input' per aggiornare il display in tempo reale (mentre si trascina)
                slider.addEventListener('input', () => {
                    updateSliderDisplayAndFilter(param);
                });
                
                // 'mouseup' o 'touchend' per chiamare la ricerca solo quando l'utente finisce di trascinare
                slider.addEventListener('mouseup', caricaSolventi);
                slider.addEventListener('touchend', caricaSolventi);
            });
            
            // Inizializza la visualizzazione e il riempimento al caricamento 
            updateSliderDisplayAndFilter(param);
        }
    });
}

// -----------------------------------------------------------------
// FUNZIONI DI FILTRAGGIO E API CALL 🌐
// -----------------------------------------------------------------

/**
 * Raccoglie i valori di tutti i filtri (standard e Kamlet-Taft) e li converte in una stringa di query URL.
 * @returns {string} La stringa di query URL (es. "search=acetone&min_alpha=0.20").
 */
function getQueryString() {
    // Raccoglie i valori dei filtri standard
    const search = document.getElementById('search').value;
    const waterMiscibility = document.getElementById('water_miscibility').value; 
    const categoria = document.getElementById('categoria').value;
    const min_bp = document.getElementById('min_bp').value;
    const max_bp = document.getElementById('max_bp').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    // Utilizza 'lower' per coerenza con la tua API (se non gestisce i CamelCase)
    if (waterMiscibility) {
        params.append('water_miscibility', waterMiscibility.toLowerCase()); 
    }
    
    if (categoria) params.append('categoria', categoria);
    if (min_bp) params.append('min_bp', min_bp);
    if (max_bp) params.append('max_bp', max_bp);

    // --- FILTRI SLIDER KT (Corretto: raccogli solo se il blocco è visibile) ---
    const ktFiltersDiv = document.getElementById('kt-slider-filters');
    if (ktFiltersDiv && !ktFiltersDiv.classList.contains('hidden')) { 
        KT_SLIDER_PARAMS.forEach(param => {
            const minSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-min-slider`);
            const maxSlider = document.querySelector(`.kt-slider-group[data-param="${param}"] .kt-max-slider`);

            if (minSlider && maxSlider) {
                // mapSliderValue usa il valore corrente del DOM e lo formatta
                const minVal = mapSliderValue(minSlider.value);
                const maxVal = mapSliderValue(maxSlider.value);
                
                // Invia il range all'API
                params.append(`min_${param}`, minVal);
                params.append(`max_${param}`, maxVal);
            }
        });
    }
    // NOTA: Se il blocco è nascosto, i filtri KT non vengono inviati, quindi l'API utilizza il range di default (completo).

    return params.toString(); 
}

/**
 * Funzione principale per caricare e visualizzare i solventi.
 */
async function caricaSolventi() {
    const query = getQueryString();
    const endpoint = query ? `${API_URL}?${query}` : API_URL; 
    
    const tbody = document.getElementById('tabella-corpo');
    const countElement = document.getElementById('risultati-count');
    
    // Stato di caricamento
    tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="text-align: center;">Loading...</td></tr>`;
    countElement.textContent = 'Searching...';

    try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`API unreachable or HTTP error ${response.status}`);
        }
        
        const data = await response.json(); 

        tbody.innerHTML = '';
        
        if (data.error) {
            tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: #FF6B6B;">API Error: ${data.details || data.error}</td></tr>`;
            countElement.textContent = 'API Error';
            return;
        }
        
        // 2. Applicazione dell'ordinamento multi-livello
        const sortedData = multiSort(data);

        countElement.textContent = `Found ${sortedData.length} solvents.`;

        // 3. Render della tabella
        if (sortedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="text-align: center;">No solvents found matching the selected filters.</td></tr>`;
        } else {
            const fragment = document.createDocumentFragment();
            
            sortedData.forEach(solvente => {
                const row = document.createElement('tr');
                
                const formatNumber = (value, decimals) => {
                    const num = parseFloat(value);
                    return !isNaN(num) ? num.toFixed(decimals) : '-';
                };

                // Inserimento dei dati nelle 14 colonne (ottimizzato con un array per chiarezza)
                const fields = [
                    'iupac_name', 'cas', 'boiling_point', 'density', 'dielectric_constant', 
                    'water_miscibility', 'alpha', 'beta', 'pistar', 'h_phrases', 
                    'oxidation_resistance', 'reduction_resistance', 'acid_resistance', 'basic_resistance'
                ];
                
                fields.forEach(field => {
                    const cell = document.createElement('td');
                    if (['boiling_point', 'dielectric_constant', 'density'].includes(field)) {
                        cell.textContent = formatNumber(solvente[field], field === 'density' ? 3 : 1);
                    } else if (['alpha', 'beta', 'pistar'].includes(field)) {
                        cell.textContent = formatNumber(solvente[field], 2);
                    } else {
                        cell.textContent = solvente[field] || '-';
                    }
                    row.appendChild(cell);
                });
                
                fragment.appendChild(row);
            });
            tbody.appendChild(fragment);
        }
    } catch (error) {
        console.error('Error loading data from Worker:', error);
        tbody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="color: #FF6B6B;">Error loading data: ${error.message || 'API unreachable.'}</td></tr>`;
        countElement.textContent = 'Network Error';
    }
}

// -----------------------------------------------------------------
// FUNZIONI DI ORDINAMENTO (SORT) ⬇️⬆️
// -----------------------------------------------------------------

// Funzione di ordinamento multi-livello (MANTENUTA - CORRETTA)
function multiSort(data) {
    if (sortCriteria.length === 0) {
        return data;
    }

    return data.sort((a, b) => {
        for (let i = 0; i < sortCriteria.length; i++) {
            const criterion = sortCriteria[i];
            const field = criterion.field;
            const dir = criterion.direction === 'asc' ? 1 : -1;
            
            // Definizioni per la gestione dei valori mancanti/nulli
            const isBlank = (val) => val === null || val === undefined || val === '' || val === '-';
            
            // 1. GESTIONE CAMPI NUMERICI
            if (['boiling_point', 'density', 'dielectric_constant', 'alpha', 'beta', 'pistar'].includes(field)) {
                
                const valA_raw = a[field];
                const valB_raw = b[field];
                const aBlank = isBlank(valA_raw);
                const bBlank = isBlank(valB_raw);

                // Regola: i valori mancanti vanno sempre in fondo
                if (aBlank && bBlank) continue; 
                if (aBlank) return 1; 
                if (bBlank) return -1;
                
                let valA = parseFloat(valA_raw);
                let valB = parseFloat(valB_raw);

                // Confronto preciso
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;

            } else { 
                // 2. GESTIONE CAMPI STRINGA
                let sA = String(a[field] || '').toLowerCase();
                let sB = String(b[field] || '').toLowerCase();
                
                if (sA < sB) return -1 * dir;
                if (sA > sB) return 1 * dir;
            }
        }
        return 0; // I valori sono uguali (o tutti i criteri sono stati esauriti)
    });
}

// Funzione per gestire il click sull'intestazione della tabella (Sort)
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
            // Se già presente, cambia la direzione (ASC -> DESC o viceversa)
            sortCriteria[index].direction = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Click singolo: resetta e ordina solo per questo campo, mantenendo la direzione
            const newDirection = sortCriteria[index].direction === 'asc' ? 'desc' : 'asc';
            sortCriteria = [{field, direction: newDirection}];
        }
    } 
    else {
        if (!event.shiftKey) {
            // Click singolo su un nuovo campo: resetta i precedenti
            sortCriteria = [];
        }
        // Aggiunge il nuovo campo in direzione ASC
        sortCriteria.push({field, direction: 'asc'}); 
    }

    updateSortVisuals();
    caricaSolventi();
}

// Funzione helper per aggiornare gli indicatori visivi di ordinamento
function updateSortVisuals() {
    // Rimuove tutte le classi di ordinamento e i numeri
    document.querySelectorAll('#risultati-tabella th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.removeAttribute('data-sort-order'); 
    });

    // Applica le classi per l'ordinamento multi-livello
    sortCriteria.forEach((c, i) => {
        const th = document.querySelector(`#risultati-tabella th[data-sort="${c.field}"]`);
        if (th) { 
            th.classList.add(`sorted-${c.direction}`);
            th.setAttribute('data-sort-order', i + 1); // Indica l'ordine di priorità
        }
    });
}

/**
 * Resetta tutti i filtri (standard, BP e KT slider) e ricarica i dati.
 */
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
            updateSliderDisplayAndFilter(param); // Aggiorna il display e il riempimento
        }
    });

    sortCriteria = []; // Reset dell'ordinamento manuale
    updateSortVisuals();
    caricaSolventi();
}