// URL del tuo Cloudflare Worker
const API_URL = "https://api-worker.davide-frigatti.workers.dev/solvents"; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Toggle Filtri KT
    const btnToggle = document.getElementById('toggle-kt-filters');
    const divKT = document.getElementById('kt-slider-filters');
    
    btnToggle.addEventListener('click', () => {
        divKT.classList.toggle('hidden');
    });

    // 2. LOGICA MODAL COMPATIBILITY
    const btnCompat = document.getElementById('toggle-compatibility');
    const modalCompat = document.getElementById('compatibility-modal');
    const btnCloseCompat = document.getElementById('close-compatibility');
    const btnApplyCompat = document.getElementById('apply-compatibility');
    const btnResetCompat = document.getElementById('reset-compatibility'); // NUOVO PULSANTE RESET COMPATIBILITY

    btnCompat.addEventListener('click', () => {
        modalCompat.classList.add('visible');
        modalCompat.classList.remove('hidden');
    });

    btnCloseCompat.addEventListener('click', () => {
        modalCompat.classList.remove('visible');
        modalCompat.classList.add('hidden');
    });

    // Quando l'utente clicca Applica nel modal, chiudi e cerca
    btnApplyCompat.addEventListener('click', () => {
        modalCompat.classList.remove('visible');
        modalCompat.classList.add('hidden');
        fetchSolvents();
    });
    
    // FUNZIONALITÀ RICHIESTA: Reset Compatibility
    btnResetCompat.addEventListener('click', () => { 
        resetCompatibilityFilters(); 
        // Dopo il reset, chiudiamo il modal e aggiorniamo i risultati
        modalCompat.classList.remove('visible');
        modalCompat.classList.add('hidden');
        fetchSolvents();
    });

    // 3. Setup Sliders
    // Nota: Ho corretto i valori max per gli slider qui per coerenza con i min/max di index.html (es. 196 invece di 120)
    setupSlider('alpha-group', 100); 
    setupSlider('beta-group', 100); 
    setupSlider('pistar-group', 100);

    // 4. LOGICA REAL-TIME (DEBOUNCE)
    const searchRealTime = debounce(fetchSolvents, 400);

    // 5. Collegamento Eventi a TUTTI gli input
    
    // Campi di testo e numeri (cerca mentre digiti)
    const textInputs = document.querySelectorAll('#search, #min_bp, #max_bp');
    textInputs.forEach(input => {
        input.addEventListener('input', searchRealTime);
    });

    // Menu a tendina (cerca appena cambi opzione)
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', fetchSolvents); 
    });

    // Sliders (cerca mentre trascini, ma col ritardo debounce)
    const sliders = document.querySelectorAll('.kt-min-slider, .kt-max-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', searchRealTime);
    });

    // Tasto Reset Generale
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Caricamento iniziale
    fetchSolvents();
});

// --- FUNZIONE DEBOUNCE (Evita troppe richieste al server) ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Funzione Logica Slider (Visuale)
function setupSlider(groupId, scaleFactor) {
    const group = document.getElementById(groupId);
    const minSlider = group.querySelector('.kt-min-slider');
    const maxSlider = group.querySelector('.kt-max-slider');
    const display = group.querySelector('.range-display');
    const fill = group.querySelector('.range-fill');

    function update() {
        let val1 = parseInt(minSlider.value);
        let val2 = parseInt(maxSlider.value);

        if (val1 > val2) {
            let tmp = val1;
            minSlider.value = val2;
            maxSlider.value = tmp;
            val1 = val2;
            val2 = tmp;
        }

        const minAttr = parseInt(minSlider.min);
        const maxAttr = parseInt(minSlider.max);
        const range = maxAttr - minAttr;

        const leftPercent = ((val1 - minAttr) / range) * 100;
        const widthPercent = ((val2 - val1) / range) * 100;

        fill.style.left = leftPercent + "%";
        fill.style.width = widthPercent + "%";

        display.innerText = `${(val1 / scaleFactor).toFixed(2)} - ${(val2 / scaleFactor).toFixed(2)}`;
    }

    minSlider.addEventListener('input', update);
    maxSlider.addEventListener('input', update);
    
    update();
}

// Funzione Fetch API
async function fetchSolvents() {
    const countEl = document.getElementById('risultati-count');
    const tbody = document.getElementById('tabella-corpo');
    
    countEl.style.opacity = "0.5"; 

    const params = new URLSearchParams();

    // Raccolta dati dai campi
    const search = document.getElementById('search').value;
    if(search) params.append('search', search);

    const misc = document.getElementById('water_miscibility').value;
    if(misc) params.append('water_miscibility', misc);

    const cat = document.getElementById('categoria').value;
    if(cat) params.append('categoria', cat);

    const minBp = document.getElementById('min_bp').value;
    if(minBp) params.append('min_bp', minBp);
    
    const maxBp = document.getElementById('max_bp').value;
    if(maxBp) params.append('max_bp', maxBp);

    // --- NUOVI FILTRI: Resistenza Chimica (da Modal Checkbox) ---
    document.querySelectorAll('.compat-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            // Se la checkbox è TRUE (l'utente vuole un solvente resistente)
            const paramName = checkbox.getAttribute('data-param');
            // Inviamo il valore 'required' che il worker userà per filtrare High/Medium/Low
            params.append(paramName, 'required'); 
        }
    });

    // Dati Sliders Kamlet-Taft
    // I divisori (100) sono usati per convertire i valori integer degli slider in float (es. 196 -> 1.96)
    const alphaMin = document.querySelector('#alpha-group .kt-min-slider').value;
    const alphaMax = document.querySelector('#alpha-group .kt-max-slider').value;
    params.append('min_alpha', (alphaMin / 100).toFixed(2));
    params.append('max_alpha', (alphaMax / 100).toFixed(2));

    const betaMin = document.querySelector('#beta-group .kt-min-slider').value;
    const betaMax = document.querySelector('#beta-group .kt-max-slider').value;
    params.append('min_beta', (betaMin / 100).toFixed(2));
    params.append('max_beta', (betaMax / 100).toFixed(2));

    const piMin = document.querySelector('#pistar-group .kt-min-slider').value;
    const piMax = document.querySelector('#pistar-group .kt-max-slider').value;
    params.append('min_pistar', (piMin / 100).toFixed(2));
    params.append('max_pistar', (piMax / 100).toFixed(2));

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        if(!response.ok) throw new Error("API Error");
        
        const data = await response.json();
        
        countEl.innerText = `${data.length} solvents found.`;
        countEl.style.opacity = "1"; // Ripristina opacità

        tbody.innerHTML = "";
        
        // Helper per visualizzare '-' invece di valori nulli
        const show = (val) => (val !== null && val !== undefined && val !== "" && val !== 0) ? val : '-';

        data.forEach(solvent => {
            const tr = document.createElement('tr');
            
            // NOTA: Aggiungo le classi "toggle-col c-..." a tutte le celle opzionali
            // Le celle Name e CAS non hanno classi perché sono sempre visibili
            
            tr.innerHTML = `
                <td><b>${solvent.iupac_name}</b></td>
                <td>${solvent.cas}</td>
                
                <td class="toggle-col c-bp">${show(solvent.boiling_point)}</td>
                <td class="toggle-col c-dens">${show(solvent.density)}</td>
                <td class="toggle-col c-diel">${show(solvent.dielectric_constant)}</td>
                <td class="toggle-col c-misc">${solvent.water_miscibility || '-'}</td>
                <td class="toggle-col c-alpha">${show(solvent.alpha)}</td>
                <td class="toggle-col c-beta">${show(solvent.beta)}</td>
                <td class="toggle-col c-pi">${show(solvent.pistar)}</td>
                
                <td class="toggle-col c-h" style="font-size: 0.85em;">${show(solvent.h_phrases)}</td>
                <td class="toggle-col c-ox" style="${solvent.oxidation_resistance === 'yes' ? 'background:#d4edda' : ''}">${show(solvent.oxidation_resistance)}</td>
                <td class="toggle-col c-red">${show(solvent.reduction_resistance)}</td>
                <td class="toggle-col c-acid">${show(solvent.acid_resistance)}</td>
                <td class="toggle-col c-basic">${show(solvent.basic_resistance)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // IMPORTANTE: Dopo aver creato la tabella, dobbiamo ri-applicare la visibilità
        // in base alle checkbox che l'utente ha già selezionato
        applyColumnVisibility();

    } catch (error) {
        console.error(error);
        countEl.innerText = "Error loading data.";
    }
}

// Funzione specifica per resettare le checkbox del modal
function resetCompatibilityFilters() {
    document.querySelectorAll('.compat-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

function resetFilters() {
    // Reset di tutti i campi input di testo/numero/select
    document.getElementById('search').value = '';
    document.getElementById('water_miscibility').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';

    // Reset delle Checkbox di Compatibilità
    resetCompatibilityFilters();

    // Reset Sliders Kamlet-Taft (corretti i valori min/max in base all'HTML fornito)
    resetSliderGroup('alpha-group', -5, 196); 
    resetSliderGroup('beta-group', -8, 143); 
    resetSliderGroup('pistar-group', -41, 121); 
    
    // Esegui la ricerca
    fetchSolvents();
}

function resetSliderGroup(id, min, max) {
    const group = document.getElementById(id);
    const minS = group.querySelector('.kt-min-slider');
    const maxS = group.querySelector('.kt-max-slider');
    minS.value = min;
    maxS.value = max;
    // Attiva l'evento 'input' per aggiornare la visualizzazione del range
    minS.dispatchEvent(new Event('input'));
}
// --- GESTIONE VISIBILITÀ COLONNE ---

// 1. Ascolta i click sulle checkbox delle colonne
document.querySelectorAll('.col-toggle').forEach(toggle => {
    toggle.addEventListener('change', applyColumnVisibility);
});

// 2. Funzione che accende/spegne le colonne
function applyColumnVisibility() {
    // Per ogni checkbox nel menu colonne
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        const targetClass = toggle.getAttribute('data-target'); // es. "c-bp"
        const isVisible = toggle.checked;

        // Seleziona TUTTI gli elementi (th e td) che hanno quella classe
        const cells = document.querySelectorAll(`.${targetClass}`);

        cells.forEach(cell => {
            if (isVisible) {
                cell.classList.add('visible');
            } else {
                cell.classList.remove('visible');
            }
        });
    });
}