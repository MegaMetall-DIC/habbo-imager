document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    nick: document.getElementById('nickInput'),
    hotel: document.getElementById('hotelSelect'),
    gesture: document.getElementById('gestureSelect'),
    action: document.getElementById('actionSelect'),
    leftHand: document.getElementById('leftHandSelect'),
    rightHand: document.getElementById('rightHandSelect'),
    sizeBtns: document.querySelectorAll('.size-btn'),
    format: document.getElementById('formatSelect'),
    avatarImg: document.getElementById('avatarImg'),
    loadBtn: document.getElementById('loadBtn'),
    headToggle: document.getElementById('headOnlyBtn'),
    rotBtns: document.querySelectorAll('.rot-btn'),
    urlOutput: document.getElementById('urlOutput'),
    
    // Zoom Avatar
    zoomRange: document.getElementById('zoomRange'),
    zoomValue: document.getElementById('zoomValue'),
    btnApplyZoomAvatar: document.getElementById('btnApplyZoomAvatar'),
    btnCopyZoomAvatar: document.getElementById('btnCopyZoomAvatar'),

    // Upscaler Badge
    badgeImg: document.getElementById('badgePreviewImg'),
    badgeUrlInput: document.getElementById('badgeUrlInput'),
    badgeZoomRange: document.getElementById('badgeZoomRange'),
    badgeZoomValue: document.getElementById('badgeZoomValue'),
    btnApplyZoomBadge: document.getElementById('btnApplyZoomBadge'),
    btnCopyZoomBadge: document.getElementById('btnCopyZoomBadge'),
    badgePlaceholder: document.getElementById('badgePlaceholderText'),
    
    groupsContainer: document.getElementById('groupsContainer')
  };

  if (!elements.loadBtn) return;

  function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    toast.className = 'show' + (type === 'error' ? ' error' : '');
    toast.style.borderLeftColor = type === 'error' ? '#ff4444' : '#e60000';
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
  }

  // --- LÓGICA DE UPSCALING REAL (CANVAS) ---
  // Função que cria uma imagem aumentada internamente para download/cópia
  async function processImage(imgElement, scale, format = 'blob') {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Desativa suavização para manter pixel art
      ctx.imageSmoothingEnabled = false;

      // Tamanho original
      const w = imgElement.naturalWidth;
      const h = imgElement.naturalHeight;

      if(w === 0 || h === 0) {
        reject("Imagem não carregada");
        return;
      }

      // Tamanho com zoom
      canvas.width = w * scale;
      canvas.height = h * scale;
      
      // Deixa suavização desativada no contexto também
      ctx.imageSmoothingEnabled = false;

      // Desenha
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      if (format === 'blob') {
        canvas.toBlob(blob => resolve(blob), 'image/png');
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    });
  }

  // --- ESTADO INICIAL ---
  let currentState = {
    direction: 2,
    headDirection: 2,
    headOnly: false,
    size: 'm'
  };

  // --- FUNÇÃO AVATAR ---
  function updateAvatar() {
    const nick = elements.nick.value.trim();
    if(!nick) return;

    const hotel = elements.hotel.value;
    let domain = hotel === 'com' ? 'com' : (hotel === 'es' ? 'es' : 'com.br');
    const baseUrl = `https://www.habbo.${domain}/habbo-imaging/avatarimage`;
    
    let actionVal = elements.action.value;
    const rightHandVal = elements.rightHand.value;
    const leftHandVal = elements.leftHand.value;
    let gestureVal = elements.gesture.value;

    let paramsObj = {
      user: nick,
      direction: currentState.direction,
      head_direction: currentState.direction,
      gesture: gestureVal,
      size: currentState.size,
      img_format: elements.format.value
    };

    let actionsArray = [];
    if(actionVal !== 'std') actionsArray.push(actionVal);
    
    // Tratamento Mãos
    if (['wav', 'blow'].includes(rightHandVal)) {
      actionsArray.push(rightHandVal);
    } else if (rightHandVal === 'respect') {
      gestureVal = 'srp'; 
    } else if (parseInt(rightHandVal) > 0) {
       actionsArray.push(`crr=${rightHandVal}`);
    }

    if (parseInt(leftHandVal) > 0) {
       const drinks = ['1','2','3','5','6','9','33','42'];
       if(drinks.includes(leftHandVal)) {
         actionsArray.push(`drk=${leftHandVal}`);
       } else {
         actionsArray.push(`crr=${leftHandVal}`);
       }
    }

    if(actionsArray.length > 0) paramsObj.action = actionsArray.join(',');
    paramsObj.gesture = gestureVal;
    if (currentState.headOnly) paramsObj.headonly = '1';

    const params = new URLSearchParams(paramsObj);
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    // Importante: resetar o scale visual ao mudar a imagem
    // elements.avatarImg.style.transform = `scale(${elements.zoomRange.value})`; 
    // ^ Na verdade, mantemos o visual scale atual
    
    elements.avatarImg.src = fullUrl;
    elements.urlOutput.value = fullUrl;
  }

  // --- FUNÇÃO GRUPOS ---
  async function carregarGrupos(nick) {
    if(!nick) {
      showToast("Digite um nick!", "error");
      return;
    }
    const originalBtnText = elements.loadBtn.textContent;
    elements.loadBtn.textContent = "...";
    elements.loadBtn.disabled = true;
    elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3; margin-top:20px'>Buscando...</p>";

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

      elements.loadBtn.textContent = originalBtnText;
      elements.loadBtn.disabled = false;

      if (!Array.isArray(grupos) || grupos.length === 0) {
        elements.groupsContainer.innerHTML = "<p style='color:#b38080'>Nenhum grupo.</p>";
        showToast("Perfil privado ou sem grupos.", "error");
        return;
      }

      grupos.sort((a, b) => {
        const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
        const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
        return bDIC - aDIC;
      });

      elements.groupsContainer.innerHTML = "";
      showToast(`${grupos.length} grupos carregados!`);

      let firstGroupCard = null;

      grupos.forEach((g, index) => {
        const div = document.createElement("div");
        div.className = "group-card";
        div.title = g.name;

        const img = document.createElement("img");
        img.src = g.badge; 
        
        const span = document.createElement("span");
        span.textContent = g.name.substring(0, 20) + (g.name.length > 20 ? '...' : '');

        div.appendChild(img);
        div.appendChild(span);
        elements.groupsContainer.appendChild(div);

        // Click Event
        div.addEventListener('click', () => {
          if(elements.badgeImg) {
            elements.badgeImg.src = g.badge;
            elements.badgeUrlInput.value = g.badge;
            elements.badgePlaceholder.style.display = 'none';
            // Reset zoom ao mudar emblema
            elements.badgeZoomRange.value = 1;
            elements.badgeImg.style.transform = `scale(1)`;
            elements.badgeZoomValue.textContent = "1x";
            
            // Scroll suave
            const section = document.getElementById('badgeSection');
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            section.style.borderColor = "#e60000";
            setTimeout(() => { section.style.borderColor = "#4a0a0a"; }, 800);
          }
        });

        // Salva o primeiro card
        if (index === 0) firstGroupCard = div;
      });

      // AUTO-SELECT: Clica no primeiro grupo automaticamente
      if (firstGroupCard) {
        // Dispara o clique sem scrollar a tela (para não assustar o user)
        if(elements.badgeImg) {
          const firstG = grupos[0];
          elements.badgeImg.src = firstG.badge;
          elements.badgeUrlInput.value = firstG.badge;
          elements.badgePlaceholder.style.display = 'none';
        }
      }

    } catch (err) {
      console.error(err);
      elements.loadBtn.textContent = originalBtnText;
      elements.loadBtn.disabled = false;
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro.</p>";
    }
  }

  // --- EVENT LISTENERS ---

  elements.loadBtn.addEventListener('click', () => {
    updateAvatar();
    carregarGrupos(elements.nick.value);
  });

  // ENTER no input
  elements.nick.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.loadBtn.click();
  });

  ['hotel', 'gesture', 'action', 'leftHand', 'rightHand', 'format'].forEach(id => {
    const el = document.getElementById(id + 'Select');
    if(el) el.addEventListener('change', updateAvatar);
  });

  elements.sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentState.size = btn.getAttribute('data-size');
      updateAvatar();
    });
  });

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

  // --- ZOOM VISUAL ---
  elements.zoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.avatarImg.style.transform = `scale(${val})`;
    elements.zoomValue.textContent = val + "x";
  });

  elements.badgeZoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.badgeImg.style.transform = `scale(${val})`;
    elements.badgeZoomValue.textContent = val + "x";
  });

  // --- BOTÕES DE AÇÃO (AVATAR) ---
  // 1. Aplicar/Baixar Avatar Zoomed
  elements.btnApplyZoomAvatar.addEventListener('click', async () => {
    try {
      const scale = parseFloat(elements.zoomRange.value);
      const blob = await processImage(elements.avatarImg, scale, 'blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avatar_zoom_${scale}x.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Download iniciado!");
    } catch (e) { showToast("Erro ao processar imagem", "error"); }
  });

  // 2. Copiar Avatar Zoomed
  elements.btnCopyZoomAvatar.addEventListener('click', async () => {
    try {
      const scale = parseFloat(elements.zoomRange.value);
      const blob = await processImage(elements.avatarImg, scale, 'blob');
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      showToast("Imagem copiada com zoom!");
    } catch (e) { 
      console.error(e);
      showToast("Navegador não suporta cópia direta.", "error"); 
    }
  });

  // --- BOTÕES DE AÇÃO (EMBLEMA) ---
  // 1. Aplicar/Baixar Emblema Zoomed
  elements.btnApplyZoomBadge.addEventListener('click', async () => {
    try {
      const scale = parseFloat(elements.badgeZoomRange.value);
      const blob = await processImage(elements.badgeImg, scale, 'blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emblema_zoom_${scale}x.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast("Erro/Sem emblema", "error"); }
  });

  // 2. Copiar Emblema Zoomed
  elements.btnCopyZoomBadge.addEventListener('click', async () => {
    try {
      const scale = parseFloat(elements.badgeZoomRange.value);
      const blob = await processImage(elements.badgeImg, scale, 'blob');
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      showToast("Emblema copiado!");
    } catch (e) { showToast("Erro ao copiar", "error"); }
  });

  // Inicializar
  updateAvatar();
});
