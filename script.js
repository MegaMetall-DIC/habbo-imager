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
    btnRenderAvatar: document.getElementById('btnRenderAvatar'),
    btnDownloadAvatar: document.getElementById('btnDownloadAvatar'),
    btnCopyAvatar: document.getElementById('btnCopyAvatar'),
    avatarStatus: document.getElementById('avatarStatus'),

    // Upscaler Badge
    badgeImg: document.getElementById('badgePreviewImg'),
    badgeUrlInput: document.getElementById('badgeUrlInput'),
    badgeZoomRange: document.getElementById('badgeZoomRange'),
    badgeZoomValue: document.getElementById('badgeZoomValue'),
    btnRenderBadge: document.getElementById('btnRenderBadge'),
    btnDownloadBadge: document.getElementById('btnDownloadBadge'),
    btnCopyBadge: document.getElementById('btnCopyBadge'),
    badgePlaceholder: document.getElementById('badgePlaceholderText'),
    badgeStatus: document.getElementById('badgeStatus'),
    
    groupsContainer: document.getElementById('groupsContainer')
  };

  if (!elements.loadBtn) return;

  // Cache para guardar a imagem gerada
  let cachedAvatarBlob = null;
  let cachedBadgeBlob = null;

  // --- FUNÇÃO DE NOTIFICAÇÃO TOAST (NEON SUAVE) ---
  function showToast(message) {
    // Cria o elemento se não existir
    let toast = document.getElementById('customToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'customToast';
      toast.className = 'custom-toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = 'custom-toast show';
    
    // Desaparece após 3 segundos
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
  }

  // --- FUNÇÃO DE GERAÇÃO COM MÚLTIPLOS PROXIES ---
  async function createUpscaledBlob(imgUrl, scale, statusElement) {
    const proxies = [
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let attempt = 1;
    for (const getProxyUrl of proxies) {
      try {
        if(statusElement) statusElement.textContent = `Processando (Tentativa ${attempt}/${proxies.length})...`;
        
        const proxyUrl = getProxyUrl(imgUrl);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) { attempt++; continue; }

        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      } catch (err) {
        console.warn(`Proxy ${attempt} falhou:`, err);
        attempt++;
      }
    }
    return null;
  }

  // --- ATUALIZAR AVATAR ---
  let currentState = { direction: 2, headDirection: 2, headOnly: false, size: 'm' };

  function updateAvatar() {
    cachedAvatarBlob = null;
    if(elements.avatarStatus) {
      elements.avatarStatus.textContent = "Alterado. Clique na engrenagem para aplicar zoom.";
      elements.avatarStatus.style.color = "#d9b3b3";
    }

    const nick = elements.nick.value.trim();
    if(!nick) return;

    const hotel = elements.hotel.value;
    let domain = hotel === 'com' ? 'com' : (hotel === 'es' ? 'es' : 'com.br');
    const baseUrl = `https://www.habbo.${domain}/habbo-imaging/avatarimage`;
    
    let paramsObj = {
      user: nick,
      direction: currentState.direction,
      head_direction: currentState.direction,
      gesture: elements.gesture.value,
      size: currentState.size,
      img_format: elements.format.value
    };

    let actionsArray = [];
    if(elements.action.value !== 'std') actionsArray.push(elements.action.value);
    
    const rh = elements.rightHand.value;
    if (['wav', 'blow'].includes(rh)) actionsArray.push(rh);
    else if (rh === 'respect') paramsObj.gesture = 'srp';
    else if (parseInt(rh) > 0) actionsArray.push(`crr=${rh}`);

    const lh = elements.leftHand.value;
    if (parseInt(lh) > 0) {
       const drinks = ['1','2','3','5','6','9','33','42'];
       actionsArray.push(drinks.includes(lh) ? `drk=${lh}` : `crr=${lh}`);
    }

    if(actionsArray.length > 0) paramsObj.action = actionsArray.join(',');
    if (currentState.headOnly) paramsObj.headonly = '1';

    const params = new URLSearchParams(paramsObj);
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    elements.avatarImg.src = fullUrl;
    elements.urlOutput.value = fullUrl;
  }

  // --- CARREGAR GRUPOS ---
  async function carregarGrupos(nick) {
    if(!nick) return;
    const originalText = elements.loadBtn.textContent;
    elements.loadBtn.textContent = "...";
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
      elements.loadBtn.textContent = originalText;
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
            document.getElementById('badgeSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        if (index === 0) firstGroup = g;
      });

      if (firstGroup) selectGroup(firstGroup);

    } catch (err) {
      console.error(err);
      elements.loadBtn.textContent = originalText;
      elements.loadBtn.disabled = false;
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro ao buscar.</p>";
    }
  }

  function selectGroup(g) {
    if(elements.badgeImg) {
        cachedBadgeBlob = null;
        if(elements.badgeStatus) elements.badgeStatus.textContent = "Novo emblema. Clique na engrenagem.";
        
        elements.badgeImg.src = g.badge;
        elements.badgeUrlInput.value = g.badge;
        elements.badgePlaceholder.style.display = 'none';
        elements.badgeZoomRange.value = 1;
        elements.badgeImg.style.transform = `scale(1)`;
        elements.badgeZoomValue.textContent = "1x";
    }
  }

  // --- EVENTOS DE RENDERIZAÇÃO ---

  elements.btnRenderAvatar.addEventListener('click', async () => {
    const scale = parseFloat(elements.zoomRange.value);
    
    const blob = await createUpscaledBlob(elements.avatarImg.src, scale, elements.avatarStatus);
    
    if(blob) {
      cachedAvatarBlob = blob;
      elements.avatarStatus.textContent = `Zoom de ${scale}x PRONTO!`;
      elements.avatarStatus.style.color = "#00cc00"; 
    } else {
      elements.avatarStatus.textContent = "Erro: Servidores ocupados.";
      elements.avatarStatus.style.color = "#ff4444";
      cachedAvatarBlob = null;
    }
  });

  elements.btnRenderBadge.addEventListener('click', async () => {
    const scale = parseFloat(elements.badgeZoomRange.value);
    
    const blob = await createUpscaledBlob(elements.badgeImg.src, scale, elements.badgeStatus);
    
    if(blob) {
      cachedBadgeBlob = blob;
      elements.badgeStatus.textContent = `Zoom de ${scale}x PRONTO!`;
      elements.badgeStatus.style.color = "#00cc00";
    } else {
      elements.badgeStatus.textContent = "Erro: Servidores ocupados.";
      elements.badgeStatus.style.color = "#ff4444";
      cachedBadgeBlob = null;
    }
  });

  // --- BOTÕES DE DOWNLOAD E CÓPIA (COM TOAST) ---

  elements.btnDownloadAvatar.addEventListener('click', () => {
    if (cachedAvatarBlob) {
        const url = URL.createObjectURL(cachedAvatarBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${elements.nick.value}_zoom.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Download iniciado! 💾");
    } else {
        showToast("⚠️ Clique na engrenagem primeiro!");
    }
  });

  elements.btnCopyAvatar.addEventListener('click', async () => {
      if (cachedAvatarBlob) {
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": cachedAvatarBlob })]);
            showToast("Imagem copiada! 📋");
        } catch(e) { 
            showToast("Erro ao copiar. Use o botão de Baixar."); 
        }
      } else {
          showToast("⚠️ Clique na engrenagem primeiro!");
      }
  });

  elements.btnDownloadBadge.addEventListener('click', () => {
      if (cachedBadgeBlob) {
          const url = URL.createObjectURL(cachedBadgeBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `emblema_zoom.png`;
          a.click();
          URL.revokeObjectURL(url);
          showToast("Download iniciado! 💾");
      } else {
          showToast("⚠️ Clique na engrenagem primeiro!");
      }
  });

  elements.btnCopyBadge.addEventListener('click', async () => {
      if (cachedBadgeBlob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": cachedBadgeBlob })]);
            showToast("Emblema copiado! 📋");
          } catch(e) {
            showToast("Erro ao copiar.");
          }
      } else {
          showToast("⚠️ Clique na engrenagem primeiro!");
      }
  });

  // --- GERAIS ---
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
      currentState.direction = dir === '1' ? (currentState.direction + 1) % 8 : (currentState.direction - 1 + 8) % 8;
      updateAvatar();
    });
  });
  elements.headToggle.addEventListener('click', () => {
    currentState.headOnly = !currentState.headOnly;
    elements.headToggle.classList.toggle('active');
    updateAvatar();
  });
  
  elements.zoomRange.addEventListener('input', (e) => {
    elements.avatarImg.style.transform = `scale(${e.target.value})`;
    elements.zoomValue.textContent = e.target.value + "x";
    cachedAvatarBlob = null;
    if(elements.avatarStatus) {
        elements.avatarStatus.textContent = "Zoom alterado. Clique na engrenagem.";
        elements.avatarStatus.style.color = "#d9b3b3";
    }
  });
  elements.badgeZoomRange.addEventListener('input', (e) => {
    elements.badgeImg.style.transform = `scale(${e.target.value})`;
    elements.badgeZoomValue.textContent = e.target.value + "x";
    cachedBadgeBlob = null;
    if(elements.badgeStatus) {
        elements.badgeStatus.textContent = "Zoom alterado. Clique na engrenagem.";
        elements.badgeStatus.style.color = "#d9b3b3";
    }
  });

  updateAvatar();
  carregarGrupos(elements.nick.value);
});
