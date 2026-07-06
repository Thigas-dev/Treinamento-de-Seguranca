//Configurando a paleta de cores personalizada baseada na imagem enviada
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    primary: '#D83F3C', // Vermelho principal
                    primaryDark: '#9A1B1B', // Vermelho escuro (botão primary da imagem)
                    secondary: '#B85C55', // Telha
                    tertiary: '#00638D', // Azul
                    neutral: '#887270', // Marrom/Cinza texto
                    darkest: '#3a2b2a', // Para textos de maior contraste
                    bg: '#fcf5f5', // Fundo claro baseado nas caixas
                    panel: '#ffffff'
                }
            }
        }
    }
}



// 1. O BANCO DE DADOS (Cenários)
// Aqui simulamos o arquivo JSON mencionado no Roteiro (Mês 1 - Semana 2)
const emailDatabase = [
    {
        id: 1,
        senderName: "Suporte TI",
        senderEmail: "ti@honc0rd.com.br", // Domínio falso sutil
        subject: "URGENTE: Atualização de Segurança Necessária",
        body: "Prezado colaborador,\n\nIdentificamos uma vulnerabilidade no seu pacote Office. Para evitar o bloqueio da sua conta até o final do dia, solicitamos que baixe a atualização no link abaixo imediatamente:\n\n[Clique aqui para atualizar agora]\n\nAtenciosamente,\nEquipe de Suporte",
        isPhishing: true,
        trapElementId: "email-sender-address", // Qual elemento destacar no erro
        feedbackSuccess: "Excelente! Você notou o senso de urgência falso e o domínio de e-mail estranho. A TI nunca ameaça bloquear contas imediatamente por e-mail.",
        feedbackError: "Você caiu num golpe! Repare no e-mail do remetente. O nome diz 'Suporte TI', mas o domínio é 'honc0rd.com.br' e não o nosso domínio oficial.",
        tip: "Golpistas usam gatilhos de urgência (ex: 'sua conta será bloqueada hoje') para forçar você a clicar sem pensar. Sempre confira o endereço de e-mail exato."
    },
    {
        id: 2,
        senderName: "Recursos Humanos",
        senderEmail: "rh@honcord.com.br", // Domínio correto
        subject: "Lembrete: Feriado Nacional e Ponto Eletrônico",
        body: "Olá equipe,\n\nLembramos a todos que no próximo feriado nacional (quinta-feira), o registro de ponto eletrônico será suspenso para aqueles que não estiverem em escala de plantão.\n\nDúvidas, por favor, abram um chamado em nosso portal interno.\n\nBom trabalho,\nGestão de Pessoas",
        isPhishing: false,
        trapElementId: null,
        feedbackSuccess: "Muito bem. Este é um e-mail corporativo legítimo. Remetente correto, sem links suspeitos e sem pedidos de senhas.",
        feedbackError: "Ops! Você reportou um e-mail legítimo da nossa empresa. Analise com calma: o domínio do remetente estava correto e não havia links ou pedidos estranhos.",
        tip: "Nem todo e-mail é um ataque. É importante bloquear ameaças, mas não podemos paralisar a comunicação interna da empresa."
    },
    {
        id: 3,
        senderName: "Wetransfer | Envio de Arquivos",
        senderEmail: "noreply@wetransfeer.com", // Erro de digitação sutil (wetransfeer)
        subject: "Maria Diretoria te enviou um arquivo",
        body: "Olá,\n\nMaria (Diretoria) enviou 1 arquivo para você via WeTransfer.\n\nArquivo: Relatorio_Demissões_Q3.pdf\nTamanho: 2.4 MB\n\n[Baixar Arquivo]\n\nO link expira em 2 dias.",
        isPhishing: true,
        trapElementId: "email-sender-address",
        feedbackSuccess: "Ótima análise! Você percebeu a isca da curiosidade (demissões) e o erro de digitação no domínio ('wetransfeer' com dois 'e').",
        feedbackError: "Cuidado! Os golpistas usaram a tática da 'Curiosidade'. O assunto era fofoca corporativa, e o e-mail do remetente era falso (WeTransfeer com dois E).",
        tip: "Nomes de grandes marcas frequentemente são falsificados com erros de digitação sutis. Além disso, desconfie de arquivos que apelam para fofocas ou informações confidenciais."
    }
];

// Variáveis de Estado do Jogo
let currentEmailIndex = 0;
let score = { correct: 0, wrong: 0 };
let gameActive = true;

// Elementos da UI
const emailListContainer = document.getElementById('email-list-container');
const emptyState = document.getElementById('empty-state');
const readingPane = document.getElementById('reading-pane');
const unreadCount = document.getElementById('unread-count');
const scoreDisplay = document.getElementById('score-display');

function initGame() {
    renderEmailList();
    updateScoreDisplay();
}

function renderEmailList() {
    emailListContainer.innerHTML = '';
    unreadCount.innerText = emailDatabase.length - currentEmailIndex;

    emailDatabase.forEach((email, index) => {
        // Só mostra os emails que ainda não foram "resolvidos" ou o atual
        if (index < currentEmailIndex) return;

        const isActive = index === currentEmailIndex;
        const isResolved = index < currentEmailIndex;

        const div = document.createElement('div');
        div.className = `p-4 border-b border-gray-100 cursor-pointer transition-colors ${isActive ? 'bg-brand-bg border-l-4 border-l-brand-primary' : 'hover:bg-gray-50'}`;

        // Se for o primeiro da lista (o atual), o clique não faz nada (já está selecionado).
        // Se for futuro, não deixa clicar ainda para forçar a ordem.

        div.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm ${isActive ? 'text-brand-darkest' : 'text-gray-600'}">${email.senderName}</span>
                        <span class="text-xs text-gray-400">10:00</span>
                    </div>
                    <div class="text-sm font-medium ${isActive ? 'text-brand-primaryDark' : 'text-gray-800'} truncate mb-1">${email.subject}</div>
                    <div class="text-xs text-gray-500 truncate">Clique para visualizar e analisar...</div>
                `;
        emailListContainer.appendChild(div);
    });

    // Carrega o e-mail atual no painel de leitura
    if (currentEmailIndex < emailDatabase.length) {
        loadEmail(emailDatabase[currentEmailIndex]);
    } else {
        showCompletionScreen();
    }
}

function loadEmail(email) {
    emptyState.classList.add('hidden');
    readingPane.classList.remove('hidden');
    readingPane.classList.add('flex');

    document.getElementById('email-subject').innerText = email.subject;
    document.getElementById('email-sender-name').innerText = email.senderName;
    document.getElementById('email-sender-address').innerText = `<${email.senderEmail}>`;
    document.getElementById('email-avatar').innerText = email.senderName.charAt(0).toUpperCase();

    // Formatando o corpo do texto (transformando [Links] em botões azuis visuais para o jogo)
    let formattedBody = email.body.replace(/\[(.*?)\]/g, '<span class="inline-block px-4 py-2 mt-4 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 pointer-events-none">$1</span>');
    document.getElementById('email-body').innerHTML = formattedBody;

    // Remove destaques de erro anteriores
    document.getElementById('email-sender-address').classList.remove('highlight-error');
    document.getElementById('email-subject').classList.remove('highlight-error');
}

function handleDecision(userChoice) {
    if (!gameActive) return;

    const currentEmail = emailDatabase[currentEmailIndex];

    // Verifica se o usuário acertou
    // 'ameaca' significa que o usuário reportou phishing.
    // 'seguro' significa que o usuário aprovou.
    const isCorrect = (userChoice === 'ameaca' && currentEmail.isPhishing) ||
        (userChoice === 'seguro' && !currentEmail.isPhishing);

    if (isCorrect) {
        score.correct++;
        showFeedback(true, currentEmail);
    } else {
        score.wrong++;
        showFeedback(false, currentEmail);

        // Aplica o destaque visual no erro no painel de fundo (se houver um trapElementId)
        if (currentEmail.trapElementId) {
            document.getElementById(currentEmail.trapElementId).classList.add('highlight-error');
        }
    }

    updateScoreDisplay();
}

function showFeedback(isCorrect, email) {
    gameActive = false; // Pausa o jogo

    const modal = document.getElementById('feedback-modal');
    const contentBox = document.getElementById('feedback-content-box');
    const header = document.getElementById('feedback-header');
    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-title');
    const message = document.getElementById('feedback-message');
    const tip = document.getElementById('feedback-tip');

    modal.classList.remove('hidden');

    // Força um reflow para a animação CSS funcionar
    void contentBox.offsetWidth;
    contentBox.classList.add('animate-fade-in');
    contentBox.style.opacity = '1';
    contentBox.style.transform = 'translateY(0) scale(1)';

    if (isCorrect) {
        header.className = 'px-6 py-4 flex items-center gap-3 bg-green-50 text-green-800 border-b border-green-100';
        icon.className = 'fa-solid fa-circle-check text-2xl text-green-600';
        title.innerText = 'Excelente Análise!';
        message.innerText = email.feedbackSuccess;
    } else {
        header.className = 'px-6 py-4 flex items-center gap-3 bg-red-50 text-red-800 border-b border-red-100';
        icon.className = 'fa-solid fa-triangle-exclamation text-2xl text-red-600';
        title.innerText = 'Atenção! Ameaça não detectada.';
        message.innerText = email.feedbackError;
    }

    tip.innerText = email.tip;
}

// Avança para o próximo cenário
function nextEmail() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.add('hidden');

    // Reset animação
    const contentBox = document.getElementById('feedback-content-box');
    contentBox.style.opacity = '0';
    contentBox.classList.remove('animate-fade-in');

    currentEmailIndex++;
    gameActive = true;
    renderEmailList();
}

function updateScoreDisplay() {
    const totalPlayed = score.correct + score.wrong;
    scoreDisplay.innerText = `Progresso: ${totalPlayed}/${emailDatabase.length}`;
}

function showCompletionScreen() {
    emptyState.classList.add('hidden');
    readingPane.classList.add('hidden');
    readingPane.classList.remove('flex');

    const completionScreen = document.getElementById('completion-screen');
    completionScreen.classList.remove('hidden');
    completionScreen.classList.add('flex');

    document.getElementById('final-correct').innerText = score.correct;
    document.getElementById('final-wrong').innerText = score.wrong;

    const percentage = Math.round((score.correct / emailDatabase.length) * 100);
    const percentDisplay = document.getElementById('final-score-percent');
    percentDisplay.innerText = `${percentage}%`;

    // Muda a cor da porcentagem baseado no resultado
    if (percentage === 100) percentDisplay.className = 'text-5xl font-bold text-green-600 mb-2';
    else if (percentage >= 60) percentDisplay.className = 'text-5xl font-bold text-yellow-500 mb-2';
    else percentDisplay.className = 'text-5xl font-bold text-brand-primaryDark mb-2';
}

// Inicia o jogo quando a janela carrega
window.onload = initGame;