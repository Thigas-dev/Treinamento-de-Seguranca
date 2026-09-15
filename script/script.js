// ==========================================
// VARIÁVEIS GLOBAIS E ESTADO DO JOGO
// ==========================================
let activeScenarios = [];
const currentMode = window.location.pathname.includes('msg.html') ? 'chat' : 'email';

let gameState = {
    email: { index: 0, correct: 0, wrong: 0 },
    chat: { index: 0, correct: 0, wrong: 0 }
};
let gameActive = true;
let chartInstance = null; // Guarda o gráfico para evitar bugs na hora de recriar

// Limpa cache corrompido de testes anteriores
if (localStorage.getItem('gameScore')) { localStorage.clear(); }

// ==========================================
// 1. MEMÓRIA E CONEXÃO COM A API (PYTHON + SQL SERVER)
// ==========================================
function saveProgress() {
    localStorage.setItem('treinamentoState', JSON.stringify(gameState));
    localStorage.setItem(`scenarios_${currentMode}`, JSON.stringify(activeScenarios));
}

function loadProgress() {
    const savedState = localStorage.getItem('treinamentoState');
    if (savedState) gameState = JSON.parse(savedState);
}

async function restartGame() {
    // 1. Zera a pontuação do módulo atual e o cache
    gameState[currentMode] = { index: 0, correct: 0, wrong: 0 };
    localStorage.removeItem(`scenarios_${currentMode}`);
    saveProgress();

    // 2. Destrói o gráfico antigo para não sobrepor
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // 3. Esconde a tela final e mostra um estado de "Buscando no Banco..."
    document.getElementById('completion-screen')?.classList.add('hidden');
    document.getElementById('completion-screen')?.classList.remove('flex');

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-brand-neutral">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-primary mb-4"></i>
            <h2 class="text-xl font-medium">Sorteando novos cenários no banco...</h2>
        </div>`;
        emptyState.classList.remove('hidden');
    }

    // 4. Inicia o jogo novamente puxando da sua API Python sem piscar a tela
    await initGame();
}

async function initGame() {
    checkTutorial();
    loadProgress();

    // Pinta a aba lateral corretamente
    document.getElementById('tab-email')?.classList.remove('tab-active');
    document.getElementById('tab-chat')?.classList.remove('tab-active');
    document.getElementById(`tab-${currentMode}`)?.classList.add('tab-active');

    const cachedScenarios = localStorage.getItem(`scenarios_${currentMode}`);

    if (cachedScenarios && gameState[currentMode].index > 0) {
        activeScenarios = JSON.parse(cachedScenarios);
        renderScenarioList();
        updateScoreDisplay();
    } else {
        try {
            // Sorteia 3 ameaças aleatórias no banco a cada vez que o jogo é reiniciado
            const response = await fetch(`http://localhost:8067/api/scenarios/${currentMode}?limit=3`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) throw new Error("Banco retornou vazio.");

            activeScenarios = data;
            saveProgress();

            renderScenarioList();
            updateScoreDisplay();
        } catch (error) {
            console.error("Erro na API:", error);
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.innerHTML = `<div class="flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg w-3/4">
                    <i class="fa-solid fa-server text-5xl text-red-500 mb-4"></i>
                    <h2 class="text-2xl font-bold text-red-700 mb-2">Sem Conexão com o Banco</h2>
                    <p class="text-red-600">Ligue o servidor Python na porta 8067.</p>
                </div>`;
                emptyState.classList.remove('hidden');
            }
        }
    }
}

// ==========================================
// 2. RENDERIZAÇÃO DA TELA
// ==========================================
function renderScenarioList() {
    const listContainer = document.getElementById('scenario-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const currentIndex = gameState[currentMode].index;

    const unreadEl = document.getElementById('unread-count');
    if (unreadEl && currentMode === 'email') {
        unreadEl.innerText = activeScenarios.length - currentIndex;
    }

    activeScenarios.forEach((scenario, idx) => {
        if (idx < currentIndex) return;

        const isActive = idx === currentIndex;
        const div = document.createElement('div');
        div.className = `p-4 border-b border-gray-100 cursor-pointer transition-colors ${isActive ? 'bg-brand-bg border-l-4 border-l-brand-primary' : 'hover:bg-gray-50'}`;

        div.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-sm ${isActive ? 'text-brand-darkest' : 'text-gray-600'}">${scenario.senderName}</span>
                <span class="text-xs text-gray-400">Agora</span>
            </div>
            <div class="text-sm font-medium ${isActive ? 'text-brand-primaryDark' : 'text-gray-800'} truncate mb-1">${scenario.subject}</div>
            <div class="text-xs text-gray-500 truncate">Clique para analisar...</div>
        `;
        listContainer.appendChild(div);
    });

    if (currentIndex < activeScenarios.length) {
        loadScenario(activeScenarios[currentIndex]);
    } else {
        showCompletionScreen();
    }
}

function loadScenario(scenario) {
    document.getElementById('empty-state')?.classList.add('hidden');

    if (currentMode === 'chat') {
        document.getElementById('chat-pane')?.classList.remove('hidden');
        document.getElementById('chat-pane')?.classList.add('flex');

        document.getElementById('chat-sender-name').innerText = scenario.senderName;
        document.getElementById('chat-avatar').innerText = scenario.senderName.charAt(0).toUpperCase();

        const chatContainer = document.getElementById('chat-message-container');
        if (chatContainer) {
            chatContainer.innerHTML = '';
            scenario.messages.forEach((msg, index) => {
                setTimeout(() => {
                    const bubble = document.createElement('div');
                    bubble.className = msg.type === 'system' ? 'chat-system' : 'chat-bubble chat-received';
                    bubble.innerHTML = msg.text;
                    chatContainer.appendChild(bubble);
                }, index * 400);
            });
        }
    } else {
        document.getElementById('reading-pane')?.classList.remove('hidden');
        document.getElementById('reading-pane')?.classList.add('flex');

        document.getElementById('email-subject').innerText = scenario.subject;
        document.getElementById('email-sender-name').innerText = scenario.senderName;
        document.getElementById('email-sender-address').innerText = `<${scenario.senderEmail}>`;
        document.getElementById('email-avatar').innerText = scenario.senderName.charAt(0).toUpperCase();

        const emailBody = document.getElementById('email-body');
        if (emailBody) {
            let formattedBody = scenario.body.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
            formattedBody = formattedBody.replace(/\[(.*?)\]/g, '<br><span class="inline-block px-4 py-2 mt-4 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 pointer-events-none">$1</span>');

            emailBody.innerHTML = formattedBody;
        }
    }
}

// ==========================================
// 3. MOTOR DE DECISÃO E FEEDBACK
// ==========================================
function handleDecision(userChoice) {
    if (!gameActive) return;

    const currentIndex = gameState[currentMode].index;
    const currentScenario = activeScenarios[currentIndex];

    const isCorrect = (userChoice === 'ameaca' && currentScenario.isPhishing) ||
        (userChoice === 'seguro' && !currentScenario.isPhishing);

    if (isCorrect) {
        gameState[currentMode].correct++;
        showFeedback(true, currentScenario);
    } else {
        gameState[currentMode].wrong++;
        showFeedback(false, currentScenario);

        if (currentScenario.trapElementId) {
            document.getElementById(currentScenario.trapElementId)?.classList.add('highlight-error');
        }
    }

    saveProgress();
    updateScoreDisplay();
}

function showFeedback(isCorrect, scenario) {
    gameActive = false;

    const modal = document.getElementById('feedback-modal');
    const contentBox = document.getElementById('feedback-content-box');
    const header = document.getElementById('feedback-header');
    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-title');
    const message = document.getElementById('feedback-message');
    const tip = document.getElementById('feedback-tip');

    if (modal) modal.classList.remove('hidden');

    if (contentBox) {
        void contentBox.offsetWidth;
        contentBox.classList.add('animate-fade-in');
        contentBox.style.opacity = '1';
        contentBox.style.transform = 'translateY(0) scale(1)';
    }

    if (isCorrect) {
        if (header) header.className = 'px-6 py-4 flex items-center gap-3 bg-green-50 text-green-800 border-b border-green-100';
        if (icon) icon.className = 'fa-solid fa-circle-check text-2xl text-green-600';
        if (title) title.innerText = 'Excelente Análise!';
        if (message) message.innerText = scenario.feedbackSuccess;
    } else {
        if (header) header.className = 'px-6 py-4 flex items-center gap-3 bg-red-50 text-red-800 border-b border-red-100';
        if (icon) icon.className = 'fa-solid fa-triangle-exclamation text-2xl text-red-600';
        if (title) title.innerText = 'Atenção! Ameaça não detectada.';
        if (message) message.innerText = scenario.feedbackError;
    }

    if (tip) tip.innerText = scenario.tip;
}

function nextScenario() {
    document.getElementById('feedback-modal')?.classList.add('hidden');
    const contentBox = document.getElementById('feedback-content-box');
    if (contentBox) {
        contentBox.style.opacity = '0';
        contentBox.classList.remove('animate-fade-in');
    }

    document.querySelectorAll('.highlight-error').forEach(el => {
        el.classList.remove('highlight-error');
    });

    gameState[currentMode].index++;
    gameActive = true;
    saveProgress();
    renderScenarioList();
}

function updateScoreDisplay() {
    const correct = gameState[currentMode].correct;
    const wrong = gameState[currentMode].wrong;
    const totalPlayed = correct + wrong;

    const display = document.getElementById('score-display');
    if (display) display.innerText = `Progresso: ${totalPlayed}/${activeScenarios.length}`;
}

// ==========================================
// 4. TELA FINAL E GRÁFICOS (CHART.JS)
// ==========================================
function showCompletionScreen() {
    // 1. Esconde as telas de jogo ativas
    document.getElementById('empty-state')?.classList.add('hidden');

    const readingPane = document.getElementById('reading-pane');
    if (readingPane) { readingPane.classList.add('hidden'); readingPane.classList.remove('flex'); }

    const chatPane = document.getElementById('chat-pane');
    if (chatPane) { chatPane.classList.add('hidden'); chatPane.classList.remove('flex'); }

    // 2. Mostra a tela de conclusão
    const completionScreen = document.getElementById('completion-screen');
    if (completionScreen) {
        completionScreen.classList.remove('hidden');
        completionScreen.classList.add('flex');
    }

    // 3. Atualiza os números
    const correct = gameState[currentMode].correct;
    const wrong = gameState[currentMode].wrong;

    const finalCorrect = document.getElementById('final-correct');
    if (finalCorrect) finalCorrect.innerText = correct;

    const finalWrong = document.getElementById('final-wrong');
    if (finalWrong) finalWrong.innerText = wrong;

    // 4. Calcula e desenha a Porcentagem e o Gráfico
    if (activeScenarios.length > 0) {
        const percentage = Math.round((correct / activeScenarios.length) * 100);
        const percentDisplay = document.getElementById('final-score-percent');

        if (percentDisplay) {
            percentDisplay.innerText = `${percentage}%`;
            if (percentage === 100) percentDisplay.className = 'text-5xl font-bold text-green-600 mb-2';
            else if (percentage >= 60) percentDisplay.className = 'text-5xl font-bold text-yellow-500 mb-2';
            else percentDisplay.className = 'text-5xl font-bold text-brand-primaryDark mb-2';
        }

        // --- RENDERIZA O GRÁFICO SE A BIBLIOTECA CHART.JS EXISTIR ---
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('performanceChart');
            if (ctx) {
                // Destrói gráfico antigo se o usuário clicar em "Refazer"
                if (chartInstance) { chartInstance.destroy(); }

                chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Análises Corretas', 'Vulnerabilidades'],
                        datasets: [{
                            data: [correct, wrong],
                            backgroundColor: ['#16a34a', '#D83F3C'], // Verde e Vermelho
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        cutout: '70%'
                    }
                });
            }
        }
    }
}

function checkTutorial() {
    // Verifica se a chave 'tutorialSeen' NÃO existe na memória
    if (!localStorage.getItem('tutorialSeen')) {
        const modal = document.getElementById('tutorial-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
}

function closeTutorial() {
    // Grava na memória que o usuário já viu o tutorial
    localStorage.setItem('tutorialSeen', 'true');
    const modal = document.getElementById('tutorial-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

window.onload = initGame;