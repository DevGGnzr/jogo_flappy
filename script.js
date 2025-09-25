const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const countdownEl = document.getElementById("countdown");

//===== Imagens (PNG com transparência)-----
const birdImg = new Image();
birdImg.src = "bird.png";
const pipeTopImg = new Image();
pipeTopImg.src = "pipe_top.png";
const pipeBottomImg = new Image();
pipeBottomImg.src = "pipe_bottom.png";

// Habilita o botão START somente quando todas as imagens carregarem
let imagensCarregadas = 0;
const totalImagens = 3;
startBtn.disabled = true;

function imagemCarregada() {
  imagensCarregadas++;
  if (imagensCarregadas === totalImagens) {
    startBtn.disabled = false;
    desenharInstrucoes();
  }
}

birdImg.onload = imagemCarregada;
pipeTopImg.onload = imagemCarregada;
pipeBottomImg.onload = imagemCarregada;

if (birdImg.complete) imagemCarregada();
if (pipeTopImg.complete) imagemCarregada();
if (pipeBottomImg.complete) imagemCarregada();

// Estado do jogo
let birdy, birdX, gravity, velocity, jump, pipes, score, gameOver;
let jogoRodando = false;
let animacaoId = null;
let lives, life, isVulnerable;
let flashEffect = false;
let blueBall = null;

// Variáveis para o novo timer de criação de canos
let framesSinceLastPipe = 0;
const PIPE_SPACING_PIXELS = 250;

// Variáveis para o timer de velocidade
let isSpeedReduced = false;
let speedTimeoutId = null;
let speedEffectEndTime = 0;

function resetarVariaveis() {
  birdy = 200;
  birdX = 50;
  gravity = 0.1;
  velocity = 0;
  jump = -3.5;
  pipes = [];
  score = 0;
  gameOver = false;
  lives = 2;
  life = null;
  isVulnerable = true;
  flashEffect = false;
  framesSinceLastPipe = 0;
  blueBall = null;
  isSpeedReduced = false;
  clearTimeout(speedTimeoutId);
  speedTimeoutId = null;
  speedEffectEndTime = 0;
}

// Criar obstáculos e, opcionalmente, uma vida ou uma bolinha azul
function criarCano() {
  const altura = Math.floor(Math.random() * 200) + 100;
  const newPipe = {
    x: canvas.width,
    height: altura,
    width: 60,
    gap: 160,
    y_velocity: Math.random() < 0.5 ? 0.5 : -0.5,
    scored: false,
  };
  pipes.push(newPipe);

  // Só sorteia power-up se não houver outro ativo
  const podeReduzirVelocidade =
    score >= 5 && Math.random() < 0.2 && !blueBall && !life;
  const podeCriarVida =
    score >= 5 && Math.random() < 0.2 && lives < 3 && !life && !blueBall;

  if (podeReduzirVelocidade) {
    const blueBallY = altura + newPipe.gap / 2;
    blueBall = {
      x: newPipe.x + newPipe.width / 2,
      y: blueBallY,
      radius: 10,
    };
  } else if (podeCriarVida) {
    const lifeY = altura + newPipe.gap / 2;
    life = {
      x: newPipe.x + newPipe.width / 2,
      y: lifeY,
      radius: 10,
    };
  }
  // IMPORTANTE: não zera life/blueBall aqui se não tiver criado um novo!
}

// Colisão com os canos
function colisaoCano(cano) {
  const birdWidth = 50;
  const birdHeight = 50;

  return (
    birdX + birdWidth > cano.x &&
    birdX < cano.x + cano.width &&
    (birdy < cano.height || birdy + birdHeight > cano.height + cano.gap)
  );
}

// Colisão com a vida
function colisaoVida(life) {
  const birdCenterX = birdX + 25;
  const birdCenterY = birdy + 25;
  const distancia = Math.hypot(life.x - birdCenterX, life.y - birdCenterY);
  return distancia <= life.radius + 25;
}

// Colisão com a bolinha azul
function colisaoBlueBall(blueBall) {
  const birdCenterX = birdX + 25;
  const birdCenterY = birdy + 25;
  const distancia = Math.hypot(
    blueBall.x - birdCenterX,
    blueBall.y - birdCenterY
  );
  return distancia <= blueBall.radius + 25;
}

// Função para subtrair uma vida e ativar a invulnerabilidade e o efeito de piscada
function perderVida() {
  if (isVulnerable) {
    lives--;
    isVulnerable = false;
    flashEffect = true;
    setTimeout(() => {
      isVulnerable = true;
      flashEffect = false;
    }, 100);

    if (lives === 0) {
      gameOver = true;
    }
  }
}

function desenharInstrucoes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";

  const linhas = [
    "Bem-vindo ao Flappy Quadrado!",
    "Comece com 2 vidas, colete vidas extras,",
    "aumente a velocidade a cada 5 pontos",
    "e colete bolinhas azuis para reduzir a velocidade",
    "temporariamente.",
    "Pressione 'Iniciar Jogo' para começar!",
  ];

  const espacamento = 30;
  // Começa o texto verticalmente centralizado
  let y = canvas.height / 2 - ((linhas.length - 1) * espacamento) / 2;

  linhas.forEach((linha) => {
    ctx.fillText(linha, canvas.width / 2, y);
    y += espacamento;
  });
}

// Desenhar jogo
function desenhar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (flashEffect) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (gameOver) {
    cancelAnimationFrame(animacaoId);
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Fim de jogo!", canvas.width / 2, 300);
    ctx.fillText("Pontuação: " + score, canvas.width / 2, 350);
    startBtn.style.display = "inline-block";
    return;
  }

  velocity += gravity;
  birdy += velocity;

  if (birdy + 50 >= canvas.height || birdy <= 0) {
    perderVida();
  }

  ctx.drawImage(birdImg, birdX, birdy, 50, 50);

  // Velocidade base cresce com o score
  let pipeSpeed = 2 + 0.2 * Math.floor(score / 5);

  // Efeito da bolinha azul
  if (isSpeedReduced) {
    pipeSpeed = 2;
    const timeLeft = Math.max(
      0,
      Math.ceil((speedEffectEndTime - Date.now()) / 1000)
    );
    ctx.fillStyle = "blue";
    ctx.font = "16px Arial";
    ctx.textAlign = "start"; // Alinhado com o HUD
    ctx.fillText(`Velocidade Reduzida: ${timeLeft}s`, 10, 120);
  }

  // Geração de canos
  framesSinceLastPipe++;
  if (framesSinceLastPipe * pipeSpeed >= PIPE_SPACING_PIXELS) {
    criarCano();
    framesSinceLastPipe = 0;
  }

  // Atualiza e desenha canos
  pipes.forEach((p) => {
    p.x -= pipeSpeed;

    if (score >= 50) {
      p.height += p.y_velocity;
      if (p.height <= 50 || p.height >= 400) {
        p.y_velocity *= -1;
      }
    }

    ctx.drawImage(pipeTopImg, p.x, 0, p.width, p.height);
    const bottomY = p.height + p.gap;
    const bottomHeight = canvas.height - bottomY;
    ctx.drawImage(pipeBottomImg, p.x, bottomY, p.width, bottomHeight);

    if (colisaoCano(p)) {
      perderVida();
    }

    if (birdX > p.x + p.width && !p.scored) {
      score++;
      p.scored = true;
    }
  });

  // Vida (vermelha)
  if (life) {
    life.x -= pipeSpeed;
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(life.x, life.y, life.radius, 0, 2 * Math.PI);
    ctx.fill();

    if (colisaoVida(life) && lives < 2) {
      lives++;
      life = null;
    }
    if (life && life.x + life.radius < 0) {
      life = null;
    }
  }

  // Bolinha azul (slow)
  if (blueBall) {
    blueBall.x -= pipeSpeed;
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(blueBall.x, blueBall.y, blueBall.radius, 0, 2 * Math.PI);
    ctx.fill();

    if (colisaoBlueBall(blueBall)) {
      isSpeedReduced = true;
      speedEffectEndTime = Date.now() + 10000;
      clearTimeout(speedTimeoutId);
      speedTimeoutId = setTimeout(() => {
        isSpeedReduced = false;
      }, 10000);
      blueBall = null;
    }
    if (blueBall && blueBall.x + blueBall.radius < 0) {
      blueBall = null;
    }
  }

  // Limpa canos fora da tela
  if (pipes.length > 0 && pipes[0].x + pipes[0].width < 0) {
    pipes.shift();
  }

  // HUD
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.textAlign = "start";
  ctx.fillText("Pontuação: " + score, 10, 30);
  ctx.fillText("Vidas: " + lives, 10, 60);
  let hudSpeed = isSpeedReduced ? 1.0 : 1.0 + 0.2 * Math.floor(score / 5);
  ctx.fillText("Velocidade: " + hudSpeed.toFixed(1), 10, 90);

  animacaoId = requestAnimationFrame(desenhar);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && jogoRodando && !gameOver) {
    velocity = jump;
  }
});

startBtn.addEventListener("click", iniciarJogo);

function iniciarJogo() {
  startBtn.style.display = "none";
  countdownEl.style.display = "block";
  let count = 3;
  countdownEl.textContent = count;

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(countdownInterval);
      countdownEl.style.display = "none";
      jogoRodando = true;
      resetarVariaveis();
      criarCano();
      desenhar();
    }
  }, 1000);
}
