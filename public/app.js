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

    return params.toString(); // Converte i filtri in una stringa di query (es. search=water&min_bp=50)
}

async function caricaSolventi() {
    const query = getQueryString();
    const endpoint = `${API_URL}/?${query}`; // Costruisce l'URL completo per la chiamata API
    
    const tbody = document.getElementById('tabella-corpo');
    const countElement = document.getElementById('risultati-count');
    
    // Mostra lo stato di caricamento
    tbody.innerHTML = '<tr><td colspan="8">Caricamento in corso...</td></tr>';
    countElement.textContent = 'Ricerca in corso...';

    try {
        const response = await fetch(endpoint);
        const data = await response.json(); // I dati vengono ricevuti in formato JSON

        tbody.innerHTML = '';
        
        if (data.error) {
             tbody.innerHTML = `<tr><td colspan="8" style="color: red;">Errore API: ${data.details || data.error}</td></tr>`;
             countElement.textContent = 'Errore API';
             return;
        }

        countElement.textContent = `Trovati ${data.length} solventi.`;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">Nessun solvente trovato con i filtri selezionati.</td></tr>';
        } else {
            // Itera sui risultati e li inserisce nella tabella
            data.forEach(solvente => {
                const row = tbody.insertRow();
                // Assicurati che questi nomi di campo (nome, punto_ebollizione, ecc.) corrispondano al tuo DB D1!
                row.insertCell().textContent = solvente.nome;
                row.insertCell().textContent = solvente.cas;
                row.insertCell().textContent = solvente.formula;
                row.insertCell().textContent = solvente.punto_ebollizione ? solvente.punto_ebollizione.toFixed(1) : '-';
                row.insertCell().textContent = solvente.densita ? solvente.densita.toFixed(3) : '-';
                row.insertCell().textContent = solvente.costante_dielettrica ? solvente.costante_dielettrica.toFixed(1) : '-';
                row.insertCell().textContent = solvente.polarita;
                row.insertCell().textContent = solvente.categoria;
            });
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" style="color: red;">Errore di Rete: Impossibile raggiungere l'API.</td></tr>`;
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