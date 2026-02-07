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
    btnDownloadAvatar: document.getElementById('btnDownloadAvatar'),
    btnCopyAvatar: document.getElementById('btnCopyAvatar'),

    // Upscaler Badge
    badgeImg: document.getElementById('badgePreviewImg'),
    badgeUrlInput: document.getElementById('badgeUrlInput'),
    badgeZoomRange: document.getElementById('badgeZoomRange'),
    badgeZoomValue: document.getElementById('badgeZoomValue'),
    btnDownloadBadge: document.getElementById('btnDownloadBadge'),
    btnCopyBadgeLink: document.getElementById('btnCopyBadgeLink'),
    badgePlaceholder: document.getElementById('badgePlaceholderText'),
    
    groupsContainer: document.getElementById('groupsContainer')
  };

  if (!elements.loadBtn) return;

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

  // --- FUNÇÃO GRUPOS ---
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

        // Click Event
        div.addEventListener('click', () => {
            selectGroup(g);
            // Scroll suave
            const section = document.getElementById('badgeSection');
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            section.style.borderColor = "#e60000";
            setTimeout(() => { section.style.borderColor = "#4a0a0a"; }, 800);
        });
        
        if (index === 0) firstGroup = g;
      });

      // AUTO-SELECT (Sem scroll, apenas carrega a imagem)
      if (firstGroup) {
         selectGroup(firstGroup);
      }

    } catch (err) {
      console.error(err);
      elements.loadBtn.textContent = originalBtnText;
      elements.loadBtn.disabled = false;
      elements.groupsContainer.innerHTML = "<p style='color:#e60000'>Erro.</p>";
    }
  }

  function selectGroup(g) {
    if(elements.badgeImg) {
        elements.badgeImg.src = g.badge;
        elements.badgeUrlInput.value = g.badge;
        elements.badgePlaceholder.style.display = 'none';
        
        // Reset zoom
        elements.badgeZoomRange.value = 1;
        elements.badgeImg.style.transform = `scale(1)`;
        elements.badgeZoomValue.textContent = "1x";
    }
  }

  // --- LISTENERS ---

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

  // ZOOM VISUAL
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

  // BOTOES SIMPLIFICADOS (Download direto do src)
  elements.btnDownloadAvatar.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = elements.avatarImg.src;
    a.download = `${elements.nick.value}.png`;
    a.click();
  });
  
  elements.btnCopyAvatar.addEventListener('click', () => {
      elements.urlOutput.select();
      document.execCommand('copy');
      alert("Link copiado!");
  });

  elements.btnDownloadBadge.addEventListener('click', () => {
    if(!elements.badgeUrlInput.value) return;
    const a = document.createElement('a');
    a.href = elements.badgeImg.src;
    a.download = `emblema.gif`;
    a.click();
  });

  elements.btnCopyBadgeLink.addEventListener('click', () => {
      elements.badgeUrlInput.select();
      document.execCommand('copy');
      alert("Link do emblema copiado!");
  });

  // --- INICIALIZAÇÃO AUTOMÁTICA ---
  // Carrega o avatar E os grupos do nick padrão (MegaMetall) assim que abre
  updateAvatar();
  carregarGrupos(elements.nick.value); // <--- A CORREÇÃO ESTÁ AQUI
});
