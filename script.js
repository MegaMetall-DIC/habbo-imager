document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTOS DO DOM
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
    
    // Zoom Avatar
    zoomRange: document.getElementById('zoomRange'),
    zoomValue: document.getElementById('zoomValue'),
    
    // Upscaler Emblema
    badgeImg: document.getElementById('badgePreviewImg'),
    badgeUrlInput: document.getElementById('badgeUrlInput'),
    badgeZoomRange: document.getElementById('badgeZoomRange'),
    badgeZoomValue: document.getElementById('badgeZoomValue'),
    downloadBadgeBtn: document.getElementById('downloadBadgeBtn'),
    badgePlaceholder: document.getElementById('badgePlaceholderText'),

    // Grupos
    groupsContainer: document.getElementById('groupsContainer')
  };

  if (!elements.loadBtn) return; // Evita erros se o HTML estiver incompleto

  // --- ESTADO AVATAR ---
  let currentState = {
    direction: 2,
    headDirection: 2,
    headOnly: false
  };

  // --- FUNÇÃO AVATAR ---
  function updateAvatar() {
    const nick = elements.nick.value.trim();
    const hotel = elements.hotel.value;
    let domain = hotel === 'com' ? 'com' : (hotel === 'es' ? 'es' : 'com.br');
    
    const baseUrl = `https://www.habbo.${domain}/habbo-imaging/avatarimage`;
    const params = new URLSearchParams({
      user: nick,
      direction: currentState.direction,
      head_direction: currentState.direction,
      action: elements.action.value,
      gesture: elements.gesture.value,
      size: elements.size.value,
      img_format: elements.format.value
    });

    if (currentState.headOnly) params.set('headonly', '1');

    const fullUrl = `${baseUrl}?${params.toString()}`;
    elements.avatarImg.src = fullUrl;
    elements.urlOutput.value = fullUrl;
  }

  // --- FUNÇÃO GRUPOS ---
  async function carregarGrupos(nick) {
    if(!nick) return;
    elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3'>Carregando grupos...</p>";

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000); 

      const res = await fetch(
        "https://raspy-darkness-de40dic-habbo-groups.alvesedu-br.workers.dev/?nick=" +
          encodeURIComponent(nick),
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error("Erro worker");
      const grupos = await res.json();

      if (!Array.isArray(grupos) || grupos.length === 0) {
        elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3'>Nenhum grupo encontrado.</p>";
        return;
      }

      // Ordenar (DIC/Polícia primeiro)
      grupos.sort((a, b) => {
        const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
        const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
        return bDIC - aDIC;
      });

      elements.groupsContainer.innerHTML = "";

      grupos.forEach(g => {
        const div = document.createElement("div");
        div.className = "group-card";
        div.title = "Clique para ampliar este emblema"; // Tooltip

        const img = document.createElement("img");
        img.src = g.badge; 
        
        const span = document.createElement("span");
        span.textContent = g.name;

        div.appendChild(img);
        div.appendChild(span);
        elements.groupsContainer.appendChild(div);

        // --- EVENTO DE CLIQUE NO GRUPO ---
        div.addEventListener('click', () => {
          // 1. Atualiza a imagem do upscaler
          elements.badgeImg.src = g.badge;
          elements.badgeUrlInput.value = g.badge;
          elements.badgePlaceholder.style.display = 'none'; // Esconde texto de ajuda
          
          // 2. Reseta o zoom do emblema para 1x
          elements.badgeZoomRange.value = 1;
          elements.badgeImg.style.transform = `scale(1)`;
          elements.badgeZoomValue.textContent = "1x";

          // 3. Rola a página até a caixa do upscaler suavemente
          document.getElementById('badgeSection').scrollIntoView({ behavior: 'smooth' });
        });
      });

    } catch (err) {
      console.error(err);
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro ao buscar grupos.</p>";
    }
  }

  // --- LISTENERS ---

  elements.loadBtn.addEventListener('click', () => {
    updateAvatar();
    carregarGrupos(elements.nick.value);
  });

  // Selects
  ['hotel', 'gesture', 'action', 'size', 'format'].forEach(id => {
    const el = document.getElementById(id + 'Select');
    if(el) el.addEventListener('change', updateAvatar);
  });

  // Rotação Avatar
  elements.rotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      currentState.direction = dir === '1' 
        ? (currentState.direction + 1) % 8 
        : (currentState.direction - 1 + 8) % 8;
      updateAvatar();
    });
  });

  elements.headToggle.addEventListener('click', () => {
    currentState.headOnly = !currentState.headOnly;
    elements.headToggle.classList.toggle('active');
    updateAvatar();
  });

  // Zoom Avatar (Range)
  elements.zoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.avatarImg.style.transform = `scale(${val})`;
    elements.zoomValue.textContent = `${Math.round(val * 100)}%`;
  });

  // --- LOGICA UPSCALER EMBLEMA ---
  elements.badgeZoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.badgeImg.style.transform = `scale(${val})`;
    elements.badgeZoomValue.textContent = val + "x";
  });

  // Download Emblema (Simples)
  elements.downloadBadgeBtn.addEventListener('click', () => {
    if (!elements.badgeUrlInput.value) {
      alert("Selecione um grupo primeiro!");
      return;
    }
    const a = document.createElement('a');
    a.href = elements.badgeImg.src;
    a.download = 'emblema_habbo.gif';
    a.target = '_blank';
    a.click();
  });

  // Download Avatar
  elements.downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = elements.avatarImg.src;
    a.download = elements.nick.value + '.png';
    a.target = '_blank';
    a.click();
  });

  // Copiar URL Avatar
  elements.copyBtn.addEventListener('click', () => {
    elements.urlOutput.select();
    document.execCommand('copy');
    alert('Link copiado!');
  });

  // Iniciar
  updateAvatar();
});
