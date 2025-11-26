// URL del tuo Cloudflare Worker
const API_URL = "https://api-worker.davide-frigatti.workers.dev/solvents"; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Toggle Filtri KT
    const btnToggle = document.getElementById('toggle-kt-filters');
    const divKT = document.getElementById('kt-slider-filters');
    
    btnToggle.addEventListener('click', () => {
        divKT.classList.toggle('hidden');
    });

    // 2. Setup Sliders
    setupSlider('alpha-group', 100); 
    setupSlider('beta-group', 100); 
    setupSlider('pistar-group', 100);

    // 3. LOGICA REAL-TIME (DEBOUNCE)
    // Creiamo una versione "ritardata" della funzione di ricerca
    // Aspetta 300ms dopo l'ultima azione prima di cercare
    const searchRealTime = debounce(fetchSolvents, 400);

    // 4. Collegamento Eventi a TUTTI gli input
    
    // Campi di testo e numeri (cerca mentre digiti)
    const textInputs = document.querySelectorAll('#search, #min_bp, #max_bp');
    textInputs.forEach(input => {
        input.addEventListener('input', searchRealTime);
    });

    // Menu a tendina (cerca appena cambi opzione)
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', fetchSolvents); // Qui non serve debounce, è un click singolo
    });

    // Sliders (cerca mentre trascini, ma col ritardo debounce)
    const sliders = document.querySelectorAll('.kt-min-slider, .kt-max-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', searchRealTime);
    });

    // Tasto Reset
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // (Opzionale) Manteniamo il tasto Apply se uno vuole forzare, ma non è più strettamente necessario
    const applyBtn = document.getElementById('apply-filters');
    if(applyBtn) applyBtn.addEventListener('click', fetchSolvents);

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
    
    // Mettiamo un'icona o testo di caricamento discreto per non disturbare la vista
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

    // Dati Sliders
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
        
        // Helper per visualizzare 0 invece di -
        const show = (val) => (val !== null && val !== undefined && val !== "") ? val : '-';

        data.forEach(solvent => {
            const tr = document.createElement('tr');
            
            // Helper visuale
            const show = (val) => (val !== null && val !== undefined && val !== "") ? val : '-';

            tr.innerHTML = `
                <td><b>${solvent.iupac_name}</b></td>
                <td>${solvent.cas}</td>
                <td>${show(solvent.boiling_point)}</td>
                <td>${show(solvent.density)}</td>
                <td>${solvent.dielectric_constant || '-'}</td>
                <td>${solvent.water_miscibility || '-'}</td>
                <td>${show(solvent.alpha)}</td>
                <td>${show(solvent.beta)}</td>
                <td>${show(solvent.pistar)}</td>
                
                <td style="font-size: 0.85em;">${show(solvent.h_phrases)}</td>
                <td>${show(solvent.oxidation_resistance)}</td>
                <td>${show(solvent.reduction_resistance)}</td>
                <td>${show(solvent.acid_resistance)}</td>
                <td>${show(solvent.basic_resistance)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        countEl.innerText = "Error loading data.";
    }
}

function resetFilters() {
    // ... (altri reset) ...
    
    // AGGIORNATO: I minimi devono corrispondere all'HTML
    // Alpha: 0 a 120
    resetSliderGroup('alpha-group', 0, 120); 
    // Beta: -20 a 100
    resetSliderGroup('beta-group', -20, 100); 
    // PiStar: -50 a 150
    resetSliderGroup('pistar-group', -50, 150); 
    
    fetchSolvents();
}

function resetSliderGroup(id, min, max) {
    const group = document.getElementById(id);
    const minS = group.querySelector('.kt-min-slider');
    const maxS = group.querySelector('.kt-max-slider');
    minS.value = min;
    maxS.value = max;
    minS.dispatchEvent(new Event('input'));
}