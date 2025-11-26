// URL del tuo Cloudflare Worker (SOSTITUISCI CON IL TUO URL REALE)
const API_URL = "https://tuo-worker-url.workers.dev/solvents"; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Gestione Toggle Visualizzazione Filtri KT
    const btnToggle = document.getElementById('toggle-kt-filters');
    const divKT = document.getElementById('kt-slider-filters');
    
    btnToggle.addEventListener('click', () => {
        divKT.classList.toggle('hidden');
    });

    // 2. Inizializzazione Sliders (Doppio Cursore)
    setupSlider('alpha-group', 100);  // Divide per 100 (es. 120 -> 1.20)
    setupSlider('beta-group', 100);   // Divide per 100
    setupSlider('pistar-group', 100); // Divide per 100

    // 3. Caricamento Dati
    document.getElementById('apply-filters').addEventListener('click', fetchSolvents);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);

    // Caricamento iniziale
    fetchSolvents();
});

// Funzione Logica Slider
function setupSlider(groupId, scaleFactor) {
    const group = document.getElementById(groupId);
    const minSlider = group.querySelector('.kt-min-slider');
    const maxSlider = group.querySelector('.kt-max-slider');
    const display = group.querySelector('.range-display');
    const fill = group.querySelector('.range-fill');

    function update() {
        let val1 = parseInt(minSlider.value);
        let val2 = parseInt(maxSlider.value);

        // Impedisce ai cursori di incrociarsi
        if (val1 > val2) {
            let tmp = val1;
            minSlider.value = val2;
            maxSlider.value = tmp;
            val1 = val2;
            val2 = tmp;
        }

        // Calcola visuali
        const minAttr = parseInt(minSlider.min);
        const maxAttr = parseInt(minSlider.max);
        const range = maxAttr - minAttr;

        // Calcolo percentuali per CSS left/width
        const leftPercent = ((val1 - minAttr) / range) * 100;
        const widthPercent = ((val2 - val1) / range) * 100;

        fill.style.left = leftPercent + "%";
        fill.style.width = widthPercent + "%";

        // Aggiorna testo label (con conversione decimali)
        display.innerText = `${(val1 / scaleFactor).toFixed(2)} - ${(val2 / scaleFactor).toFixed(2)}`;
    }

    minSlider.addEventListener('input', update);
    maxSlider.addEventListener('input', update);
    
    // Init
    update();
}

// Funzione Fetch API
async function fetchSolvents() {
    const countEl = document.getElementById('risultati-count');
    const tbody = document.getElementById('tabella-corpo');
    
    countEl.innerText = "Searching...";
    tbody.innerHTML = "";

    // Costruzione URL parametri
    const params = new URLSearchParams();

    // Filtri Standard
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

    // Filtri Kamlet Taft (lettura dai range slider)
    // Nota: Dividiamo per 100 perché gli slider usano interi (es. 120) ma il DB vuole float (1.20)
    
    // Alpha
    const alphaMin = document.querySelector('#alpha-group .kt-min-slider').value;
    const alphaMax = document.querySelector('#alpha-group .kt-max-slider').value;
    params.append('min_alpha', (alphaMin / 100).toFixed(2));
    params.append('max_alpha', (alphaMax / 100).toFixed(2));

    // Beta
    const betaMin = document.querySelector('#beta-group .kt-min-slider').value;
    const betaMax = document.querySelector('#beta-group .kt-max-slider').value;
    params.append('min_beta', (betaMin / 100).toFixed(2));
    params.append('max_beta', (betaMax / 100).toFixed(2));

    // PiStar
    const piMin = document.querySelector('#pistar-group .kt-min-slider').value;
    const piMax = document.querySelector('#pistar-group .kt-max-slider').value;
    params.append('min_pistar', (piMin / 100).toFixed(2));
    params.append('max_pistar', (piMax / 100).toFixed(2));

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        if(!response.ok) throw new Error("API Error");
        
        const data = await response.json();
        
        countEl.innerText = `${data.length} solvents found.`;

        data.forEach(solvent => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${solvent.iupac_name}</b></td>
                <td>${solvent.cas}</td>
                <td>${solvent.boiling_point || '-'}</td>
                <td>${solvent.alpha || '-'}</td>
                <td>${solvent.beta || '-'}</td>
                <td>${solvent.pistar || '-'}</td>
                <td>${solvent.water_miscibility || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        countEl.innerText = "Error loading data.";
    }
}

function resetFilters() {
    document.getElementById('search').value = "";
    document.getElementById('water_miscibility').value = "";
    document.getElementById('categoria').value = "";
    document.getElementById('min_bp').value = "";
    document.getElementById('max_bp').value = "";
    
    // Reset Sliders (Logica manuale)
    resetSliderGroup('alpha-group', 0, 120);
    resetSliderGroup('beta-group', 0, 100);
    resetSliderGroup('pistar-group', -20, 150);
    
    fetchSolvents();
}

function resetSliderGroup(id, min, max) {
    const group = document.getElementById(id);
    const minS = group.querySelector('.kt-min-slider');
    const maxS = group.querySelector('.kt-max-slider');
    minS.value = min;
    maxS.value = max;
    // Trigger evento per aggiornare la barra visiva
    minS.dispatchEvent(new Event('input'));
}