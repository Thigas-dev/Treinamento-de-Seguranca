const API_URL = 'http://localhost:8067/api/admin/scenarios';
let scenariosData = [];

// 1. Carregar Dados (Read)
async function loadScenarios() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Falha na API');
        scenariosData = await response.json();
        renderTable();
    } catch (error) {
        document.getElementById('table-body').innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500 font-bold">Erro ao conectar com o Servidor (Porta 8001).</td></tr>`;
    }
}

// Renderizar Tabela
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    scenariosData.forEach(s => {
        const isThreat = (s.isPhishing === true || s.isPhishing === 1)
            ? `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Sim</span>`
            : `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-shield-check"></i> Não</span>`;

        const iconType = s.type === 'email' ? '<i class="fa-solid fa-envelope text-gray-400"></i>' : '<i class="fa-solid fa-comments w-5 text-gray-400"></i>';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition border-b border-gray-50';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium text-gray-500">#${s.id}</td>
            <td class="px-6 py-4 text-sm capitalize">${iconType} ${s.type}</td>
            <td class="px-6 py-4 text-sm font-bold text-brand-darkest">${s.senderName}</td>
            <td class="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">${s.subject}</td>
            <td class="px-6 py-4 text-sm">${isThreat}</td>
            <td class="px-6 py-4 text-sm text-center">
                <button onclick="openModal(${s.id})" class="text-blue-600 hover:text-blue-800 mx-2 transition" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteScenario(${s.id})" class="text-red-500 hover:text-red-700 mx-2 transition" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 2. Abrir Modal (Prepara para Criar ou Editar)
function openModal(id = null) {
    document.getElementById('form-modal').classList.remove('hidden');
    document.getElementById('form-modal').classList.add('flex');

    const form = document.getElementById('scenario-form');
    form.reset();

    if (id) {
        document.getElementById('modal-title').innerText = `Editar Cenário #${id}`;
        const s = scenariosData.find(x => x.id === id);
        document.getElementById('scenario_id').value = s.id;
        document.getElementById('type').value = s.type;
        document.getElementById('isPhishing').value = (s.isPhishing === true || s.isPhishing === 1) ? "1" : "0";
        document.getElementById('senderName').value = s.senderName;
        document.getElementById('senderEmail').value = s.senderEmail || '';
        document.getElementById('subject').value = s.subject;
        document.getElementById('content').value = s.content;
        document.getElementById('trapElementId').value = s.trapElementId || '';
        document.getElementById('feedbackSuccess').value = s.feedbackSuccess;
        document.getElementById('feedbackError').value = s.feedbackError;
        document.getElementById('tip').value = s.tip;
    } else {
        document.getElementById('modal-title').innerText = 'Adicionar Novo Cenário';
        document.getElementById('scenario_id').value = '';
    }
}

function closeModal() {
    document.getElementById('form-modal').classList.add('hidden');
    document.getElementById('form-modal').classList.remove('flex');
}

// 3. Salvar (Create ou Update)
async function saveScenario(e) {
    e.preventDefault();

    const id = document.getElementById('scenario_id').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    const payload = {
        type: document.getElementById('type').value,
        senderName: document.getElementById('senderName').value,
        senderEmail: document.getElementById('senderEmail').value || null,
        subject: document.getElementById('subject').value,
        content: document.getElementById('content').value,
        isPhishing: parseInt(document.getElementById('isPhishing').value),
        trapElementId: document.getElementById('trapElementId').value || null,
        feedbackSuccess: document.getElementById('feedbackSuccess').value,
        feedbackError: document.getElementById('feedbackError').value,
        tip: document.getElementById('tip').value
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(id ? 'Cenário atualizado com sucesso!' : 'Novo cenário criado!');
            closeModal();
            loadScenarios(); // Recarrega a tabela
        } else {
            alert('Erro ao salvar. Verifique os dados.');
        }
    } catch (error) {
        console.error(error);
        alert('Erro de comunicação com o servidor Python.');
    }
}

// 4. Deletar (Delete)
async function deleteScenario(id) {
    if (confirm(`Atenção: Tem certeza que deseja DELETAR permanentemente o cenário #${id} do banco de dados?`)) {
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Cenário deletado!');
                loadScenarios();
            }
        } catch (error) {
            alert('Erro ao deletar.');
        }
    }
}

// Inicia carregando os dados
window.onload = loadScenarios;