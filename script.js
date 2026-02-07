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
    btnCopyBadge: document.getElementById('btnCopyBadge'), // ID renomeado para consistência
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
      console.warn("Erro ao renderizar:", err);
      return null;
    }
  }

  // --- ATUALIZAR AVATAR ---
  let currentState = {
    direction: 2, headDirection: 2, headOnly: false, size: 'm'
  };

  function updateAvatar() {
    cachedAvatarBlob = null; // Invalida cache anterior
    if(elements.avatarStatus) {
        elements.avatarStatus.textContent = "Alterado. Clique na engrenagem para processar o zoom.";
        elements.avatarStatus.style.color = "#d9b3b3";
    }

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
        if(elements.badgeStatus) {
            elements.badgeStatus.textContent = "Novo emblema. Clique na engrenagem para aplicar zoom.";
            elements.badgeStatus.style.color = "#d9b3b3";
        }
        
        elements.badgeImg.src = g.badge;
        elements.badgeUrlInput.value = g.badge;
        elements.badgePlaceholder.style.display = 'none';
        elements.badgeZoomRange.value = 1;
        elements.badgeImg.style.transform = `scale(1)`;
        elements.badgeZoomValue.textContent = "1x";
    }
  }

  // --- BOTÃO APLICAR (RENDERIZAR) ---

  // AVATAR
  elements.btnRenderAvatar.addEventListener('click', async () => {
    const scale = parseFloat(elements.zoomRange.value);
    elements.avatarStatus.textContent = "Processando...";
    
    const blob = await createUpscaledBlob(elements.avatarImg.src, scale);
    if(blob) {
      cachedAvatarBlob = blob;
      elements.avatarStatus.textContent = `Zoom de ${scale}x aplicado! Pronto para copiar/baixar.`;
      elements.avatarStatus.style.color = "#00cc00"; // Verde
    } else {
      elements.avatarStatus.textContent = "Erro ao processar imagem (Bloqueio do Navegador).";
      elements.avatarStatus.style.color = "#ff4444";
      cachedAvatarBlob = null;
    }
  });

  // EMBLEMA
  elements.btnRenderBadge.addEventListener('click', async () => {
    const scale = parseFloat(elements.badgeZoomRange.value);
    elements.badgeStatus.textContent = "Processando...";
    
    const blob = await createUpscaledBlob(elements.badgeImg.src, scale);
    if(blob) {
      cachedBadgeBlob = blob;
      elements.badgeStatus.textContent = `Zoom de ${scale}x aplicado! Pronto para copiar/baixar.`;
      elements.badgeStatus.style.color = "#00cc00";
    } else {
      elements.badgeStatus.textContent = "Erro ao processar imagem.";
      elements.badgeStatus.style.color = "#ff4444";
      cachedBadgeBlob = null;
    }
  });

  // --- BOTÕES DE AÇÃO (COPIAR/BAIXAR IMAGEM) ---

  // 1. Download Avatar
  elements.btnDownloadAvatar.addEventListener('click', () => {
    if (cachedAvatarBlob) {
        const url = URL.createObjectURL(cachedAvatarBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${elements.nick.value}_zoom.png`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        alert("⚠️ Clique no ícone de engrenagem (Aplicar) primeiro para processar o zoom!");
    }
  });

  // 2. Copiar Avatar (IMAGEM)
  elements.btnCopyAvatar.addEventListener('click', async () => {
      if (cachedAvatarBlob) {
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": cachedAvatarBlob })]);
            alert("✅ Imagem copiada com sucesso!");
        } catch(e) { 
            console.error(e);
            alert("Erro ao copiar imagem. Seu navegador pode não suportar essa função."); 
        }
      } else {
          alert("⚠️ Clique no ícone de engrenagem (Aplicar) primeiro para gerar a imagem!");
      }
  });

  // 3. Download Emblema
  elements.btnDownloadBadge.addEventListener('click', () => {
      if (cachedBadgeBlob) {
          const url = URL.createObjectURL(cachedBadgeBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `emblema_zoom.png`;
          a.click();
          URL.revokeObjectURL(url);
      } else {
          alert("⚠️ Clique no ícone de engrenagem (Aplicar) primeiro!");
      }
  });

  // 4. Copiar Emblema (IMAGEM)
  elements.btnCopyBadge.addEventListener('click', async () => {
      if (cachedBadgeBlob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": cachedBadgeBlob })]);
            alert("✅ Emblema copiado com sucesso!");
          } catch(e) {
            console.error(e);
            alert("Erro ao copiar imagem.");
          }
      } else {
          alert("⚠️ Clique no ícone de engrenagem (Aplicar) primeiro!");
      }
  });

  // --- EVENTOS GERAIS ---
  
  elements.loadBtn.addEventListener('click', () => {
    updateAvatar();
    carregarGrupos(elements.nick.value);
  });
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

  elements.zoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.avatarImg.style.transform = `scale(${val})`;
    elements.zoomValue.textContent = val + "x";
    cachedAvatarBlob = null; // Zoom mudou, invalida cache
    if(elements.avatarStatus) {
        elements.avatarStatus.textContent = "Zoom alterado. Clique na engrenagem para aplicar.";
        elements.avatarStatus.style.color = "#d9b3b3";
    }
  });

  elements.badgeZoomRange.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.badgeImg.style.transform = `scale(${val})`;
    elements.badgeZoomValue.textContent = val + "x";
    cachedBadgeBlob = null;
    if(elements.badgeStatus) {
        elements.badgeStatus.textContent = "Zoom alterado. Clique na engrenagem para aplicar.";
        elements.badgeStatus.style.color = "#d9b3b3";
    }
  });

  // START
  updateAvatar();
  carregarGrupos(elements.nick.value);
});
