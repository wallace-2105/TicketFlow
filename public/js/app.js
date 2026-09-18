/**
 * Service Desk - Painel de Controle
 * Lógica de Frontend reativa em Vanilla JavaScript ES6+
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const form = document.getElementById('ticketForm');
  const inputTitulo = document.getElementById('inputTitulo');
  const inputDescricao = document.getElementById('inputDescricao');
  const fieldStatus = document.getElementById('fieldStatus');
  const progressBar = document.getElementById('progressBar');
  const submitBtn = document.getElementById('submitBtn');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const ticketsFeed = document.getElementById('ticketsFeed');
  const statTotal = document.getElementById('statTotal');
  const statRecent = document.getElementById('statRecent');
  const toastContainer = document.getElementById('toastContainer');

  // Estado local em memória no cliente
  let todosChamados = [];
  let chamadosFiltrados = [];

  // =========================================================================
  // Validação em Tempo Real do Título
  // =========================================================================
  function atualizarValidacaoTitulo() {
    const valor = inputTitulo.value;
    const len = valor.trim().length;
    const percent = Math.min((len / 100) * 100, 100);

    progressBar.style.width = `${percent}%`;

    if (len === 0) {
      fieldStatus.textContent = 'Mínimo 5 caracteres';
      fieldStatus.className = 'field-status invalid';
      progressBar.className = 'validation-progress-bar';
    } else if (len >= 5 && len <= 100) {
      fieldStatus.textContent = `${len}/100 caracteres (Válido ✓)`;
      fieldStatus.className = 'field-status valid';
      progressBar.className = 'validation-progress-bar valid';
    } else if (len < 5) {
      fieldStatus.textContent = `${len}/100 (Muito curto - mínimo 5)`;
      fieldStatus.className = 'field-status invalid';
      progressBar.className = 'validation-progress-bar';
    } else {
      fieldStatus.textContent = `${len}/100 (Excedeu limite de 100)`;
      fieldStatus.className = 'field-status invalid';
      progressBar.className = 'validation-progress-bar';
    }
  }

  inputTitulo.addEventListener('input', atualizarValidacaoTitulo);

  // =========================================================================
  // Botões de Teste Rápido
  // =========================================================================
  const exemplos = {
    btnExemploValido: {
      titulo: 'Erro ao conectar no banco de dados em produção',
      descricao: 'A aplicação está retornando timeout após 30 segundos de tentativa.'
    },
    btnExemploCurto: {
      titulo: 'Bug',
      descricao: 'Título curto proposital com apenas 3 letras para testar validação de erro 400.'
    },
    btnExemploLongo: {
      titulo: 'Falha catastrófica no subsistema de processamento de filas assíncronas que impede totalmente a sincronização dos dados dos clientes'.slice(0, 110),
      descricao: 'Título com mais de 100 caracteres para validar a rejeição na API.'
    }
  };

  Object.entries(exemplos).forEach(([id, dados]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        inputTitulo.value = dados.titulo;
        inputDescricao.value = dados.descricao;
        atualizarValidacaoTitulo();
        inputTitulo.focus();
      });
    }
  });

  // =========================================================================
  // Sistema de Notificações Toast
  // =========================================================================
  function showToast(titulo, mensagem, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    const icon = tipo === 'success' ? '✓' : '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(titulo)}</div>
        <div class="toast-msg">${escapeHtml(mensagem)}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // =========================================================================
  // Formatação Amigável de Tempo Relativo
  // =========================================================================
  function formatarTempoRelativo(isoString) {
    const agora = new Date();
    const data = new Date(isoString);
    const diffSegundos = Math.floor((agora - data) / 1000);

    if (diffSegundos < 5) return 'Agora mesmo';
    if (diffSegundos < 60) return `Há ${diffSegundos}s`;
    const diffMin = Math.floor(diffSegundos / 60);
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    return data.toLocaleDateString('pt-BR');
  }

  // =========================================================================
  // Renderização do Feed de Chamados
  // =========================================================================
  function renderizarChamados() {
    statTotal.textContent = todosChamados.length;
    statRecent.textContent = todosChamados.length > 0 ? `#${todosChamados[todosChamados.length - 1].id}` : '-';

    if (chamadosFiltrados.length === 0) {
      const isBusca = searchInput.value.trim().length > 0;
      ticketsFeed.innerHTML = `
        <div class="feed-empty-state">
          <div class="feed-empty-icon">${isBusca ? '🔍' : '📋'}</div>
          <p>${isBusca ? 'Nenhum chamado corresponde à pesquisa.' : 'Nenhum chamado registrado ainda.'}</p>
          <p style="font-size: 0.8rem; margin-top: 0.35rem; color: var(--text-dim);">
            ${isBusca ? 'Tente buscar por outro termo ou limpe a busca.' : 'Abra um novo chamado usando o formulário ao lado.'}
          </p>
        </div>
      `;
      return;
    }

    ticketsFeed.innerHTML = chamadosFiltrados.map(item => `
      <article class="ticket-item-card" data-id="${item.id}">
        <div class="ticket-top-row">
          <span class="ticket-id-tag">🎫 #${item.id}</span>
          <div class="ticket-actions">
            <span class="ticket-time-ago" title="${new Date(item.dataCriacao).toLocaleString('pt-BR')}">
              ${formatarTempoRelativo(item.dataCriacao)}
            </span>
            <button type="button" class="btn-icon-copy" title="Copiar título" data-copy="${escapeHtml(item.titulo)}">
              📋
            </button>
          </div>
        </div>
        <h3 class="ticket-headline">${escapeHtml(item.titulo)}</h3>
        ${item.descricao ? `<p class="ticket-body">${escapeHtml(item.descricao)}</p>` : ''}
      </article>
    `).join('');

    // Listener para botões de copiar
    ticketsFeed.querySelectorAll('.btn-icon-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const texto = e.currentTarget.getAttribute('data-copy');
        navigator.clipboard.writeText(texto).then(() => {
          showToast('Copiado!', 'Título copiado para a área de transferência', 'success');
        });
      });
    });
  }

  // =========================================================================
  // Busca e Filtro Instantâneo
  // =========================================================================
  function filtrarChamados() {
    const termo = searchInput.value.trim().toLowerCase();

    if (termo === '') {
      clearSearchBtn.style.display = 'none';
      chamadosFiltrados = [...todosChamados].reverse();
    } else {
      clearSearchBtn.style.display = 'block';
      chamadosFiltrados = todosChamados.filter(item => {
        const idMatch = `#${item.id}`.includes(termo) || String(item.id).includes(termo);
        const tituloMatch = item.titulo.toLowerCase().includes(termo);
        const descMatch = item.descricao ? item.descricao.toLowerCase().includes(termo) : false;
        return idMatch || tituloMatch || descMatch;
      }).reverse();
    }

    renderizarChamados();
  }

  searchInput.addEventListener('input', filtrarChamados);

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filtrarChamados();
    searchInput.focus();
  });

  // =========================================================================
  // Buscar Chamados da API (GET /chamados)
  // =========================================================================
  async function carregarChamadosAPI() {
    try {
      const res = await fetch('/chamados');
      if (!res.ok) throw new Error('Falha ao obter lista');
      todosChamados = await res.json();
      filtrarChamados();
    } catch (err) {
      console.error('Erro ao conectar na API:', err);
      showToast('Erro de Conexão', 'Não foi possível carregar os chamados da API', 'error');
    }
  }

  // =========================================================================
  // Criar Chamado (POST /chamados)
  // =========================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = inputTitulo.value;
    const descricao = inputDescricao.value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Enviando...</span>`;

    try {
      const res = await fetch('/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Chamado Criado!', `${data.mensagem} (#${data.chamado.id})`, 'success');
        inputTitulo.value = '';
        inputDescricao.value = '';
        atualizarValidacaoTitulo();
        await carregarChamadosAPI();
      } else {
        showToast(`Erro ${res.status}`, data.erro || 'Falha na validação', 'error');
      }
    } catch (err) {
      showToast('Erro no Servidor', 'Falha ao se comunicar com a API', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Enviar Chamado (POST /chamados)</span>`;
    }
  });

  // =========================================================================
  // Atalhos de Teclado
  // =========================================================================
  document.addEventListener('keydown', (e) => {
    // Ctrl + Enter ou Cmd + Enter para submeter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (document.activeElement === inputTitulo || document.activeElement === inputDescricao) {
        form.requestSubmit();
      }
    }
    // Escape para limpar campos ou busca
    if (e.key === 'Escape') {
      if (document.activeElement === searchInput) {
        searchInput.value = '';
        filtrarChamados();
      } else {
        inputTitulo.value = '';
        inputDescricao.value = '';
        atualizarValidacaoTitulo();
      }
    }
  });

  // Utilitário de escape HTML
  function escapeHtml(texto) {
    if (!texto) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(texto).replace(/[&<>"']/g, m => map[m]);
  }

  // Inicialização
  atualizarValidacaoTitulo();
  carregarChamadosAPI();
});
