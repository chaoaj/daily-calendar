const CELL = 40;
const COLS = 7;
const ROWS = 7;

let boardX = 320;
let boardY = 120;
let boardW = COLS * CELL;
let boardH = ROWS * CELL;

let pieces = [];
let selectedPiece = null;
let draggingPiece = null;
let dragOffset = { x: 0, y: 0 };
let resetButton = null;
let solveButton = null;

let validCells = new Set();
let cellLabels = new Map();
let holeCells = new Set();
let monthCellByIndex = [];
let dayCellByNumber = [];
let todayLabel = '';

let confetti = [];
let confettiFrames = 0;
let solvedState = false;

const CONFETTI_DURATION = 220;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function setup() {
  createCanvas(920, 620);
  textFont('sans-serif');
  initBoard();
  initPieces();
  resetButton = createButton('Reset');
  resetButton.position(24, 72);
  resetButton.mousePressed(resetPuzzle);
  solveButton = createButton('Give Up / Solution');
  solveButton.position(90, 72);
  solveButton.mousePressed(handleSolve);
}

function draw() {
  background(246, 242, 235);
  drawBoard();
  drawPieces();
  drawHUD();
  const solvedNow = checkSolved();
  if (solvedNow && !solvedState) {
    triggerConfetti();
  }
  solvedState = solvedNow;
  drawConfetti();
}

function initBoard() {
  validCells.clear();
  cellLabels.clear();
  holeCells.clear();
  monthCellByIndex = [];
  dayCellByNumber = [];

  for (let i = 0; i < MONTHS.length; i++) {
    const row = Math.floor(i / 6);
    const col = i % 6;
    addCell(row, col, MONTHS[i]);
    monthCellByIndex[i] = { row, col };
  }

  let day = 1;
  for (let row = 2; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (row === 6 && col >= 3) {
        continue;
      }
      if (day <= 31) {
        addCell(row, col, String(day));
        dayCellByNumber[day] = { row, col };
        day += 1;
      }
    }
  }

  const today = new Date();
  const monthIndex = today.getMonth();
  const dayNumber = today.getDate();
  const monthCell = monthCellByIndex[monthIndex];
  const dayCell = dayCellByNumber[dayNumber];
  holeCells.add(cellKey(monthCell.row, monthCell.col));
  holeCells.add(cellKey(dayCell.row, dayCell.col));
  todayLabel = `${MONTHS[monthIndex]} ${dayNumber}`;
}

function initPieces() {
  const shapes = [
    { name: 'L', blocks: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
    { name: 'T', blocks: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
    { name: 'Z', blocks: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]] },
    { name: 'P', blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] },
    { name: 'U', blocks: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
    { name: 'W', blocks: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
    { name: 'Y', blocks: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]] },
    { name: 'Rect', blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] }
  ];

  const startPositions = [
    { x: 40, y: 160 },
    { x: 160, y: 140 },
    { x: 40, y: 300 },
    { x: 160, y: 280 },
    { x: 700, y: 160 },
    { x: 780, y: 240 },
    { x: 700, y: 360 },
    { x: 760, y: 460 }
  ];

  const colors = [
    '#d9896f', '#d6a76b', '#c9b65f', '#8db17d',
    '#6fb0aa', '#7ea2d6', '#b492d1', '#d49bb3'
  ];

  pieces = shapes.map((shape, index) => ({
    name: shape.name,
    blocks: shape.blocks,
    orientations: getUniqueOrientations(shape.blocks),
    pos: { ...startPositions[index] },
    color: colors[index],
    rotation: 0,
    flipped: false,
    placed: false,
    gridPos: null,
    lastPlaced: null
  }));
}

function addCell(row, col, label) {
  const key = cellKey(row, col);
  validCells.add(key);
  cellLabels.set(key, label);
}

function cellKey(row, col) {
  return `${row},${col}`;
}

function drawBoard() {
  noStroke();
  fill(231, 211, 178);
  rect(boardX - 10, boardY - 10, boardW + 20, boardH + 20, 12);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = cellKey(row, col);
      if (!validCells.has(key)) {
        continue;
      }
      const x = boardX + col * CELL;
      const y = boardY + row * CELL;
      const isHole = holeCells.has(key);
      fill(isHole ? color(246, 215, 121) : color(241, 225, 197));
      stroke(176, 150, 120);
      strokeWeight(1);
      rect(x, y, CELL, CELL);
    }
  }

  drawBoardLabels();
  drawBoardDecor();
}

function drawBoardLabels() {
  textAlign(CENTER, CENTER);
  for (const [key, label] of cellLabels.entries()) {
    const [row, col] = key.split(',').map(Number);
    const x = boardX + col * CELL + CELL / 2;
    const y = boardY + row * CELL + CELL / 2;
    const isMonth = isNaN(parseInt(label, 10));
    textSize(isMonth ? 12 : 14);
    fill(80, 60, 40);
    text(label, x, y);
  }
}

function drawBoardDecor() {
  const logoX = boardX + 6 * CELL + CELL / 2;
  const logoY = boardY + CELL / 2;
  fill(210, 182, 150);
  stroke(176, 150, 120);
  strokeWeight(1);
  circle(logoX, logoY, CELL * 0.8);
  noStroke();
  fill(80, 60, 40);
  textSize(9);
  textAlign(CENTER, CENTER);
  text('VITAL', logoX, logoY);

  fill(80, 60, 40);
  textSize(12);
  textAlign(CENTER, CENTER);
  text('Calendar Puzzle', boardX + 5 * CELL, boardY + 6 * CELL + CELL / 2);
}

function drawPieces() {
  for (const piece of pieces) {
    const blocks = getTransformedBlocks(piece);
    const isSelected = piece === selectedPiece;
    stroke(isSelected ? 40 : 120);
    strokeWeight(isSelected ? 2 : 1);
    fill(piece.color);

    for (const block of blocks) {
      const x = piece.pos.x + block.x * CELL;
      const y = piece.pos.y + block.y * CELL;
      rect(x, y, CELL, CELL, 6);
    }
  }
}

function drawHUD() {
  noStroke();
  fill(40);
  textAlign(LEFT, TOP);
  textSize(14);
  text('Drag pieces. R = rotate, F = flip. Drag off board to remove.', 24, 24);
  textSize(12);
  text(`Today: ${todayLabel}`, 24, 48);
  if (solvedState) {
    fill(36, 122, 70);
    textSize(16);
    text('Solved!', 24, 96);
  }
}

function getTransformedBlocks(piece) {
  let blocks = piece.blocks.map(([x, y]) => ({ x, y }));

  if (piece.flipped) {
    blocks = blocks.map((b) => ({ x: -b.x, y: b.y }));
  }

  for (let i = 0; i < piece.rotation; i++) {
    blocks = blocks.map((b) => ({ x: -b.y, y: b.x }));
  }

  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  return blocks.map((b) => ({ x: b.x - minX, y: b.y - minY }));
}

function normalizeBlocks(blocks) {
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  return blocks.map((b) => ({ x: b.x - minX, y: b.y - minY }));
}

function rotateBlocks(blocks) {
  return blocks.map((b) => ({ x: -b.y, y: b.x }));
}

function flipBlocks(blocks) {
  return blocks.map((b) => ({ x: -b.x, y: b.y }));
}

function blocksKey(blocks) {
  return blocks
    .map((b) => `${b.x},${b.y}`)
    .sort()
    .join(';');
}

function getUniqueOrientations(rawBlocks) {
  const base = rawBlocks.map(([x, y]) => ({ x, y }));
  const orientations = [];
  const seen = new Set();

  for (const flipped of [false, true]) {
    let working = flipped ? flipBlocks(base) : base;
    for (let rotation = 0; rotation < 4; rotation++) {
      const normalized = normalizeBlocks(working);
      const key = blocksKey(normalized);
      if (!seen.has(key)) {
        orientations.push({ blocks: normalized, rotation, flipped });
        seen.add(key);
      }
      working = rotateBlocks(working);
    }
  }
  return orientations;
}

function mousePressed() {
  selectedPiece = null;
  draggingPiece = null;
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (pieceContains(piece, mouseX, mouseY)) {
      selectedPiece = piece;
      draggingPiece = piece;
      dragOffset = {
        x: mouseX - piece.pos.x,
        y: mouseY - piece.pos.y
      };

      pieces.splice(i, 1);
      pieces.push(piece);

      if (piece.placed) {
        piece.lastPlaced = {
          gridPos: { ...piece.gridPos },
          rotation: piece.rotation,
          flipped: piece.flipped
        };
      }
      piece.placed = false;
      piece.gridPos = null;
      break;
    }
  }
}

function mouseDragged() {
  if (!draggingPiece) {
    return;
  }
  draggingPiece.pos.x = mouseX - dragOffset.x;
  draggingPiece.pos.y = mouseY - dragOffset.y;
}

function mouseReleased() {
  if (!draggingPiece) {
    return;
  }
  const candidate = getSnappedGridPos(draggingPiece);
  if (candidate && isPlacementValid(draggingPiece, candidate)) {
    placePiece(draggingPiece, candidate);
  } else if (isDropOutsideBoard(draggingPiece)) {
    draggingPiece.placed = false;
    draggingPiece.gridPos = null;
    draggingPiece.lastPlaced = null;
  } else if (draggingPiece.lastPlaced) {
    draggingPiece.rotation = draggingPiece.lastPlaced.rotation;
    draggingPiece.flipped = draggingPiece.lastPlaced.flipped;
    placePiece(draggingPiece, draggingPiece.lastPlaced.gridPos);
  }
  draggingPiece = null;
}

function pieceContains(piece, x, y) {
  const blocks = getTransformedBlocks(piece);
  for (const block of blocks) {
    const bx = piece.pos.x + block.x * CELL;
    const by = piece.pos.y + block.y * CELL;
    if (x >= bx && x <= bx + CELL && y >= by && y <= by + CELL) {
      return true;
    }
  }
  return false;
}

function getSnappedGridPos(piece) {
  const blocks = getTransformedBlocks(piece);
  const maxX = Math.max(...blocks.map((b) => b.x));
  const maxY = Math.max(...blocks.map((b) => b.y));
  const width = (maxX + 1) * CELL;
  const height = (maxY + 1) * CELL;

  const gridX = Math.round((piece.pos.x - boardX) / CELL);
  const gridY = Math.round((piece.pos.y - boardY) / CELL);

  const minX = boardX + gridX * CELL;
  const minY = boardY + gridY * CELL;
  const maxBoundX = minX + width;
  const maxBoundY = minY + height;

  const boardRight = boardX + boardW;
  const boardBottom = boardY + boardH;
  if (maxBoundX < boardX - CELL || maxBoundY < boardY - CELL) {
    return null;
  }
  if (minX > boardRight + CELL || minY > boardBottom + CELL) {
    return null;
  }
  return { x: gridX, y: gridY };
}

function getPieceBounds(piece) {
  const blocks = getTransformedBlocks(piece);
  const minX = Math.min(...blocks.map((b) => piece.pos.x + b.x * CELL));
  const minY = Math.min(...blocks.map((b) => piece.pos.y + b.y * CELL));
  const maxX = Math.max(...blocks.map((b) => piece.pos.x + (b.x + 1) * CELL));
  const maxY = Math.max(...blocks.map((b) => piece.pos.y + (b.y + 1) * CELL));
  return { minX, minY, maxX, maxY };
}

function isDropOutsideBoard(piece) {
  const bounds = getPieceBounds(piece);
  const padding = CELL;
  return (
    bounds.maxX < boardX - padding ||
    bounds.minX > boardX + boardW + padding ||
    bounds.maxY < boardY - padding ||
    bounds.minY > boardY + boardH + padding
  );
}

function placePiece(piece, gridPos) {
  piece.placed = true;
  piece.gridPos = { ...gridPos };
  piece.pos = {
    x: boardX + gridPos.x * CELL,
    y: boardY + gridPos.y * CELL
  };
  piece.lastPlaced = {
    gridPos: { ...gridPos },
    rotation: piece.rotation,
    flipped: piece.flipped
  };
}

function isPlacementValid(piece, gridPos) {
  const blocks = getTransformedBlocks(piece);
  const occupied = getOccupiedCells(piece);
  for (const block of blocks) {
    const row = gridPos.y + block.y;
    const col = gridPos.x + block.x;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return false;
    }
    const key = cellKey(row, col);
    if (!validCells.has(key)) {
      return false;
    }
    if (holeCells.has(key)) {
      return false;
    }
    if (occupied.has(key)) {
      return false;
    }
  }
  return true;
}

function getOccupiedCells(excludePiece) {
  const occupied = new Set();
  for (const piece of pieces) {
    if (!piece.placed || piece === excludePiece) {
      continue;
    }
    const blocks = getTransformedBlocks(piece);
    for (const block of blocks) {
      const row = piece.gridPos.y + block.y;
      const col = piece.gridPos.x + block.x;
      occupied.add(cellKey(row, col));
    }
  }
  return occupied;
}

function checkSolved() {
  const availableCount = validCells.size - holeCells.size;
  const occupied = getOccupiedCells(null);
  return occupied.size === availableCount;
}

function triggerConfetti() {
  confettiFrames = CONFETTI_DURATION;
  confetti = [];
  for (let i = 0; i < 140; i++) {
    confetti.push(createConfettiPiece());
  }
}

function createConfettiPiece() {
  const colors = ['#f07c6c', '#f6c967', '#7cd6c0', '#7fb3f0', '#b790e0'];
  return {
    x: random(0, width),
    y: random(-height * 0.3, 0),
    vx: random(-1.2, 1.2),
    vy: random(2, 5),
    size: random(6, 12),
    rotation: random(0, TWO_PI),
    spin: random(-0.15, 0.15),
    color: random(colors)
  };
}

function drawConfetti() {
  if (confettiFrames <= 0) {
    return;
  }
  confettiFrames -= 1;
  for (const piece of confetti) {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vy += 0.03;
    piece.rotation += piece.spin;
    if (piece.y > height + 20) {
      piece.y = random(-40, -10);
      piece.x = random(0, width);
      piece.vy = random(2, 5);
    }
    push();
    translate(piece.x, piece.y);
    rotate(piece.rotation);
    noStroke();
    fill(piece.color);
    rect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
    pop();
  }
}

function resetPuzzle() {
  selectedPiece = null;
  draggingPiece = null;
  confettiFrames = 0;
  confetti = [];
  solvedState = false;
  initBoard();
  initPieces();
}

function handleSolve() {
  const confirmed = window.confirm('Show solution and place all pieces?');
  if (!confirmed) {
    return;
  }
  const solution = solvePuzzle();
  if (!solution) {
    window.alert('No solution found for this date.');
    return;
  }
  applySolution(solution);
}

function solvePuzzle() {
  const availableKeys = Array.from(validCells).filter((key) => !holeCells.has(key));
  const availableSet = new Set(availableKeys);
  const cellList = availableKeys.map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col, key };
  });
  const occupied = new Set();
  const used = new Array(pieces.length).fill(false);
  const solution = new Array(pieces.length).fill(null);

  function findNextCell() {
    for (const cell of cellList) {
      if (!occupied.has(cell.key)) {
        return cell;
      }
    }
    return null;
  }

  function canPlace(orientation, origin) {
    for (const block of orientation.blocks) {
      const row = origin.y + block.y;
      const col = origin.x + block.x;
      const key = cellKey(row, col);
      if (!availableSet.has(key) || occupied.has(key)) {
        return false;
      }
    }
    return true;
  }

  function occupy(orientation, origin) {
    for (const block of orientation.blocks) {
      const row = origin.y + block.y;
      const col = origin.x + block.x;
      occupied.add(cellKey(row, col));
    }
  }

  function release(orientation, origin) {
    for (const block of orientation.blocks) {
      const row = origin.y + block.y;
      const col = origin.x + block.x;
      occupied.delete(cellKey(row, col));
    }
  }

  function backtrack() {
    if (occupied.size === availableSet.size) {
      return true;
    }
    const nextCell = findNextCell();
    if (!nextCell) {
      return false;
    }
    for (let i = 0; i < pieces.length; i++) {
      if (used[i]) {
        continue;
      }
      const orientations = pieces[i].orientations;
      for (const orientation of orientations) {
        for (const block of orientation.blocks) {
          const origin = { x: nextCell.col - block.x, y: nextCell.row - block.y };
          if (!canPlace(orientation, origin)) {
            continue;
          }
          used[i] = true;
          occupy(orientation, origin);
          solution[i] = {
            gridPos: origin,
            rotation: orientation.rotation,
            flipped: orientation.flipped
          };
          if (backtrack()) {
            return true;
          }
          solution[i] = null;
          release(orientation, origin);
          used[i] = false;
        }
      }
    }
    return false;
  }

  return backtrack() ? solution : null;
}

function applySolution(solution) {
  selectedPiece = null;
  draggingPiece = null;
  for (let i = 0; i < pieces.length; i++) {
    const placement = solution[i];
    if (!placement) {
      continue;
    }
    const piece = pieces[i];
    piece.rotation = placement.rotation;
    piece.flipped = placement.flipped;
    placePiece(piece, placement.gridPos);
  }
}

function keyPressed() {
  if (!selectedPiece) {
    return;
  }
  if (key === 'r' || key === 'R') {
    const prevRotation = selectedPiece.rotation;
    selectedPiece.rotation = (selectedPiece.rotation + 1) % 4;
    if (selectedPiece.placed && !isPlacementValid(selectedPiece, selectedPiece.gridPos)) {
      selectedPiece.rotation = prevRotation;
    } else if (selectedPiece.placed) {
      placePiece(selectedPiece, selectedPiece.gridPos);
    }
  }
  if (key === 'f' || key === 'F') {
    const prevFlip = selectedPiece.flipped;
    selectedPiece.flipped = !selectedPiece.flipped;
    if (selectedPiece.placed && !isPlacementValid(selectedPiece, selectedPiece.gridPos)) {
      selectedPiece.flipped = prevFlip;
    } else if (selectedPiece.placed) {
      placePiece(selectedPiece, selectedPiece.gridPos);
    }
  }
}
