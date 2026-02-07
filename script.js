// Elementos do DOM
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

// Estado atual
let currentState = {
  direction: 2, // Direção do corpo
  headDirection: 2,
  headOnly: false
};

// Função Principal: Construir URL e Atualizar
function updateAvatar() {
  const nick = elements.nick.value.trim() || 'MilitaryTimes';
  const hotel = elements.hotel.value;
  
  // Base URL depende do hotel selecionado
  let domain = 'com.br';
  if(hotel === 'com') domain = 'com';
  if(hotel === 'es') domain = 'es';
  
  const baseUrl = `https://www.habbo.${domain}/habbo-imaging/avatarimage`;
  
  // Parâmetros
  const params = new URLSearchParams({
    user: nick,
    direction: currentState.direction,
    head_direction: currentState.direction, // Cabeça segue o corpo por padrão
    action: elements.action.value,
    gesture: elements.gesture.value,
    size: elements.size.value,
    img_format: elements.format.value
  });

  if (currentState.headOnly) {
    params.set('headonly', '1');
  }

  const fullUrl = `${baseUrl}?${params.toString()}`;

  // Atualiza Imagem e Input de URL
  elements.avatarImg.src = fullUrl;
  elements.urlOutput.value = fullUrl;
}

// Lógica de Rotação
elements.rotBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const dir = btn.getAttribute('data-dir');
    
    // Habbo usa direções 0 a 7. Vamos simplificar rotacionando de 1 em 1 ou 2 em 2
    if(dir === '1') { // Esquerda
      currentState.direction = (currentState.direction + 1) % 8;
    } else { // Direita
      currentState.direction = (currentState.direction - 1 + 8) % 8;
    }
    
    updateAvatar();
  });
});

// Toggle Apenas Cabeça
elements.headToggle.addEventListener('click', () => {
  currentState.headOnly = !currentState.headOnly;
  elements.headToggle.classList.toggle('active');
  updateAvatar();
});

// Event Listeners para atualizar ao mudar qualquer select
['hotel', 'gesture', 'action', 'size', 'format'].forEach(id => {
  document.getElementById(`${id}Select`).addEventListener('change', updateAvatar);
});

// Botão Carregar (Atualiza avatar + Carrega Grupos)
elements.loadBtn.addEventListener('click', () => {
  updateAvatar();
  carregarGrupos(elements.nick.value);
});

// Zoom Visual (CSS Transform)
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
elements.downloadBtn.addEventListener('click', async () => {
  try {
    const response = await fetch(elements.avatarImg.src);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elements.nick.value}_avatar.png`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Fallback simples se o CORS bloquear o fetch direto da imagem
    const a = document.createElement('a');
    a.href = elements.avatarImg.src;
    a.download = 'avatar.png';
    a.target = '_blank';
    a.click();
  }
});

// --- LÓGICA DO WORKER (Mantida do seu código original) ---

async function carregarGrupos(nick) {
  if(!nick) return;
  elements.groupsContainer.innerHTML = "<p style='color:#888'>Carregando grupos...</p>";

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000); // timeout 8s

    // URL do seu Worker (Mantive a mesma que você enviou)
    const res = await fetch(
      "https://raspy-darkness-de40dic-habbo-groups.alvesedu-br.workers.dev/?nick=" +
        encodeURIComponent(nick),
      { signal: controller.signal }
    );

    if (!res.ok) throw new Error("Erro na resposta");

    const grupos = await res.json();

    if (!Array.isArray(grupos) || grupos.length === 0) {
      elements.groupsContainer.innerHTML = "<p>Nenhum grupo encontrado.</p>";
      return;
    }

    // Ordenação (DIC/Polícia primeiro)
    grupos.sort((a, b) => {
      const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
      const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
      return bDIC - aDIC;
    });

    elements.groupsContainer.innerHTML = "";

    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "group-card";
      
      // Badge
      const img = document.createElement("img");
      img.src = g.badge; // Certifique-se que seu worker retorna 'badge' como URL completa ou código
      // Se retornar apenas código (ex: b1234), precisa concatenar com a URL do Habbo c_images
      
      const span = document.createElement("span");
      span.textContent = g.name;

      div.appendChild(img);
      div.appendChild(span);
      elements.groupsContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    elements.groupsContainer.innerHTML = "<p style='color:red'>Erro ao carregar grupos.</p>";
  }
}

// Inicializar ao abrir
updateAvatar();
