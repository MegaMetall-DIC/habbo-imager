document.addEventListener('DOMContentLoaded', () => {
  // Pegando todos os elementos
  const elements = {
    nick: document.getElementById('nickInput'),
    hotel: document.getElementById('hotelSelect'),
    gesture: document.getElementById('gestureSelect'),
    action: document.getElementById('actionSelect'),
    size: document.getElementById('sizeSelect'),
    format: document.getElementById('formatSelect'),
    avatarImg: document.getElementById('avatarImg'),
    loadBtn: document.getElementById('loadBtn'),
    headToggle: document.getElementById('headOnlyBtn'),
    rotBtns: document.querySelectorAll('.rot-btn'),
    urlOutput: document.getElementById('urlOutput'),
    copyBtn: document.getElementById('copyUrlBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    zoomRange: document.getElementById('zoomRange'),
    zoomValue: document.getElementById('zoomValue'),
    groupsContainer: document.getElementById('groupsContainer')
  };

  // Verifica se o botão principal existe para evitar erros
  if (!elements.loadBtn) {
    console.error("ERRO: Botão 'Aplicar' (loadBtn) não foi encontrado no HTML.");
    return;
  }

  // Estado inicial
  let currentState = {
    direction: 2,
    headDirection: 2,
    headOnly: false
  };

  // --- FUNÇÃO DE ATUALIZAR AVATAR ---
  function updateAvatar() {
    const nick = elements.nick.value.trim();
    const hotel = elements.hotel.value;
    
    // Define domínio
    let domain = 'com.br';
    if(hotel === 'com') domain = 'com';
    if(hotel === 'es') domain = 'es';
    
    const baseUrl = `https://www.habbo.${domain}/habbo-imaging/avatarimage`;
    
    // Constrói URL
    const params = new URLSearchParams({
      user: nick,
      direction: currentState.direction,
      head_direction: currentState.direction,
      action: elements.action.value,
      gesture: elements.gesture.value,
      size: elements.size.value,
      img_format: elements.format.value
    });

    if (currentState.headOnly) {
      params.set('headonly', '1');
    }

    const fullUrl = `${baseUrl}?${params.toString()}`;

    // Atualiza a imagem e o campo de texto
    elements.avatarImg.src = fullUrl;
    elements.urlOutput.value = fullUrl;
  }

  // --- FUNÇÃO DE CARREGAR GRUPOS ---
  async function carregarGrupos(nick) {
    if(!nick) return;
    elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3'>Carregando grupos...</p>";

    try {
      // Timeout de 8 segundos para não travar
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000); 

      const res = await fetch(
        "https://raspy-darkness-de40dic-habbo-groups.alvesedu-br.workers.dev/?nick=" +
          encodeURIComponent(nick),
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error("Erro na conexão");

      const grupos = await res.json();

      if (!Array.isArray(grupos) || grupos.length === 0) {
        elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3'>Nenhum grupo encontrado.</p>";
        return;
      }

      // Ordenar por relevância (DIC/Polícia)
      grupos.sort((a, b) => {
        const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
        const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
        return bDIC - aDIC;
      });

      elements.groupsContainer.innerHTML = "";

      grupos.forEach(g => {
        const div = document.createElement("div");
        div.className = "group-card";
        
        const img = document.createElement("img");
        img.src = g.badge; 
        
        const span = document.createElement("span");
        span.textContent = g.name;

        div.appendChild(img);
        div.appendChild(span);
        elements.groupsContainer.appendChild(div);
      });

    } catch (err) {
      console.error(err);
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro ao buscar grupos.</p>";
    }
  }

  // --- EVENTOS (CLIQUES) ---
  
  // Botão Aplicar
  elements.loadBtn.addEventListener('click', () => {
    updateAvatar();
    carregarGrupos(elements.nick.value);
  });

  // Mudança nos Selects (atualiza avatar automaticamente)
  ['hotel', 'gesture', 'action', 'size', 'format'].forEach(id => {
    const el = document.getElementById(id + 'Select');
    if(el) el.addEventListener('change', updateAvatar);
  });

  // Botões de Rotação
  elements.rotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      if(dir === '1') {
        currentState.direction = (currentState.direction + 1) % 8;
      } else {
        currentState.direction = (currentState.direction - 1 + 8) % 8;
      }
      updateAvatar();
    });
  });

  // Botão Apenas Cabeça
  elements.headToggle.addEventListener('click', () => {
    currentState.headOnly = !currentState.headOnly;
    elements.headToggle.classList.toggle('active');
    updateAvatar();
  });

  // Zoom
  elements.zoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.avatarImg.style.transform = `scale(${val})`;
    elements.zoomValue.textContent = `${Math.round(val * 100)}%`;
  });

  // Copiar URL
  elements.copyBtn.addEventListener('click', () => {
    elements.urlOutput.select();
    document.execCommand('copy');
    alert('Link copiado!');
  });

  // Download
  elements.downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = elements.avatarImg.src;
    a.download = elements.nick.value + '_avatar.png';
    a.target = '_blank';
    a.click();
  });

  // INICIALIZAÇÃO
  // Carrega o avatar padrão ao abrir a página
  updateAvatar();
});
