const CELL = 40;
const COLS = 7;
const ROWS = 7;
const CANVAS_W = 920;
const CANVAS_H = 620;
const TAP_MOVE_THRESHOLD = 12;
const TAP_MAX_DURATION_MS = 220;
const SWIPE_FLIP_THRESHOLD = 26;

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
let hint1Button = null;
let hint2Button = null;
let hint3Button = null;
let dateModeSelect = null;
let dateInput = null;
let dateLabel = null;

let validCells = new Set();
let cellLabels = new Map();
let holeCells = new Set();
let monthCellByIndex = [];
let dayCellByNumber = [];
let activeDate = null;
let activeDateLabel = '';
let touchGesture = null;

let confetti = [];
let confettiFrames = 0;
let solvedState = false;

const CONFETTI_DURATION = 220;
const PIECE_SHADING = [
  { hi: 150, sh: 120, grain: 42, mode: 'angled', tilt: -8 },
  { hi: 135, sh: 128, grain: 50, mode: 'flat', tilt: 0 },
  { hi: 165, sh: 115, grain: 36, mode: 'angled', tilt: 7 },
  { hi: 120, sh: 140, grain: 54, mode: 'flat', tilt: 0 },
  { hi: 145, sh: 125, grain: 46, mode: 'angled', tilt: 9 },
  { hi: 130, sh: 145, grain: 58, mode: 'flat', tilt: 0 },
  { hi: 170, sh: 112, grain: 34, mode: 'angled', tilt: -7 },
  { hi: 125, sh: 150, grain: 62, mode: 'flat', tilt: 0 }
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent('app-canvas');
  canvas.addClass('game-canvas');
  textFont('sans-serif');
  activeDate = new Date();
  initBoard();
  initPieces();

  dateLabel = createDiv('Puzzle Date');
  dateLabel.parent('date-controls');
  dateLabel.addClass('control-label');

  dateModeSelect = createSelect();
  dateModeSelect.parent('date-controls');
  dateModeSelect.addClass('control-input');
  dateModeSelect.option('Today', 'today');
  dateModeSelect.option('Custom', 'custom');
  dateModeSelect.selected('today');
  dateModeSelect.changed(handleDateModeChange);

  dateInput = createInput(formatDateInputValue(activeDate), 'date');
  dateInput.parent('date-controls');
  dateInput.addClass('control-input');
  dateInput.addClass('date-input');
  dateInput.attribute('max', '9999-12-31');
  dateInput.input(handleDateInputChange);
  dateInput.hide();

  resetButton = createButton('Reset');
  resetButton.parent('action-controls');
  resetButton.addClass('control-button');
  resetButton.mousePressed(resetPuzzle);

  hint1Button = createButton('Hint 1: Orient Pieces');
  hint1Button.parent('action-controls');
  hint1Button.addClass('control-button');
  hint1Button.mousePressed(handleHint1);

  hint2Button = createButton('Hint 2: Place 1 Per Window');
  hint2Button.parent('action-controls');
  hint2Button.addClass('control-button');
  hint2Button.mousePressed(handleHint2);

  hint3Button = createButton('Hint 3: Place Around Holes');
  hint3Button.parent('action-controls');
  hint3Button.addClass('control-button');
  hint3Button.mousePressed(handleHint3);

  solveButton = createButton('Give Up / Solution');
  solveButton.parent('action-controls');
  solveButton.addClass('control-button');
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

  const monthIndex = activeDate.getMonth();
  const dayNumber = activeDate.getDate();
  const monthCell = monthCellByIndex[monthIndex];
  const dayCell = dayCellByNumber[dayNumber];
  holeCells.add(cellKey(monthCell.row, monthCell.col));
  holeCells.add(cellKey(dayCell.row, dayCell.col));
  activeDateLabel = `${MONTHS[monthIndex]} ${dayNumber}`;
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function handleDateModeChange() {
  const mode = dateModeSelect.value();
  if (mode === 'today') {
    activeDate = new Date();
    dateInput.value(formatDateInputValue(activeDate));
    dateInput.hide();
    resetPuzzle();
    return;
  }

  dateInput.show();
  const parsed = parseDateInputValue(dateInput.value());
  if (parsed) {
    activeDate = parsed;
    resetPuzzle();
  }
}

function handleDateInputChange() {
  if (!dateModeSelect || dateModeSelect.value() !== 'custom') {
    return;
  }

  const parsed = parseDateInputValue(dateInput.value());
  if (!parsed) {
    return;
  }

  activeDate = parsed;
  resetPuzzle();
}

function initPieces() {
  const shapes = [
    // Piece silhouettes are oriented to match the physical layout shown in the reference photo.
    { name: 'TopL', blocks: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]] },
    { name: 'TopStem', blocks: [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1]] },
    { name: 'TopCorner', blocks: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]] },
    { name: 'LeftStem', blocks: [[-1, 0], [0, 0], [0, 1], [1, 1], [2, 1]] },
    { name: 'RightNotch', blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]] },
    { name: 'BottomLeftL', blocks: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
    { name: 'BottomRightL', blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]] },
    { name: 'Rect', blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] }
  ];

  const startPositions = [
    { x: 24, y: 120 },
    { x: 24, y: 242 },
    { x: 652, y: 26 },
    { x: 24, y: 402 },
    { x: 740, y: 318 },
    { x: 42, y: 480 },
    { x: 740, y: 500 },
    { x: 364, y: 500 }
  ];

  const colors = [
    '#dcb78e', '#d4ab7f', '#e1bf98', '#cda072',
    '#d9b388', '#c8996d', '#e0c39e', '#c18f62'
  ];

  pieces = shapes.map((shape, index) => ({
    name: shape.name,
    number: index + 1,
    blocks: shape.blocks,
    orientations: getUniqueOrientations(shape.blocks),
    pos: { ...startPositions[index] },
    color: colors[index],
    shade: PIECE_SHADING[index % PIECE_SHADING.length],
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
    let averageCenterX = 0;
    let averageCenterY = 0;

    for (const block of blocks) {
      const x = piece.pos.x + block.x * CELL;
      const y = piece.pos.y + block.y * CELL;
      averageCenterX += x + CELL / 2;
      averageCenterY += y + CELL / 2;

      stroke(isSelected ? color(70, 50, 32) : color(108, 80, 56));
      const outlineWeight = isSelected ? 3.2 : solvedState ? 2.4 : 1.7;
      strokeWeight(outlineWeight);
      fill(piece.color);
      rect(x, y, CELL, CELL, 6);

      // Piece-specific highlight/shadow and grain so each wood block reads differently.
      stroke(245, 225, 198, piece.shade.hi);
      strokeWeight(1);
      line(x + 3, y + 3, x + CELL - 4, y + 3);
      line(x + 3, y + 3, x + 3, y + CELL - 4);

      stroke(98, 72, 50, piece.shade.sh);
      line(x + 2, y + CELL - 3, x + CELL - 3, y + CELL - 3);
      line(x + CELL - 3, y + 2, x + CELL - 3, y + CELL - 3);

      stroke(112, 82, 54, piece.shade.grain);
      const grainTilt = piece.shade.mode === 'angled' ? piece.shade.tilt : 0;
      line(x + 6, y + 10, x + CELL - 7, y + 10 + grainTilt);
      line(x + 6, y + 19, x + CELL - 7, y + 19 + grainTilt);
      line(x + 6, y + 28, x + CELL - 7, y + 28 + grainTilt);
      line(x + 6, y + 34, x + CELL - 7, y + 34 + grainTilt);
    }

    averageCenterX /= blocks.length;
    averageCenterY /= blocks.length;

    let labelBlockCenterX = averageCenterX;
    let labelBlockCenterY = averageCenterY;
    let bestNeighborScore = -1;
    let bestAxisScore = -1;
    let bestDistance = Infinity;
    const blockKeys = new Set(blocks.map((block) => `${block.x},${block.y}`));

    for (const block of blocks) {
      const blockCenterX = piece.pos.x + block.x * CELL + CELL / 2;
      const blockCenterY = piece.pos.y + block.y * CELL + CELL / 2;
      const distance = dist(blockCenterX, blockCenterY, averageCenterX, averageCenterY);

      const hasLeft = blockKeys.has(`${block.x - 1},${block.y}`);
      const hasRight = blockKeys.has(`${block.x + 1},${block.y}`);
      const hasUp = blockKeys.has(`${block.x},${block.y - 1}`);
      const hasDown = blockKeys.has(`${block.x},${block.y + 1}`);
      const neighborScore = Number(hasLeft) + Number(hasRight) + Number(hasUp) + Number(hasDown);
      const axisScore = Number(hasLeft || hasRight) + Number(hasUp || hasDown);

      if (
        neighborScore > bestNeighborScore ||
        (neighborScore === bestNeighborScore && axisScore > bestAxisScore) ||
        (neighborScore === bestNeighborScore && axisScore === bestAxisScore && distance < bestDistance)
      ) {
        bestNeighborScore = neighborScore;
        bestAxisScore = axisScore;
        bestDistance = distance;
        labelBlockCenterX = blockCenterX;
        labelBlockCenterY = blockCenterY;
      }
    }

    // Burned-in piece number for fast visual differentiation.
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    textStyle(BOLD);

    fill(58, 34, 18, 90);
    text(piece.number, labelBlockCenterX + 1.2, labelBlockCenterY + 1.4);

    fill(74, 44, 24, 170);
    text(piece.number, labelBlockCenterX, labelBlockCenterY);

    fill(122, 84, 54, 55);
    text(piece.number, labelBlockCenterX - 0.8, labelBlockCenterY - 0.9);
  }
}

function drawHUD() {
  noStroke();
  fill(40);
  textAlign(LEFT, TOP);
  textSize(14);
  text('Drag pieces. R = rotate, F = flip. Drag off board to remove.', 24, 24);
  textSize(12);
  text(`Date: ${activeDateLabel}`, 24, 48);
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

function getPointerPosition() {
  if (typeof touches !== 'undefined' && touches.length > 0) {
    return { x: touches[0].x, y: touches[0].y };
  }

  return { x: mouseX, y: mouseY };
}

function isInsideCanvas(x, y) {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}

function beginDragAt(x, y) {
  if (!isInsideCanvas(x, y)) {
    return false;
  }

  selectedPiece = null;
  draggingPiece = null;
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (pieceContains(piece, x, y)) {
      selectedPiece = piece;
      draggingPiece = piece;
      dragOffset = {
        x: x - piece.pos.x,
        y: y - piece.pos.y
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

  return draggingPiece !== null;
}

function dragTo(x, y) {
  if (!draggingPiece) {
    return false;
  }

  draggingPiece.pos.x = x - dragOffset.x;
  draggingPiece.pos.y = y - dragOffset.y;
  return true;
}

function endDrag() {
  if (!draggingPiece) {
    return false;
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
  return true;
}

function rotatePieceState(piece, preferredGridPos = null) {
  const prevRotation = piece.rotation;
  const targetGridPos = piece.placed ? piece.gridPos : preferredGridPos;

  piece.rotation = (piece.rotation + 1) % 4;

  if (!targetGridPos) {
    return true;
  }

  if (isPlacementValid(piece, targetGridPos)) {
    placePiece(piece, targetGridPos);
    return true;
  }

  piece.rotation = prevRotation;
  if (preferredGridPos) {
    placePiece(piece, preferredGridPos);
  }
  return false;
}

function flipPieceState(piece, preferredGridPos = null) {
  const prevFlip = piece.flipped;
  const targetGridPos = piece.placed ? piece.gridPos : preferredGridPos;

  piece.flipped = !piece.flipped;

  if (!targetGridPos) {
    return true;
  }

  if (isPlacementValid(piece, targetGridPos)) {
    placePiece(piece, targetGridPos);
    return true;
  }

  piece.flipped = prevFlip;
  if (preferredGridPos) {
    placePiece(piece, preferredGridPos);
  }
  return false;
}

function mousePressed() {
  const pointer = getPointerPosition();
  beginDragAt(pointer.x, pointer.y);
}

function mouseDragged() {
  const pointer = getPointerPosition();
  dragTo(pointer.x, pointer.y);
}

function mouseReleased() {
  endDrag();
}

function touchStarted() {
  const pointer = getPointerPosition();
  const startedDrag = beginDragAt(pointer.x, pointer.y);
  if (startedDrag) {
    touchGesture = {
      startX: pointer.x,
      startY: pointer.y,
      lastX: pointer.x,
      lastY: pointer.y,
      startTime: Date.now(),
      flipTriggered: false,
      piece: draggingPiece
    };
  } else {
    touchGesture = null;
  }

  if (startedDrag || isInsideCanvas(pointer.x, pointer.y)) {
    return false;
  }
  return true;
}

function touchMoved() {
  const pointer = getPointerPosition();
  if (touchGesture && draggingPiece === touchGesture.piece) {
    touchGesture.lastX = pointer.x;
    touchGesture.lastY = pointer.y;

    const deltaX = pointer.x - touchGesture.startX;
    const deltaY = pointer.y - touchGesture.startY;
    const horizontalSwipe =
      Math.abs(deltaX) >= SWIPE_FLIP_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

    if (!touchGesture.flipTriggered && horizontalSwipe) {
      flipPieceState(draggingPiece);
      touchGesture.flipTriggered = true;
    }
  }

  if (dragTo(pointer.x, pointer.y) || isInsideCanvas(pointer.x, pointer.y)) {
    return false;
  }
  return true;
}

function touchEnded() {
  if (touchGesture && draggingPiece === touchGesture.piece) {
    const totalDeltaX = touchGesture.lastX - touchGesture.startX;
    const totalDeltaY = touchGesture.lastY - touchGesture.startY;
    const movedDistance = Math.hypot(totalDeltaX, totalDeltaY);
    const wasTap =
      movedDistance <= TAP_MOVE_THRESHOLD &&
      Date.now() - touchGesture.startTime <= TAP_MAX_DURATION_MS &&
      !touchGesture.flipTriggered;

    if (wasTap) {
      const piece = draggingPiece;
      draggingPiece = null;
      rotatePieceState(piece, piece.lastPlaced ? piece.lastPlaced.gridPos : null);
      touchGesture = null;
      return false;
    }
  }

  touchGesture = null;
  if (endDrag()) {
    return false;
  }
  return true;
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
  selectedPiece = null;
  draggingPiece = null;

  const solution = solvePuzzle();
  if (!solution) {
    window.alert('No solution found for this date.');
    return;
  }

  applySolution(solution);
  solvedState = checkSolved();
}

function handleHint1() {
  const solution = solvePuzzle();
  if (!solution) {
    window.alert('No solution found for this date.');
    return;
  }

  selectedPiece = null;
  draggingPiece = null;

  // Hint 1: only apply final orientation (rotation + flip), do not move pieces.
  for (let i = 0; i < pieces.length; i++) {
    const placement = solution[i];
    if (!placement) {
      continue;
    }

    const piece = pieces[i];
    piece.rotation = placement.rotation;
    piece.flipped = placement.flipped;

    if (piece.placed && !isPlacementValid(piece, piece.gridPos)) {
      piece.placed = false;
      piece.gridPos = null;
      piece.lastPlaced = null;
    } else if (piece.placed) {
      placePiece(piece, piece.gridPos);
    }
  }
}

function handleHint2() {
  const solution = solvePuzzle();
  if (!solution) {
    window.alert('No solution found for this date.');
    return;
  }

  selectedPiece = null;
  draggingPiece = null;

  const holeList = getHoleCells();
  const selectedIndices = new Set();

  // Hint 2: place one solved piece around each opening (max 2 unique pieces).
  for (const hole of holeList) {
    const touching = [];
    for (let i = 0; i < pieces.length; i++) {
      const placement = solution[i];
      if (!placement) {
        continue;
      }
      const piece = pieces[i];
      const score = placementTouchScore(piece, placement, hole);
      if (score > 0) {
        touching.push({ index: i, score });
      }
    }

    touching.sort((a, b) => b.score - a.score || a.index - b.index);

    let added = 0;
    for (const item of touching) {
      if (selectedIndices.has(item.index)) {
        continue;
      }
      selectedIndices.add(item.index);
      added += 1;
      if (added === 1) {
        break;
      }
    }
  }

  for (const idx of selectedIndices) {
    const placement = solution[idx];
    const piece = pieces[idx];
    piece.rotation = placement.rotation;
    piece.flipped = placement.flipped;
    placePiece(piece, placement.gridPos);
  }
}

function handleHint3() {
  const solution = solvePuzzle();
  if (!solution) {
    window.alert('No solution found for this date.');
    return;
  }

  selectedPiece = null;
  draggingPiece = null;

  // Hint 3: place all solved pieces that touch either hidden opening cell.
  for (let i = 0; i < pieces.length; i++) {
    const placement = solution[i];
    if (!placement) {
      continue;
    }

    const piece = pieces[i];
    if (!placementTouchesHole(piece, placement)) {
      continue;
    }

    piece.rotation = placement.rotation;
    piece.flipped = placement.flipped;
    placePiece(piece, placement.gridPos);
  }
}

function getHoleCells() {
  return Array.from(holeCells).map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col, key };
  });
}

function placementTouchScore(piece, placement, hole) {
  const blocks = getBlocksForState(piece.blocks, placement.rotation, placement.flipped);
  let score = 0;

  for (const block of blocks) {
    const row = placement.gridPos.y + block.y;
    const col = placement.gridPos.x + block.x;
    const manhattan = Math.abs(row - hole.row) + Math.abs(col - hole.col);
    if (manhattan === 1) {
      score += 1;
    }
  }

  return score;
}

function placementTouchesHole(piece, placement) {
  const blocks = getBlocksForState(piece.blocks, placement.rotation, placement.flipped);

  for (const block of blocks) {
    const row = placement.gridPos.y + block.y;
    const col = placement.gridPos.x + block.x;

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighborKey = cellKey(row + dr, col + dc);
      if (holeCells.has(neighborKey)) {
        return true;
      }
    }
  }
  return false;
}

function getBlocksForState(rawBlocks, rotation, flipped) {
  let blocks = rawBlocks.map(([x, y]) => ({ x, y }));

  if (flipped) {
    blocks = blocks.map((b) => ({ x: -b.x, y: b.y }));
  }

  for (let i = 0; i < rotation; i++) {
    blocks = blocks.map((b) => ({ x: -b.y, y: b.x }));
  }

  return normalizeBlocks(blocks);
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

  function canPlace(blocks, origin) {
    for (const block of blocks) {
      const row = origin.y + block.y;
      const col = origin.x + block.x;
      const key = cellKey(row, col);
      if (!availableSet.has(key) || occupied.has(key)) {
        return false;
      }
    }
    return true;
  }

  function occupy(blocks, origin) {
    for (const block of blocks) {
      const row = origin.y + block.y;
      const col = origin.x + block.x;
      occupied.add(cellKey(row, col));
    }
  }

  function release(blocks, origin) {
    for (const block of blocks) {
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
        const stateBlocks = getBlocksForState(
          pieces[i].blocks,
          orientation.rotation,
          orientation.flipped
        );
        for (const block of stateBlocks) {
          const origin = { x: nextCell.col - block.x, y: nextCell.row - block.y };
          if (!canPlace(stateBlocks, origin)) {
            continue;
          }
          used[i] = true;
          occupy(stateBlocks, origin);
          solution[i] = {
            gridPos: origin,
            rotation: orientation.rotation,
            flipped: orientation.flipped
          };
          if (backtrack()) {
            return true;
          }
          solution[i] = null;
          release(stateBlocks, origin);
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
    rotatePieceState(selectedPiece, selectedPiece.lastPlaced ? selectedPiece.lastPlaced.gridPos : null);
  }
  if (key === 'f' || key === 'F') {
    flipPieceState(selectedPiece, selectedPiece.lastPlaced ? selectedPiece.lastPlaced.gridPos : null);
  }
}
