// public/app.js

// !!! IMPORTANTE: DEVI USARE IL TUO URL DI DEPLOY !!!
const API_URL = 'https://api-worker.davide-frigatti.workers.dev/solvents'; 

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
    
    // Correzione per evitare URL come /solvents/?
    const endpoint = query ? `${API_URL}?${query}` : API_URL; 
    
    const tbody = document.getElementById('tabella-corpo');
    const countElement = document.getElementById('risultati-count');
    
    // Ci sono 15 colonne totali da visualizzare
    const totalColumns = 15; 
    tbody.innerHTML = `<tr><td colspan="${totalColumns}">Caricamento in corso...</td></tr>`;
    countElement.textContent = 'Ricerca in corso...';

    try {
        const response = await fetch(endpoint);
        const data = await response.json(); 

        tbody.innerHTML = '';
        
        if (data.error) {
             tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="color: red;">Errore API: ${data.details || data.error}</td></tr>`;
             countElement.textContent = 'Errore API';
             return;
        }

        countElement.textContent = `Trovati ${data.length} solventi.`;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${totalColumns}">Nessun solvente trovato con i filtri selezionati.</td></tr>`;
        } else {
            data.forEach(solvente => {
                const row = tbody.insertRow();
                
                // I campi vengono inseriti ESATTAMENTE nell'ordine della tabella HTML.
                row.insertCell().textContent = solvente.cas;
                row.insertCell().textContent = solvente.iupac_name;
                row.insertCell().textContent = solvente.formula;
                row.insertCell().textContent = solvente.boiling_point ? solvente.boiling_point.toFixed(1) : '-';
                row.insertCell().textContent = solvente.density ? solvente.density.toFixed(3) : '-';
                row.insertCell().textContent = solvente.dielectric_constant ? solvente.dielectric_constant.toFixed(1) : '-';
                row.insertCell().textContent = solvente.water_miscible === 1 ? 'Sì' : 'No'; 
                
                row.insertCell().textContent = solvente.alpha ? solvente.alpha.toFixed(2) : '-';
                row.insertCell().textContent = solvente.beta ? solvente.beta.toFixed(2) : '-';
                row.insertCell().textContent = solvente.pistar ? solvente.pistar.toFixed(2) : '-';
                
                row.insertCell().textContent = solvente.viscosity ? solvente.viscosity.toFixed(2) : '-';
                row.insertCell().textContent = solvente.h_phrases || '-';
                row.insertCell().textContent = solvente.p_phrases || '-';

                row.insertCell().textContent = solvente.oxidation_stability || '-';
                row.insertCell().textContent = solvente.reduction_stability || '-';
                row.insertCell().textContent = solvente.acid_stability || '-';
            });
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="color: red;">Errore di Rete: Impossibile raggiungere l'API.</td></tr>`;
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