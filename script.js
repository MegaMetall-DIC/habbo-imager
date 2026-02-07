const input = document.getElementById("nickInput");
const btn = document.getElementById("generateBtn");
const avatarImg = document.getElementById("avatarImg");
const zoomRange = document.getElementById("zoomRange");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const groupsContainer = document.getElementById("groupsContainer");

function gerarAvatar(nick) {
  const url =
    "https://www.habbo.com.br/habbo-imaging/avatarimage" +
    "?user=" + encodeURIComponent(nick) +
    "&direction=2" +
    "&head_direction=3" +
    "&action=std,crr=0" +
    "&gesture=std" +
    "&size=l" +
    "&img_format=png";

  avatarImg.src = url;
  aplicarZoom();
}

function aplicarZoom() {
  avatarImg.style.transform = `scale(${zoomRange.value})`;
}

zoomRange.addEventListener("input", aplicarZoom);

async function carregarGrupos(nick) {
  groupsContainer.innerHTML = "<p>Carregando grupos...</p>";

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000); // timeout 8s

    const res = await fetch(
      "https://raspy-darkness-de40dic-habbo-groups.alvesedu-br.workers.dev/?nick=" +
        encodeURIComponent(nick),
      { signal: controller.signal }
    );

    if (!res.ok) {
      throw new Error("Resposta inválida do servidor");
    }

    const grupos = await res.json();

    if (!Array.isArray(grupos) || grupos.length === 0) {
      groupsContainer.innerHTML = "<p>Nenhum grupo encontrado.</p>";
      return;
    }

    grupos.sort((a, b) => {
      const aDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(a.name);
      const bDIC = /\[DIC|\[TJP|ÐIC|Polícia/i.test(b.name);
      return bDIC - aDIC;
    });

    groupsContainer.innerHTML = "";

    grupos.forEach(g => {
      const div = document.createElement("div");
      div.className = "group-card";

      const img = document.createElement("img");
      img.src = g.badge;
      img.alt = g.name;

      const span = document.createElement("span");
      span.textContent = g.name;

      div.appendChild(img);
      div.appendChild(span);
      groupsContainer.appendChild(div);
    });

  } catch (err) {
    console.error("Erro ao carregar grupos:", err);
    groupsContainer.innerHTML =
      "<p>Erro ao carregar grupos. Verifique o Worker.</p>";
  }
}

btn.onclick = () => {
  const nick = input.value.trim();
  if (!nick) return;

  gerarAvatar(nick);
  carregarGrupos(nick);
};

copyBtn.onclick = async () => {
  const blob = await fetch(avatarImg.src).then(r => r.blob());
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob })
  ]);
  alert("Imagem copiada!");
};

downloadBtn.onclick = () => {
  const a = document.createElement("a");
  a.href = avatarImg.src;
  a.download = "habbo-avatar.png";
  a.click();
};
