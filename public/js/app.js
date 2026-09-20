/**
 * TicketFlow - Service Desk
 * Frontend reativo com Workflow de Atendimento (Solicitante vs Equipe de Suporte)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM - Perfil & Layout
  const roleBtnSolicitante = document.getElementById('roleBtnSolicitante');
  const roleBtnSuporte = document.getElementById('roleBtnSuporte');
  const roleBanner = document.getElementById('roleBanner');
  const formColumn = document.getElementById('formColumn');
  const dashboardGrid = document.getElementById('dashboardGrid');
  const statusFilterTabs = document.getElementById('statusFilterTabs');

  // Elementos do Formulário
  const form = document.getElementById('ticketForm');
  const inputTitulo = document.getElementById('inputTitulo');
  const inputDescricao = document.getElementById('inputDescricao');
  const fieldStatus = document.getElementById('fieldStatus');
  const progressBar = document.getElementById('progressBar');
  const submitBtn = document.getElementById('submitBtn');

  // Elementos de Busca e Feed
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const ticketsFeed = document.getElementById('ticketsFeed');
  const statTotal = document.getElementById('statTotal');
  const statRecent = document.getElementById('statRecent');
  const statOpen = document.getElementById('statOpen');
  const toastContainer = document.getElementById('toastContainer');

  // Modal de Resolução
  const resolutionModal = document.getElementById('resolutionModal');
  const modalTicketId = document.getElementById('modalTicketId');
  const modalTicketTitle = document.getElementById('modalTicketTitle');
  const inputTecnico = document.getElementById('inputTecnico');
  const inputResolucao = document.getElementById('inputResolucao');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const formResolucao = document.getElementById('formResolucao');

  // Estado Local
  let currentRole = 'solicitante'; // 'solicitante' | 'suporte'
  let currentStatusFilter = 'TODOS'; // 'TODOS' | 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO'
  let todosChamados = [];
  let chamadosFiltrados = [];
  let resolvingTicketId = null;

  // Recupera nome do técnico salvo localmente
  const savedTechName = localStorage.getItem('ticketflow_tech_name') || 'Analista de Suporte';
  inputTecnico.value = savedTechName;

  // =========================================================================
  // Alternância de Papel (Solicitante vs Equipe de Suporte)
  // =========================================================================
  function alternarPapel(novoPapel) {
    currentRole = novoPapel;

    if (novoPapel === 'solicitante') {
      roleBtnSolicitante.classList.add('active');
      roleBtnSolicitante.setAttribute('aria-selected', 'true');
      roleBtnSuporte.classList.remove('active');
      roleBtnSuporte.setAttribute('aria-selected', 'false');

      roleBanner.className = 'role-banner solicitante';
      roleBanner.innerHTML = `
        <span>👤 <strong>Visão do Solicitante:</strong> Abra novos chamados e acompanhe o andamento dos seus incidentes.</span>
      `;

      formColumn.style.display = 'flex';
      dashboardGrid.classList.remove('single-column');
      statusFilterTabs.style.display = 'none';
      currentStatusFilter = 'TODOS';
    } else {
      roleBtnSuporte.classList.add('active');
      roleBtnSuporte.setAttribute('aria-selected', 'true');
      roleBtnSolicitante.classList.remove('active');
      roleBtnSolicitante.setAttribute('aria-selected', 'false');

      roleBanner.className = 'role-banner suporte';
      roleBanner.innerHTML = `
        <span>🛠️ <strong>Painel da Equipe de Suporte:</strong> Assuma incidentes, aplique soluções técnicas e finalize os atendimentos.</span>
      `;

      formColumn.style.display = 'none';
      dashboardGrid.classList.add('single-column');
      statusFilterTabs.style.display = 'flex';
    }

    filtrarChamados();
  }

  roleBtnSolicitante.addEventListener('click', () => alternarPapel('solicitante'));
  roleBtnSuporte.addEventListener('click', () => alternarPapel('suporte'));

  // Filtros de status (exclusivo para Suporte)
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.getAttribute('data-status');
      filtrarChamados();
    });
  });

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

    const icon = tipo === 'success' ? '✓' : (tipo === 'info' ? 'ℹ️' : '⚠️');

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
  // Formatação de Tempo Relativo
  // =========================================================================
  function formatarTempoRelativo(isoString) {
    if (!isoString) return '';
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
  // Mapeamento de Status
  // =========================================================================
  const statusConfig = {
    ABERTO: {
      label: 'Aguardando Atendimento',
      classe: 'aberto',
      icone: '🟡'
    },
    EM_ATENDIMENTO: {
      label: 'Em Atendimento',
      classe: 'em_atendimento',
      icone: '🔵'
    },
    RESOLVIDO: {
      label: 'Resolvido',
      classe: 'resolvido',
      icone: '🟢'
    },
    CANCELADO: {
      label: 'Cancelado',
      classe: 'cancelado',
      icone: '🔴'
    }
  };

  // =========================================================================
  // Renderização do Feed de Chamados
  // =========================================================================
  function renderizarChamados() {
    statTotal.textContent = todosChamados.length;
    statRecent.textContent = todosChamados.length > 0 ? `#${todosChamados[todosChamados.length - 1].id}` : '-';
    
    const abertos = todosChamados.filter(c => c.status === 'ABERTO').length;
    statOpen.textContent = abertos;

    // Atualiza contadores nas abas de filtro do Suporte
    document.getElementById('countTodos').textContent = todosChamados.length;
    document.getElementById('countAbertos').textContent = abertos;
    document.getElementById('countEmAtendimento').textContent = todosChamados.filter(c => c.status === 'EM_ATENDIMENTO').length;
    document.getElementById('countResolvidos').textContent = todosChamados.filter(c => c.status === 'RESOLVIDO').length;

    if (chamadosFiltrados.length === 0) {
      const isBusca = searchInput.value.trim().length > 0;
      ticketsFeed.innerHTML = `
        <div class="feed-empty-state">
          <div class="feed-empty-icon">${isBusca ? '🔍' : '📋'}</div>
          <p>${isBusca ? 'Nenhum chamado corresponde à pesquisa.' : 'Nenhum chamado nesta categoria.'}</p>
          <p style="font-size: 0.8rem; margin-top: 0.35rem; color: var(--text-dim);">
            ${isBusca ? 'Tente buscar por outro termo ou limpe a busca.' : 'Aguardando novas solicitações de suporte.'}
          </p>
        </div>
      `;
      return;
    }

    ticketsFeed.innerHTML = chamadosFiltrados.map(item => {
      const cfg = statusConfig[item.status] || statusConfig.ABERTO;
      const isSuporte = currentRole === 'suporte';

      return `
        <article class="ticket-item-card" data-id="${item.id}">
          <div class="ticket-top-row">
            <div class="ticket-top-left">
              <span class="ticket-id-tag">🎫 #${item.id}</span>
              <span class="status-badge-pill ${cfg.classe}">
                ${cfg.icone} ${cfg.label}
              </span>
              ${item.responsavel ? `<span style="font-size: 0.72rem; color: var(--text-dim);">• Resp: ${escapeHtml(item.responsavel)}</span>` : ''}
            </div>

            <div class="ticket-actions">
              <span class="ticket-time-ago" title="${new Date(item.dataCriacao).toLocaleString('pt-BR')}">
                ${formatarTempoRelativo(item.dataCriacao)}
              </span>
              <button type="button" class="btn-icon-copy" title="Copiar título" data-copy="${escapeHtml(item.titulo)}">
                📋
              </button>
              ${isSuporte ? `
                <button type="button" class="btn-icon-delete" title="Excluir chamado" data-delete-id="${item.id}">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>

          <h3 class="ticket-headline">${escapeHtml(item.titulo)}</h3>
          ${item.descricao ? `<p class="ticket-body">${escapeHtml(item.descricao)}</p>` : ''}

          ${item.resolucao ? `
            <div class="solution-box">
              <div class="solution-title">💡 Solução Técnica Concluída:</div>
              <div>${escapeHtml(item.resolucao)}</div>
              ${item.dataAtualizacao ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">Finalizado em: ${new Date(item.dataAtualizacao).toLocaleString('pt-BR')}</div>` : ''}
            </div>
          ` : ''}

          ${isSuporte ? `
            <div class="card-workflow-actions">
              <span style="font-size: 0.75rem; color: var(--text-dim); margin-right: 0.25rem;">Ações do Técnico:</span>
              ${item.status === 'ABERTO' ? `
                <button type="button" class="btn-action-sm btn-action-take" data-action="take" data-id="${item.id}">
                  ▶ Iniciar Atendimento
                </button>
                <button type="button" class="btn-action-sm btn-action-cancel" data-action="cancel" data-id="${item.id}">
                  ✕ Cancelar
                </button>
              ` : ''}

              ${item.status === 'EM_ATENDIMENTO' ? `
                <button type="button" class="btn-action-sm btn-action-resolve" data-action="resolve" data-id="${item.id}" data-title="${escapeHtml(item.titulo)}">
                  ✓ Registrar Solução & Concluir
                </button>
                <button type="button" class="btn-action-sm btn-action-cancel" data-action="cancel" data-id="${item.id}">
                  ✕ Cancelar
                </button>
              ` : ''}

              ${item.status === 'RESOLVIDO' || item.status === 'CANCELADO' ? `
                <button type="button" class="btn-action-sm btn-action-take" data-action="reopen" data-id="${item.id}">
                  ↺ Reabrir Atendimento
                </button>
              ` : ''}
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    // Listener para botões de copiar
    ticketsFeed.querySelectorAll('.btn-icon-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const texto = e.currentTarget.getAttribute('data-copy');
        navigator.clipboard.writeText(texto).then(() => {
          showToast('Copiado!', 'Título copiado para a área de transferência', 'success');
        });
      });
    });

    // Listener para botões de excluir
    ticketsFeed.querySelectorAll('.btn-icon-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-delete-id');
        if (confirm(`Tem certeza que deseja excluir permanentemente o chamado #${id}?`)) {
          await excluirChamado(id);
        }
      });
    });

    // Listener para ações do workflow (Suporte)
    ticketsFeed.querySelectorAll('.card-workflow-actions button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const id = e.currentTarget.getAttribute('data-id');

        if (action === 'take') {
          await atualizarStatusChamado(id, 'EM_ATENDIMENTO');
        } else if (action === 'cancel') {
          if (confirm(`Deseja cancelar o chamado #${id}?`)) {
            await atualizarStatusChamado(id, 'CANCELADO');
          }
        } else if (action === 'reopen') {
          await atualizarStatusChamado(id, 'EM_ATENDIMENTO');
        } else if (action === 'resolve') {
          const title = e.currentTarget.getAttribute('data-title');
          abrirModalResolucao(id, title);
        }
      });
    });
  }

  // =========================================================================
  // Ações de Atendimento (Chamadas à API)
  // =========================================================================
  async function atualizarStatusChamado(id, status) {
    try {
      const responsavel = inputTecnico.value.trim() || 'Analista de Suporte';
      localStorage.setItem('ticketflow_tech_name', responsavel);

      const res = await fetch(`/chamados/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, responsavel })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Status Atualizado', `Chamado #${id} agora está: ${status}`, 'info');
        await carregarChamadosAPI();
      } else {
        showToast('Erro ao atualizar', data.erro || 'Falha na requisição', 'error');
      }
    } catch (err) {
      showToast('Erro de Conexão', 'Falha ao se comunicar com o servidor', 'error');
    }
  }

  async function excluirChamado(id) {
    try {
      const res = await fetch(`/chamados/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Chamado Excluído', `Chamado #${id} removido com sucesso`, 'success');
        await carregarChamadosAPI();
      } else {
        showToast('Erro ao excluir', 'Não foi possível remover o chamado', 'error');
      }
    } catch (err) {
      showToast('Erro de Conexão', 'Falha ao se comunicar com o servidor', 'error');
    }
  }

  // Modal de Resolução
  function abrirModalResolucao(id, title) {
    resolvingTicketId = id;
    modalTicketId.textContent = `#${id}`;
    modalTicketTitle.textContent = title;
    inputResolucao.value = '';
    resolutionModal.classList.remove('hidden');
    inputResolucao.focus();
  }

  function fecharModalResolucao() {
    resolvingTicketId = null;
    resolutionModal.classList.add('hidden');
  }

  btnCloseModal.addEventListener('click', fecharModalResolucao);
  btnCancelModal.addEventListener('click', fecharModalResolucao);

  formResolucao.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!resolvingTicketId) return;

    const resolucao = inputResolucao.value.trim();
    const responsavel = inputTecnico.value.trim() || 'Analista de Suporte';
    localStorage.setItem('ticketflow_tech_name', responsavel);

    if (!resolucao) {
      alert('Por favor, descreva a solução técnica aplicada.');
      return;
    }

    try {
      const res = await fetch(`/chamados/${resolvingTicketId}/resolucao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolucao, responsavel })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Chamado Resolvido! 🟢', `Chamado #${resolvingTicketId} foi finalizado com sucesso.`, 'success');
        fecharModalResolucao();
        await carregarChamadosAPI();
      } else {
        showToast('Erro ao resolver', data.erro || 'Falha na validação', 'error');
      }
    } catch (err) {
      showToast('Erro de Conexão', 'Falha ao comunicar com o servidor', 'error');
    }
  });

  // =========================================================================
  // Busca e Filtro Instantâneo
  // =========================================================================
  function filtrarChamados() {
    const termo = searchInput.value.trim().toLowerCase();

    chamadosFiltrados = todosChamados.filter(item => {
      // Filtro por Status (se na visão de suporte)
      if (currentRole === 'suporte' && currentStatusFilter !== 'TODOS') {
        if (item.status !== currentStatusFilter) return false;
      }

      // Filtro por Termo de Busca
      if (termo === '') return true;
      const idMatch = `#${item.id}`.includes(termo) || String(item.id).includes(termo);
      const tituloMatch = item.titulo.toLowerCase().includes(termo);
      const descMatch = item.descricao ? item.descricao.toLowerCase().includes(termo) : false;
      const respMatch = item.responsavel ? item.responsavel.toLowerCase().includes(termo) : false;
      return idMatch || tituloMatch || descMatch || respMatch;
    }).reverse();

    clearSearchBtn.style.display = termo !== '' ? 'block' : 'none';
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
    submitBtn.innerHTML = `<span>Enviando chamado...</span>`;

    try {
      const res = await fetch('/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Chamado Criado com Sucesso! 🎫', `${data.mensagem} (#${data.chamado.id})`, 'success');
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
      } else if (document.activeElement === inputResolucao) {
        formResolucao.requestSubmit();
      }
    }
    // Escape para fechar modal ou limpar
    if (e.key === 'Escape') {
      if (!resolutionModal.classList.contains('hidden')) {
        fecharModalResolucao();
      } else if (document.activeElement === searchInput) {
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
  alternarPapel('solicitante');
  atualizarValidacaoTitulo();
  carregarChamadosAPI();
});
