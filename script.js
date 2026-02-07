let baseImage = null;

const slider = document.getElementById("scaleSlider");
const scaleValue = document.getElementById("scaleValue");

slider.addEventListener("input", () => {
  scaleValue.textContent = slider.value + "x";
  if (baseImage) renderizar();
});

async function gerar() {
  const nick = document.getElementById("nick").value;
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&size=l&direction=2&head_direction=3&gesture=std&action=std`;

  img.onload = () => {
    baseImage = img;
    renderizar();
  };

  carregarBadges(nick);
}

function renderizar() {
  const scale = parseInt(slider.value);
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = baseImage.width * scale;
  canvas.height = baseImage.height * scale;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
}

async function carregarBadges(nick) {
  const badgesDiv = document.getElementById("badges");
  badgesDiv.innerHTML = "";

  const userRes = await fetch(
    `https://www.habbo.com.br/api/public/users?name=${nick}`
  );
  const user = await userRes.json();

  const badgesRes = await fetch(
    `https://www.habbo.com.br/api/public/users/${user.uniqueId}/badges`
  );
  const badges = await badgesRes.json();

  badges.forEach(b => {
    const img = document.createElement("img");
    img.src = `https://images.habbo.com/c_images/album1584/${b.code}.gif`;
    img.title = b.code;
    badgesDiv.appendChild(img);
  });
}
