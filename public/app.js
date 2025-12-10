/* public/app.js - VERSIONE DEFINITIVA */

// URL del tuo Cloudflare Worker
const API_URL = "https://api-worker.davide-frigatti.workers.dev/solvents";

// Variabile globale per lo stato di sorting
let sortState = {
    column: null, // Nome colonna DB
    direction: 'ASC' // ASC o DESC
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP INIZIALE COLONNE (PARTENZA PULITA) ---
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        toggle.checked = false; 
        toggle.addEventListener('change', applyColumnVisibility);
    });
    

    // --- 2. SETUP MODALI E BOTTONI INTERNI ---
    setupModal('toggle-compatibility', 'compatibility-modal', 'close-compatibility');
    setupModal('toggle-kt-filters', 'kt-modal', 'close-kt');

    // GESTIONE WELCOME MODAL
    const welcomeModal = document.getElementById('welcome-modal');
    const closeWelcomeBtn = document.getElementById('close-welcome');

    if (welcomeModal && closeWelcomeBtn) {
        closeWelcomeBtn.addEventListener('click', () => {
            closeModal(welcomeModal);
        });
    }

    // --- GESTIONE LOGICA COMPATIBILITÀ (Apply & Reset) ---
    const modalCompat = document.getElementById('compatibility-modal');
    const btnApplyCompat = document.getElementById('apply-compatibility');
    const btnResetCompat = document.getElementById('reset-compatibility'); // <--- NUOVO SELETTORE

    // Tasto APPLY: Chiude e Cerca
    if (btnApplyCompat && modalCompat) {
        btnApplyCompat.addEventListener('click', () => {
            closeModal(modalCompat);
            fetchSolvents();
        });
    }

    // Tasto RESET: Pulisce le checkbox (ma non chiude, così l'utente vede che si sono pulite)
    if (btnResetCompat) {
        btnResetCompat.addEventListener('click', () => {
            resetCompatibilityFilters();
        });
    }

    // --- GESTIONE LOGICA KAMLET-TAFT (Apply & Reset) ---
    const modalKT = document.getElementById('kt-modal');
    if (modalKT) {
        document.getElementById('apply-kt')?.addEventListener('click', () => {
            closeModal(modalKT);
            fetchSolvents();
        });
        document.getElementById('reset-kt')?.addEventListener('click', () => {
            resetSliderGroup('alpha-group', -5, 196);
            resetSliderGroup('beta-group', -8, 143);
            resetSliderGroup('pistar-group', -41, 121);
        });
    }


    // --- 3. GESTIONE ORDINAMENTO ---
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => handleSort(header));
    });

    // --- 4. SETUP SLIDERS KAMLET-TAFT ---
    // Usiamo 100 come scaleFactor perché i valori HTML sono (valore reale * 100)
    setupSlider('alpha-group', 100);
    setupSlider('beta-group', 100);
    setupSlider('pistar-group', 100);

    // --- 5. LOGICA RICERCA REAL-TIME ---
    const searchRealTime = debounce(fetchSolvents, 400);

    const textInputs = document.querySelectorAll('#search, #min_bp, #max_bp');
    textInputs.forEach(input => input.addEventListener('input', searchRealTime));

    const selectMisc = document.getElementById('water_miscibility');
    if (selectMisc) selectMisc.addEventListener('change', fetchSolvents);

    const sliders = document.querySelectorAll('.kt-min-slider, .kt-max-slider');
    sliders.forEach(slider => {
        slider.addEventListener('mouseup', fetchSolvents);
        slider.addEventListener('touchend', fetchSolvents);
    });

    // --- 6. TASTO RESET GENERALE (DASHBOARD) ---
    const btnResetAll = document.getElementById('reset-btn');
    if (btnResetAll) btnResetAll.addEventListener('click', resetAllFilters);

    // --- 7. CARICAMENTO DATI INIZIALE ---
    fetchSolvents();
});

// --- HELPER FUNCTIONS ---

function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
}

function setupModal(triggerId, modalId, closeId) {
    const btn = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);

    if (btn && modal) btn.addEventListener('click', () => modal.classList.remove('hidden'));
    if (closeBtn && modal) closeBtn.addEventListener('click', () => closeModal(modal));
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    }
}

// --- LOGICA ORDINAMENTO ---
function handleSort(header) {
    const column = header.getAttribute('data-sort');
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'ASC' ? 'DESC' : 'ASC';
    } else {
        sortState.column = column;
        sortState.direction = 'ASC';
    }
    updateSortVisuals(column, sortState.direction);
    fetchSolvents();
}

function updateSortVisuals(column, direction) {
    document.querySelectorAll('th.sortable').forEach(h => {
        h.classList.remove('sorted-asc', 'sorted-desc');
    });
    if (column) {
        const currentHeader = document.querySelector(`th[data-sort="${column}"]`);
        if (currentHeader) currentHeader.classList.add(`sorted-${direction.toLowerCase()}`);
    }
}

// --- UTILITIES ---
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Logica per gli slider a doppia maniglia (anti-collisione)
function setupSlider(groupId, scaleFactor) {
    const group = document.getElementById(groupId);
    if (!group) return;

    const minSlider = group.querySelector('.kt-min-slider');
    const maxSlider = group.querySelector('.kt-max-slider');
    const display = group.querySelector('.range-display');
    const fill = group.querySelector('.range-fill');
    
    const minGap = 5; 

    function update() {
        let val1 = parseInt(minSlider.value);
        let val2 = parseInt(maxSlider.value);
        const maxLimit = parseInt(minSlider.max);
        const minLimit = parseInt(minSlider.min);
        
        // Anti-collisione: impedisce ai pallini di incrociarsi
        if (val2 - val1 <= minGap) {
            if (document.activeElement === minSlider) {
                minSlider.value = val2 - minGap;
                val1 = val2 - minGap;
            } else {
                maxSlider.value = val1 + minGap;
                val2 = val1 + minGap;
            }
        }

        const range = maxLimit - minLimit;
        const percent1 = ((val1 - minLimit) / range) * 100;
        const percent2 = ((val2 - minLimit) / range) * 100;

        if (fill) {
            fill.style.left = percent1 + "%";
            fill.style.width = (percent2 - percent1) + "%";
        }

        if (display) {
            display.innerText = `${(val1 / scaleFactor).toFixed(2)} - ${(val2 / scaleFactor).toFixed(2)}`;
        }
    }

    minSlider.addEventListener('input', update);
    maxSlider.addEventListener('input', update);
    update(); // Avvio iniziale
}

// --- CORE FETCH FUNCTION ---
async function fetchSolvents() {
    const countEl = document.getElementById('risultati-count');
    const tbody = document.getElementById('tabella-corpo');

    if (countEl) countEl.style.opacity = "0.5";

    const params = new URLSearchParams();
    const search = document.getElementById('search').value;
    if (search) params.append('search', search);

    const misc = document.getElementById('water_miscibility').value;
    if (misc) params.append('water_miscibility', misc);

    const minBp = document.getElementById('min_bp').value;
    if (minBp) params.append('min_bp', minBp);

    const maxBp = document.getElementById('max_bp').value;
    if (maxBp) params.append('max_bp', maxBp);

    document.querySelectorAll('.compat-checkbox').forEach(checkbox => {
        if (checkbox.checked) params.append(checkbox.getAttribute('data-param'), 'required');
    });

    ['alpha', 'beta', 'pistar'].forEach(g => {
        const minVal = document.querySelector(`#${g}-group .kt-min-slider`)?.value;
        const maxVal = document.querySelector(`#${g}-group .kt-max-slider`)?.value;
        if (minVal && maxVal) {
            params.append(`min_${g}`, (minVal / 100).toFixed(2));
            params.append(`max_${g}`, (maxVal / 100).toFixed(2));
        }
    });

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
                <td class="toggle-col c-ox" style="${solvent.oxidation_resistance === 'yes' ? 'color:#4eff4e;' : ''}">${show(solvent.oxidation_resistance)}</td>
                <td class="toggle-col c-red" style="${solvent.reduction_resistance === 'yes' ? 'color:#4eff4e;' : ''}">${show(solvent.reduction_resistance)}</td>
                <td class="toggle-col c-acid" style="${solvent.acid_resistance === 'yes' ? 'color:#4eff4e;' : ''}">${show(solvent.acid_resistance)}</td>
                <td class="toggle-col c-basic" style="${solvent.basic_resistance === 'yes' ? 'color:#4eff4e;' : ''}">${show(solvent.basic_resistance)}</td>
            `;
            tbody.appendChild(tr);
        });

        applyColumnVisibility();

    } catch (error) {
        console.error(error);
        if (countEl) countEl.innerText = "Error loading data.";
    }
}

// Funzione Visibilità Colonne
function applyColumnVisibility() {
    document.querySelectorAll('.col-toggle').forEach(toggle => {
        const targetClass = toggle.getAttribute('data-target');
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

// Funzione Helper Reset Checkbox Compatibilità
function resetCompatibilityFilters() {
    document.querySelectorAll('.compat-checkbox').forEach(c => c.checked = false);
}

// Funzione Helper Reset Generale
function resetAllFilters() {
    document.getElementById('search').value = '';
    document.getElementById('min_bp').value = '';
    document.getElementById('max_bp').value = '';
    document.getElementById('water_miscibility').value = '';
    
    resetCompatibilityFilters();
    
    resetSliderGroup('alpha-group', -5, 196);
    resetSliderGroup('beta-group', -8, 143);
    resetSliderGroup('pistar-group', -41, 121);
    
    document.querySelectorAll('.col-toggle').forEach(t => t.checked = false);
    
    sortState = { column: null, direction: 'ASC' };
    updateSortVisuals(null, null);
    fetchSolvents();
}

// Funzione Helper Reset Singolo Gruppo Slider
function resetSliderGroup(id, min, max) {
    const group = document.getElementById(id);
    if (!group) return;
    const minS = group.querySelector('.kt-min-slider');
    const maxS = group.querySelector('.kt-max-slider');
    if (minS) minS.value = min;
    if (maxS) maxS.value = max;
    // Scateniamo l'evento input per aggiornare graficamente la barra blu
    if (minS) minS.dispatchEvent(new Event('input'));
}