// ============================================================
// TETRIS - Lógica del juego
// ============================================================

// --- Referencias al DOM ---
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const gameOverMsg = document.getElementById('game-over-msg');
const restartBtn = document.getElementById('restart-btn');

// --- Configuración del tablero ---
const COLUMNS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // canvas: 10 * 30 = 300px, 20 * 30 = 600px

// Escalamos el contexto principal para poder dibujar en unidades de "celda"
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

// --- Definición de las piezas (Tetrominos) ---
// Cada pieza se define como una matriz donde los valores != 0 representan
// el color de la pieza (índice en el arreglo COLORS).
const COLORS = [
  null,
  '#00f0f0', // I - cian
  '#0000f0', // J - azul
  '#f0a000', // L - naranja
  '#f0f000', // O - amarillo
  '#00f000', // S - verde
  '#a000f0', // T - violeta
  '#f00000', // Z - rojo
];

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

const PIECE_KEYS = Object.keys(SHAPES);

// --- Estado del juego ---
let board = createMatrix(COLUMNS, ROWS);

const player = {
  matrix: null,
  next: null,
  pos: { x: 0, y: 0 },
  score: 0,
};

let dropCounter = 0;
let dropInterval = 1000; // milisegundos entre caídas automáticas
let lastTime = 0;
let gameOver = false;
let animationFrameId = null;

// --- Funciones de creación y utilidades ---

// Crea una matriz (tablero) llena de ceros con el ancho y alto indicados
function createMatrix(width, height) {
  const matrix = [];
  while (height--) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

// Devuelve una copia profunda de la forma de una pieza aleatoria
function createPiece() {
  const key = PIECE_KEYS[(Math.random() * PIECE_KEYS.length) | 0];
  return SHAPES[key].map((row) => row.slice());
}

// --- Dibujado ---

// Dibuja una matriz (pieza o tablero) en el contexto indicado, desplazada por offset
function drawMatrix(context, matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = COLORS[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        // Pequeño borde para dar efecto de "bloque" con volumen
        context.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

// Redibuja todo el tablero y la pieza actual
function draw() {
  ctx.fillStyle = '#111119';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(ctx, board, { x: 0, y: 0 });
  drawMatrix(ctx, player.matrix, player.pos);
}

// Dibuja la vista previa de la siguiente pieza en su propio canvas
function drawNextPiece() {
  nextCtx.fillStyle = '#111119';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const size = 24; // tamaño de bloque para la vista previa
  const matrix = player.next;

  // Centramos la pieza dentro del canvas de vista previa
  const offsetX = (nextCanvas.width / size - matrix[0].length) / 2;
  const offsetY = (nextCanvas.height / size - matrix.length) / 2;

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextCtx.fillStyle = COLORS[value];
        nextCtx.fillRect(
          (x + offsetX) * size,
          (y + offsetY) * size,
          size,
          size
        );
        nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        nextCtx.strokeRect(
          (x + offsetX) * size,
          (y + offsetY) * size,
          size,
          size
        );
      }
    });
  });
}

// --- Colisiones ---

// Comprueba si la pieza actual colisiona con el tablero (paredes, suelo u otras piezas)
function collide(board, player) {
  const matrix = player.matrix;
  const pos = player.pos;

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        const boardY = y + pos.y;
        const boardX = x + pos.x;

        const fueraDeLimites =
          boardX < 0 || boardX >= COLUMNS || boardY >= ROWS;

        if (fueraDeLimites || (board[boardY] && board[boardY][boardX] !== 0)) {
          return true;
        }
      }
    }
  }
  return false;
}

// "Fusiona" la pieza actual con el tablero cuando ya no puede seguir cayendo
function merge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// --- Movimiento y rotación ---

// Mueve la pieza horizontalmente; si colisiona, revierte el movimiento
function movePiece(dir) {
  if (gameOver) return;
  player.pos.x += dir;
  if (collide(board, player)) {
    player.pos.x -= dir;
  }
}

// Transpone y luego invierte filas (o columnas) para rotar la matriz 90°
function rotateMatrix(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Rota la pieza actual, aplicando un "wall kick" simple si la rotación colisiona
function rotatePiece(dir) {
  if (gameOver) return;

  const posX = player.pos.x;
  let offset = 1;

  rotateMatrix(player.matrix, dir);

  // Si la rotación provoca colisión, probamos desplazar la pieza (wall kick)
  while (collide(board, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));

    // Si el desplazamiento es mayor que el ancho de la pieza, la rotación es inválida
    if (offset > player.matrix[0].length) {
      rotateMatrix(player.matrix, -dir);
      player.pos.x = posX;
      return;
    }
  }
}

// --- Caída de piezas y eliminación de líneas ---

// Hace descender la pieza una celda; si colisiona, la fusiona y genera una nueva
function pieceDrop() {
  if (gameOver) return;

  player.pos.y++;
  if (collide(board, player)) {
    player.pos.y--;
    merge(board, player);
    clearLines();
    resetPiece();
  }
  dropCounter = 0;
}

// Provoca una caída instantánea hasta el fondo (caída rápida con flecha abajo)
function pieceSoftDrop() {
  pieceDrop();
  player.score += 1;
  updateScore();
}

// Revisa el tablero en busca de filas completas, las elimina y suma puntos
function clearLines() {
  let linesCleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLUMNS; x++) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }

    // La fila está completa: la quitamos y agregamos una nueva vacía arriba
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    y++; // volvemos a revisar la misma posición, ya que las filas se recorrieron hacia abajo

    linesCleared++;
  }

  if (linesCleared > 0) {
    // Puntuación clásica: más líneas simultáneas otorgan más puntos por línea
    const points = [0, 40, 100, 300, 1200];
    player.score += points[linesCleared] || linesCleared * 400;
    updateScore();
    increaseSpeed();
  }
}

// Aumenta gradualmente la velocidad de caída en función de la puntuación
function increaseSpeed() {
  const nivel = Math.floor(player.score / 500);
  dropInterval = Math.max(1000 - nivel * 75, 100);
}

// --- Piezas nuevas y game over ---

// Genera una nueva pieza activa a partir de la "siguiente pieza" y prepara otra
function resetPiece() {
  player.matrix = player.next ?? createPiece();
  player.next = createPiece();

  player.pos.y = 0;
  player.pos.x =
    ((COLUMNS / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  // Si la nueva pieza ya colisiona al aparecer, el juego termina
  if (collide(board, player)) {
    triggerGameOver();
  }

  drawNextPiece();
}

function triggerGameOver() {
  gameOver = true;
  gameOverMsg.textContent = `¡Fin del juego! Puntuación final: ${player.score}`;
  gameOverMsg.style.display = 'block';
}

function updateScore() {
  scoreEl.textContent = player.score;
}

// --- Bucle principal del juego ---

function update(time = 0) {
  if (gameOver) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    pieceDrop();
  }

  draw();
  animationFrameId = requestAnimationFrame(update);
}

// --- Controles de teclado ---

document.addEventListener('keydown', (event) => {
  if (gameOver) return;

  switch (event.key) {
    case 'ArrowLeft':
      movePiece(-1);
      break;
    case 'ArrowRight':
      movePiece(1);
      break;
    case 'ArrowDown':
      pieceSoftDrop();
      break;
    case 'ArrowUp':
      rotatePiece(1);
      break;
  }
});

// --- Inicio del juego ---

function startGame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  board = createMatrix(COLUMNS, ROWS);
  player.score = 0;
  gameOver = false;
  dropInterval = 1000;
  dropCounter = 0;
  lastTime = 0;
  gameOverMsg.style.display = 'none';

  updateScore();
  resetPiece();
  update();
}

restartBtn.addEventListener('click', startGame);

startGame();
