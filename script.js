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
    btnRenderAvatar: document.getElementById('btnRenderAvatar'), // Botão Aplicar
    btnDownloadAvatar: document.getElementById('btnDownloadAvatar'),
    btnCopyAvatar: document.getElementById('btnCopyAvatar'),
    avatarStatus: document.getElementById('avatarStatus'),

    // Upscaler Badge
    badgeImg: document.getElementById('badgePreviewImg'),
    badgeUrlInput: document.getElementById('badgeUrlInput'),
    badgeZoomRange: document.getElementById('badgeZoomRange'),
    badgeZoomValue: document.getElementById('badgeZoomValue'),
    btnRenderBadge: document.getElementById('btnRenderBadge'), // Botão Aplicar
    btnDownloadBadge: document.getElementById('btnDownloadBadge'),
    btnCopyBadgeLink: document.getElementById('btnCopyBadgeLink'),
    badgePlaceholder: document.getElementById('badgePlaceholderText'),
    badgeStatus: document.getElementById('badgeStatus'),
    
    groupsContainer: document.getElementById('groupsContainer')
  };

  if (!elements.loadBtn) return;

  // Variáveis para armazenar a imagem "Renderizada"
  let cachedAvatarBlob = null;
  let cachedBadgeBlob = null;

  // --- LÓGICA DE GERAR IMAGEM (CANVAS) ---
  async function createUpscaledBlob(imgUrl, scale) {
    try {
      // Fetch com mode 'cors' para tentar pegar a imagem
      const response = await fetch(imgUrl, { mode: 'cors' });
      if (!response.ok) throw new Error("CORS Block");
      
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      const ctx = canvas.getContext('2d');
      
      ctx.imageSmoothingEnabled = false; // Pixel art nítida
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } catch (err) {
      console.warn("Erro ao renderizar (CORS?):", err);
      return null;
    }
  }

  // --- ATUALIZAR AVATAR ---
  let currentState = {
    direction: 2, headDirection: 2, headOnly: false, size: 'm'
  };

  function updateAvatar() {
    // Ao mudar qualquer coisa no avatar, invalidamos o cache do zoom
    cachedAvatarBlob = null;
    if(elements.avatarStatus) elements.avatarStatus.textContent = "Alterações feitas. Clique em 'Aplicar' para salvar o zoom.";
    if(elements.avatarStatus) elements.avatarStatus.style.color = "#d9b3b3";

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
    
    elements.avatarImg.src = fullUrl;
    elements.urlOutput.value = fullUrl;
  }

  // --- CARREGAR GRUPOS ---
  async function carregarGrupos(nick) {
    if(!nick) return;
    const originalBtnText = elements.loadBtn.textContent;
    elements.loadBtn.textContent = "Buscando...";
    elements.loadBtn.disabled = true;
    elements.groupsContainer.innerHTML = "<p style='color:#d9b3b3; margin-top:20px'>Carregando...</p>";

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
        return;
      }

      grupos.sort((a, b) => {
        const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
        const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
        return bDIC - aDIC;
      });

      elements.groupsContainer.innerHTML = "";
      let firstGroup = null;

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

        div.addEventListener('click', () => {
            selectGroup(g);
            const section = document.getElementById('badgeSection');
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            section.style.borderColor = "#e60000";
            setTimeout(() => { section.style.borderColor = "#4a0a0a"; }, 800);
        });
        
        if (index === 0) firstGroup = g;
      });

      if (firstGroup) selectGroup(firstGroup);

    } catch (err) {
      console.error(err);
      elements.loadBtn.textContent = originalBtnText;
      elements.loadBtn.disabled = false;
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro.</p>";
    }
  }

  function selectGroup(g) {
    if(elements.badgeImg) {
        cachedBadgeBlob = null; // Reseta cache
        if(elements.badgeStatus) elements.badgeStatus.textContent = "Clique na engrenagem para aplicar zoom.";
        if(elements.badgeStatus) elements.badgeStatus.style.color = "#d9b3b3";
        
        elements.badgeImg.src = g.badge;
        elements.badgeUrlInput.value = g.badge;
        elements.badgePlaceholder.style.display = 'none';
        elements.badgeZoomRange.value = 1;
        elements.badgeImg.style.transform = `scale(1)`;
        elements.badgeZoomValue.textContent = "1x";
    }
  }

  // --- CLICK LISTENERS DO AVATAR ---

  // 1. Botão APLICAR (RENDERIZAR) Avatar
  elements.btnRenderAvatar.addEventListener('click', async () => {
    const scale = parseFloat(elements.zoomRange.value);
    elements.avatarStatus.textContent = "Processando...";
    
    const blob = await createUpscaledBlob(elements.avatarImg.src, scale);
    if(blob) {
      cachedAvatarBlob = blob;
      elements.avatarStatus.textContent = `Zoom de ${scale}x aplicado com sucesso! Pode baixar.`;
      elements.avatarStatus.style.color = "#00cc00"; // Verde
    } else {
      elements.avatarStatus.textContent = "Erro ao processar imagem (Bloqueio do Navegador). Baixará a original.";
      elements.avatarStatus.style.color = "#ff4444";
      cachedAvatarBlob = null;
    }
  });

  // 2. Download Avatar (Usa Cache)
  elements.btnDownloadAvatar.addEventListener('click', () => {
    if (cachedAvatarBlob) {
        // Baixa a versão renderizada
        const url = URL.createObjectURL(cachedAvatarBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${elements.nick.value}_zoom.png`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        // Fallback: Baixa original
        const a = document.createElement('a');
        a.href = elements.avatarImg.src;
        a.download = `${elements.nick.value}.png`;
        a.click();
        alert("Baixando versão original. (Clique em 'Aplicar' primeiro para zoom HD)");
    }
  });

  // 3. Copiar Avatar (Usa Cache)
  elements.btnCopyAvatar.addEventListener('click', async () => {
      if (cachedAvatarBlob) {
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": cachedAvatarBlob })]);
            alert("Imagem com zoom copiada!");
        } catch(e) { alert("Erro ao copiar."); }
      } else {
          // Copia apenas link
          elements.urlOutput.select();
          document.execCommand('copy');
          alert("Link copiado! (Para copiar imagem com zoom, clique em 'Aplicar' primeiro)");
      }
  });

  // --- CLICK LISTENERS DO EMBLEMA ---

  // 1. Botão APLICAR (RENDERIZAR) Emblema
  elements.btnRenderBadge.addEventListener('click', async () => {
    const scale = parseFloat(elements.badgeZoomRange.value);
    elements.badgeStatus.textContent = "Processando...";
    
    const blob = await createUpscaledBlob(elements.badgeImg.src, scale);
    if(blob) {
      cachedBadgeBlob = blob;
      elements.badgeStatus.textContent = `Zoom de ${scale}x aplicado!`;
      elements.badgeStatus.style.color = "#00cc00";
    } else {
      elements.badgeStatus.textContent = "Erro ao processar.";
      elements.badgeStatus.style.color = "#ff4444";
      cachedBadgeBlob = null;
    }
  });

  // 2. Download Emblema
  elements.btnDownloadBadge.addEventListener('click', () => {
      if (cachedBadgeBlob) {
          const url = URL.createObjectURL(cachedBadgeBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `emblema_zoom.png`;
          a.click();
          URL.revokeObjectURL(url);
      } else {
          if(!elements.badgeUrlInput.value) return;
          const a = document.createElement('a');
          a.href = elements.badgeImg.src;
          a.download = `emblema.gif`;
          a.click();
          alert("Baixando original. (Clique na engrenagem para zoom HD)");
      }
  });

  // 3. Copiar Emblema Link (Fallback)
  elements.btnCopyBadgeLink.addEventListener('click', () => {
      elements.badgeUrlInput.select();
      document.execCommand('copy');
      alert("Link copiado!");
  });


  // --- RESTO DOS EVENTOS (Mudança de input reseta cache) ---
  
  elements.loadBtn.addEventListener('click', () => {
    updateAvatar();
    carregarGrupos(elements.nick.value);
  });
  elements.nick.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.loadBtn.click();
  });
  
  // Ao mudar inputs do avatar, reseta cache
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

  // Ao mudar zoom range, invalidamos cache
  elements.zoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.avatarImg.style.transform = `scale(${val})`;
    elements.zoomValue.textContent = val + "x";
    cachedAvatarBlob = null; 
    elements.avatarStatus.textContent = "Zoom alterado. Clique em 'Aplicar'.";
    elements.avatarStatus.style.color = "#d9b3b3";
  });

  elements.badgeZoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.badgeImg.style.transform = `scale(${val})`;
    elements.badgeZoomValue.textContent = val + "x";
    cachedBadgeBlob = null;
    elements.badgeStatus.textContent = "Zoom alterado. Clique na engrenagem.";
    elements.badgeStatus.style.color = "#d9b3b3";
  });

  // START
  updateAvatar();
  carregarGrupos(elements.nick.value);
});
