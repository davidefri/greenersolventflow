// URL del tuo Cloudflare Worker
const API_URL = "https://api-worker.davide-frigatti.workers.dev/solvents";

// Variabile globale per lo stato di sorting
let sortState = {
    column: null, // Nome colonna DB
    direction: 'ASC' // ASC o DESC
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP TASTI FILTRI (Kamlet-Taft e Modal) ---

    // Toggle Kamlet-Taft
    const btnToggleKT = document.getElementById('toggle-kt-filters');
    const divKT = document.getElementById('kt-slider-filters');

    if (btnToggleKT && divKT) {
        btnToggleKT.addEventListener('click', () => {
            divKT.classList.toggle('hidden');
        });
    }

    // Gestione Modal Compatibility
    const btnCompat = document.getElementById('toggle-compatibility');
    const modalCompat = document.getElementById('compatibility-modal');
    const btnCloseCompat = document.getElementById('close-compatibility');
    const btnApplyCompat = document.getElementById('apply-compatibility');
    const btnResetCompat = document.getElementById('reset-compatibility');

    if (btnCompat && modalCompat) {
        btnCompat.addEventListener('click', () => {
            modalCompat.classList.remove('hidden');
        });

        const closeModal = () => {
            modalCompat.classList.add('hidden');
        };

        if (btnCloseCompat) btnCloseCompat.addEventListener('click', closeModal);

        // Quando l'utente clicca Applica, chiudi e cerca
        if (btnApplyCompat) {
            btnApplyCompat.addEventListener('click', () => {
                closeModal();
                fetchSolvents();
            });
        }

        // Reset Compatibility
        if (btnResetCompat) {
            btnResetCompat.addEventListener('click', () => {
                resetCompatibilityFilters();
                closeModal();
                fetchSolvents();
            });
        }
    }

    // --- 2. GESTIONE COLONNE (SHOW/HIDE) ---
    // Ascolta i click sulle checkbox del menu colonne
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        toggle.addEventListener('change', applyColumnVisibility);
    });

    // --- 3. GESTIONE ORDINAMENTO (SORTING) ---
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            handleSort(header);
        });
    });

    // --- 4. SETUP SLIDERS KAMLET-TAFT ---
    setupSlider('alpha-group', 100);
    setupSlider('beta-group', 100);
    setupSlider('pistar-group', 100);

    // --- 5. LOGICA RICERCA REAL-TIME ---
    const searchRealTime = debounce(fetchSolvents, 400);

    // Collegamento Eventi INPUT TESTO
    const textInputs = document.querySelectorAll('#search, #min_bp, #max_bp');
    textInputs.forEach(input => {
        input.addEventListener('input', searchRealTime);
    });

    // Collegamento Eventi SELECT
    const selects = document.querySelectorAll('#water_miscibility'); // Rimosso #categoria
    selects.forEach(select => {
        select.addEventListener('change', fetchSolvents);
    });

    // Collegamento Eventi SLIDERS
    const sliders = document.querySelectorAll('.kt-min-slider, .kt-max-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', searchRealTime);
    });

    // Tasto Reset Generale
    const btnResetAll = document.getElementById('reset-filters');
    if (btnResetAll) {
        btnResetAll.addEventListener('click', resetFilters);
    }

    // Caricamento iniziale
    fetchSolvents();
});

// --- FUNZIONI ORDINAMENTO (NUOVE) ---

function handleSort(header) {
    const column = header.getAttribute('data-sort');

    // Se clicchiamo sulla stessa colonna, invertiamo la direzione
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'ASC' ? 'DESC' : 'ASC';
    } else {
        // Altrimenti, resettiamo e ordiniamo in ASC per la nuova colonna
        sortState.column = column;
        sortState.direction = 'ASC';
    }

    // Aggiorna la visualizzazione dell'ordinamento
    updateSortVisuals(column, sortState.direction);

    // Esegui nuovamente il fetch con i nuovi parametri di ordinamento
    fetchSolvents();
}

function updateSortVisuals(column, direction) {
    // Rimuovi le classi da tutte le intestazioni
    document.querySelectorAll('th.sortable').forEach(h => {
        h.classList.remove('sorted-asc', 'sorted-desc');
    });

    // Aggiungi la classe all'intestazione corrente
    const currentHeader = document.querySelector(`th[data-sort="${column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(`sorted-${direction.toLowerCase()}`);
    }
}


// --- FUNZIONI UTILI ESISTENTI ---

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function setupSlider(groupId, scaleFactor) {
    const group = document.getElementById(groupId);
    if (!group) return;

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

// --- LOGICA FETCH E TABELLA (MODIFICATA) ---
async function fetchSolvents() {
    const countEl = document.getElementById('risultati-count');
    const tbody = document.getElementById('tabella-corpo');

    if (countEl) countEl.style.opacity = "0.5";

    const params = new URLSearchParams();

    // Raccolta dati input
    const search = document.getElementById('search').value;
    if (search) params.append('search', search);

    const misc = document.getElementById('water_miscibility').value;
    if (misc) params.append('water_miscibility', misc);

    // RIMOZIONE: Raccolta del parametro 'categoria'

    const minBp = document.getElementById('min_bp').value;
    if (minBp) params.append('min_bp', minBp);

    const maxBp = document.getElementById('max_bp').value;
    if (maxBp) params.append('max_bp', maxBp);

    // Filtri Compatibility (Checkbox nel modal)
    document.querySelectorAll('.compat-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            const paramName = checkbox.getAttribute('data-param');
            params.append(paramName, 'required');
        }
    });

    // Filtri KT
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

    // NUOVA LOGICA: Parametri di Ordinamento
    if (sortState.column) {
        params.append('sort_by', sortState.column);
        params.append('sort_dir', sortState.direction);
    }

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error("API Error");

        const data = await response.json();

        if (countEl) {
            countEl.innerText = `${data.length} solvents found.`;
            countEl.style.opacity = "1";
        }

        tbody.innerHTML = "";

        const show = (val) => (val !== null && val !== undefined && val !== "" && val !== 0) ? val : '-';

        data.forEach(solvent => {
            const tr = document.createElement('tr');

            // Creazione riga con le classi "toggle-col c-..." per gestire la visibilità
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
 <td class="toggle-col c-ox" style="${solvent.oxidation_resistance === 'yes' ? 'background:rgba(0, 255, 0, 0.15); color:#fff;' : ''}">${show(solvent.oxidation_resistance)}</td>
 <td class="toggle-col c-red" style="${solvent.reduction_resistance === 'yes' ? 'background:rgba(0, 255, 0, 0.15); color:#fff;' : ''}">${show(solvent.reduction_resistance)}</td>
 <td class="toggle-col c-acid" style="${solvent.acid_resistance === 'yes' ? 'background:rgba(0, 255, 0, 0.15); color:#fff;' : ''}">${show(solvent.acid_resistance)}</td>
 <td class="toggle-col c-basic" style="${solvent.basic_resistance === 'yes' ? 'background:rgba(0, 255, 0, 0.15); color:#fff;' : ''}">${show(solvent.basic_resistance)}</td>
 `;
            tbody.appendChild(tr);
        });

        // Applica visibilità colonne subito dopo aver creato la tabella
        applyColumnVisibility();

    } catch (error) {
        console.error(error);
        if (countEl) countEl.innerText = "Error loading data.";
    }
}

// Funzione che accende/spegne le colonne in base alle checkbox
function applyColumnVisibility() {
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        const targetClass = toggle.getAttribute('data-target'); // es. "c-bp"
        const isVisible = toggle.checked;

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

function resetCompatibilityFilters() {
    document.querySelectorAll('.compat-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

function resetFilters() {
    document.getElementById('search').value = '';
    document.getElementById('water_miscibility').value = '';
    // RIMOZIONE: document.getElementById('categoria').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';

    resetCompatibilityFilters();

    resetSliderGroup('alpha-group', -5, 196);
    resetSliderGroup('beta-group', -8, 143);
    resetSliderGroup('pistar-group', -41, 121);

    // NUOVO: Reset ordinamento
    sortState = { column: null, direction: 'ASC' };
    updateSortVisuals(null, null);

    fetchSolvents();
}

function resetSliderGroup(id, min, max) {
    const group = document.getElementById(id);
    if (!group) return;
    const minS = group.querySelector('.kt-min-slider');
    const maxS = group.querySelector('.kt-max-slider');
    minS.value = min;
    maxS.value = max;
    minS.dispatchEvent(new Event('input'));
}