/**
 * 츄르단 공간 — 미니게임 (사다리타기, 핀볼타기)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMinigameTabs();
  initLadderGame();
  initPinballGame();
});

/* ── Tab Switch ── */
function initMinigameTabs() {
  const tabs = document.querySelectorAll('.minigame__tab');
  const panels = document.querySelectorAll('.minigame__panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const game = tab.dataset.game;
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
      });
      panels.forEach((p) => {
        const show = (game === 'ladder' && p.id === 'gameLadder')
          || (game === 'pinball' && p.id === 'gamePinball');
        p.classList.toggle('active', show);
      });
    });
  });
}

/* ══════════════════════════════════════
   사다리타기
   ══════════════════════════════════════ */
const LADDER_MARKER_COLORS = ['#5eb8e8', '#7ec8f0', '#6ec9a0', '#f0a45c', '#9b7fd4', '#3a9fd4', '#7bc8d4', '#a8daf5'];

function ladderDefaultName(index) {
  return index === 0 ? '유설아' : '';
}

function ladderDefaultResult(index) {
  return index === 0 ? '당첨' : '꽝';
}

function initLadderGame() {
  const canvas = document.getElementById('ladderCanvas');
  const topRow = document.getElementById('ladderTopRow');
  const bottomRow = document.getElementById('ladderBottomRow');
  const countLabel = document.getElementById('ladderCountLabel');
  const countMinus = document.getElementById('ladderCountMinus');
  const countPlus = document.getElementById('ladderCountPlus');
  const revealAllBtn = document.getElementById('ladderRevealAll');
  const shuffleBtn = document.getElementById('ladderShuffle');
  const resultEl = document.getElementById('ladderResult');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const MIN_COUNT = 2;
  const MAX_COUNT = 8;

  const state = {
    count: 4,
    names: [],
    results: [],
    bridges: [],
    numRows: 14,
    ready: false,
    animating: false,
    completed: new Map(),
  };

  const SKY = '#5eb8e8';
  const SKY_RGB = '94, 184, 232';

  const COLORS = {
    line: '#d0dde8',
    lineTop: SKY,
    bridge: SKY,
    bridgeGlow: `rgba(${SKY_RGB}, 0.35)`,
  };

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function darkenHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const f = 1 - amount;
    const to = (v) => Math.round(v * f);
    return `rgb(${to(r)}, ${to(g)}, ${to(b)})`;
  }

  function animationDuration() {
    return 5200 + state.numRows * 220;
  }

  function generateBridges(numLines, numRows) {
    const bridges = [];
    for (let r = 0; r < numRows; r++) {
      const placed = new Set();
      for (let i = 0; i < numLines - 1; i++) {
        if (placed.has(i) || placed.has(i - 1)) continue;
        if (Math.random() < 0.44) {
          bridges.push({ row: r, left: i });
          placed.add(i);
        }
      }
    }
    return bridges;
  }

  function tracePath(startLine) {
    let line = startLine;
    const steps = [{ row: -1, line }];
    for (let r = 0; r < state.numRows; r++) {
      const leftBridge = state.bridges.find((b) => b.row === r && b.left === line - 1);
      const rightBridge = state.bridges.find((b) => b.row === r && b.left === line);
      if (leftBridge) line -= 1;
      else if (rightBridge) line += 1;
      steps.push({ row: r, line });
    }
    return steps;
  }

  function getLayout() {
    const n = state.count;
    const padX = 52;
    const padTop = 24;
    const padBottom = 24;
    const w = canvas.width - padX * 2;
    const h = canvas.height - padTop - padBottom;
    const colW = n > 1 ? w / (n - 1) : 0;
    const rowH = state.numRows > 0 ? h / state.numRows : h;
    return { padX, padTop, padBottom, colW, rowH, n, w, h };
  }

  function lineX(i, layout) {
    return layout.padX + i * layout.colW;
  }

  function rowBridgeY(r, layout) {
    return layout.padTop + r * layout.rowH + layout.rowH / 2;
  }

  function buildPathPoints(path, layout) {
    const topY = layout.padTop;
    const bottomY = canvas.height - layout.padBottom;
    const pts = [{ x: lineX(path[0].line, layout), y: topY }];

    for (let r = 0; r < state.numRows; r++) {
      const y = rowBridgeY(r, layout);
      const before = path[r].line;
      const after = path[r + 1].line;
      pts.push({ x: lineX(before, layout), y });
      if (before !== after) {
        pts.push({ x: lineX(after, layout), y });
      }
    }

    const endLine = path[path.length - 1].line;
    pts.push({ x: lineX(endLine, layout), y: bottomY });
    return pts;
  }

  function pathLength(points) {
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  function pointAtProgress(points, t) {
    const total = pathLength(points);
    let remain = t * total;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const seg = Math.sqrt(dx * dx + dy * dy);
      if (remain <= seg || i === points.length - 2) {
        const ratio = seg === 0 ? 1 : remain / seg;
        return {
          x: points[i].x + dx * ratio,
          y: points[i].y + dy * ratio,
        };
      }
      remain -= seg;
    }
    return points[points.length - 1];
  }

  function buildPartialPoints(points, t) {
    const total = pathLength(points);
    const target = t * total;
    let accumulated = 0;
    const partial = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const seg = Math.sqrt(dx * dx + dy * dy);
      if (accumulated + seg <= target) {
        partial.push(points[i + 1]);
        accumulated += seg;
      } else {
        const ratio = seg === 0 ? 1 : (target - accumulated) / seg;
        partial.push({
          x: points[i].x + dx * ratio,
          y: points[i].y + dy * ratio,
        });
        break;
      }
    }
    return partial;
  }

  function getCompletedDrawData() {
    const paths = [];
    const markers = [];
    state.completed.forEach((item) => {
      paths.push({ points: item.points, color: item.color, progress: 1 });
      markers.push({ ...item.marker, active: false });
    });
    return { paths, markers };
  }

  function drawBoardBackground(layout) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < layout.n; i++) {
      const x = lineX(i, layout);
      const colGlow = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
      colGlow.addColorStop(0, `rgba(${SKY_RGB}, 0)`);
      colGlow.addColorStop(0.5, `rgba(${SKY_RGB}, 0.04)`);
      colGlow.addColorStop(1, `rgba(${SKY_RGB}, 0)`);
      ctx.fillStyle = colGlow;
      ctx.fillRect(x - 28, layout.padTop, 56, layout.h);
    }
  }

  function drawVerticalLines(layout, n) {
    const bottomY = canvas.height - layout.padBottom;
    for (let i = 0; i < n; i++) {
      const x = lineX(i, layout);
      const lineGrad = ctx.createLinearGradient(x, layout.padTop, x, bottomY);
      lineGrad.addColorStop(0, COLORS.lineTop);
      lineGrad.addColorStop(0.08, COLORS.line);
      lineGrad.addColorStop(0.92, COLORS.line);
      lineGrad.addColorStop(1, COLORS.lineTop);

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, layout.padTop);
      ctx.lineTo(x, bottomY);
      ctx.stroke();

      [layout.padTop, bottomY].forEach((y) => {
        ctx.fillStyle = `rgba(${SKY_RGB}, 0.18)`;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = `rgba(${SKY_RGB}, 0.45)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  function drawBridges(layout) {
    state.bridges.forEach((b) => {
      const y = rowBridgeY(b.row, layout);
      const x1 = lineX(b.left, layout);
      const x2 = lineX(b.left + 1, layout);

      ctx.strokeStyle = COLORS.bridgeGlow;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      const bridgeGrad = ctx.createLinearGradient(x1, y, x2, y);
      bridgeGrad.addColorStop(0, '#a8daf5');
      bridgeGrad.addColorStop(0.5, COLORS.bridge);
      bridgeGrad.addColorStop(1, '#a8daf5');
      ctx.strokeStyle = bridgeGrad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    });
  }

  function drawGlowStroke(points, color, width, alpha) {
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = width + 8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function drawPaths(pathItems) {
    if (!pathItems || !pathItems.length) return;
    pathItems.forEach((item) => {
      const pts = item.progress >= 1
        ? item.points
        : buildPartialPoints(item.points, item.progress);
      drawGlowStroke(pts, item.color, 4.5, item.progress >= 1 ? 0.7 : 0.95);
    });
  }

  function drawTrail(points, t, color) {
    const trailSteps = 10;
    for (let i = trailSteps; i >= 1; i--) {
      const trailT = Math.max(0, t - i * 0.014);
      const pos = pointAtProgress(points, trailT);
      ctx.globalAlpha = 0.45 - i * 0.035;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7 - i * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMarker(m) {
    const { x, y, color, active = false } = m;
    const r = active ? 13 : 11;

    if (active && m.points && m.progress != null) {
      drawTrail(m.points, m.progress, color);
    }

    const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.8);
    glow.addColorStop(0, color + (active ? 'cc' : '88'));
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    if (active) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const ballGrad = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, r);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.3, color);
    ballGrad.addColorStop(1, darkenHex(color, 0.28));
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMarkers(markers) {
    if (!markers || !markers.length) return;
    markers.forEach((m) => drawMarker(m));
  }

  function drawLadder(options = {}) {
    const {
      showBridges = state.ready,
      animPaths = null,
      animMarkers = null,
    } = options;
    const layout = getLayout();
    const { n } = layout;
    const completed = getCompletedDrawData();

    drawBoardBackground(layout);
    drawVerticalLines(layout, n);
    if (showBridges) drawBridges(layout);

    drawPaths(completed.paths);
    if (animPaths) drawPaths(animPaths);

    drawMarkers(completed.markers);
    if (animMarkers) drawMarkers(animMarkers);
  }

  function buildRunner(index, layout) {
    const path = tracePath(index);
    const color = LADDER_MARKER_COLORS[index % LADDER_MARKER_COLORS.length];
    return {
      start: index,
      path,
      color,
      points: buildPathPoints(path, layout),
    };
  }

  function setControlsDisabled(disabled) {
    state.animating = disabled;
    revealAllBtn.disabled = disabled;
    shuffleBtn.disabled = disabled;
    countMinus.disabled = disabled;
    countPlus.disabled = disabled;
    topRow.querySelectorAll('.ladder-game__chip--pickable').forEach((chip) => {
      chip.classList.toggle('is-animating', disabled);
    });
  }

  function updateSlotStyles() {
    topRow.querySelectorAll('.ladder-game__chip--pickable').forEach((chip, i) => {
      chip.classList.toggle('is-revealed', state.completed.has(i));
      chip.classList.toggle('is-ready', state.ready && !state.animating);
    });
    bottomRow.querySelectorAll('.ladder-game__chip--result').forEach((chip, i) => {
      chip.classList.toggle('is-revealed', state.completed.has(i));
    });
    canvas.classList.toggle('is-ready', state.ready && !state.animating);
  }

  function updateResultText(extraLine) {
    const lines = Array.from(state.completed.entries())
      .sort(([a], [b]) => a - b)
      .map(([, item]) => {
        const end = item.path[item.path.length - 1].line;
        return `${state.names[item.start]} → ${state.results[end]}`;
      });

    if (extraLine) lines.push(extraLine);

    if (lines.length) {
      resultEl.textContent = lines.join('  |  ');
      resultEl.classList.add('is-show');
    } else if (state.ready) {
      resultEl.textContent = '참가자를 클릭해 개별로 확인하거나, 전체공개를 눌러 보세요.';
      resultEl.classList.remove('is-show');
    }
  }

  function saveCompleted(runner, marker) {
    state.completed.set(runner.start, {
      start: runner.start,
      path: runner.path,
      points: runner.points,
      color: runner.color,
      marker: { ...marker, color: runner.color, active: false },
    });
    updateSlotStyles();
    updateResultText();
  }

  function runAnimations(runners) {
    if (!state.ready || state.animating || !runners.length) return;

    setControlsDisabled(true);
    resultEl.textContent = '사다리를 타는 중...';
    resultEl.classList.remove('is-show');

    const duration = animationDuration();
    const startTime = performance.now();
    canvas.parentElement.classList.add('is-animating');

    function frame(now) {
      const t = easeInOut(Math.min(1, (now - startTime) / duration));
      const animMarkers = runners.map((r) => ({
        ...pointAtProgress(r.points, t),
        color: r.color,
        active: true,
        points: r.points,
        progress: t,
      }));
      const animPaths = t > 0.02
        ? runners.map((r) => ({ points: r.points, color: r.color, progress: t }))
        : null;

      drawLadder({ showBridges: true, animPaths, animMarkers });

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        runners.forEach((r, idx) => saveCompleted(r, animMarkers[idx]));
        setControlsDisabled(false);
        canvas.parentElement.classList.remove('is-animating');
        drawLadder({ showBridges: true });
        updateSlotStyles();

        if (state.completed.size === state.count) {
          revealAllBtn.disabled = true;
        }
      }
    }
    requestAnimationFrame(frame);
  }

  function runSingleAnimation(index) {
    if (!state.ready || state.animating) return;
    runAnimations([buildRunner(index, getLayout())]);
  }

  function runRevealAll() {
    if (!state.ready || state.animating) return;

    const pending = [];
    for (let i = 0; i < state.count; i++) {
      if (!state.completed.has(i)) pending.push(i);
    }

    if (!pending.length) {
      resultEl.textContent = '이미 모든 참가자가 공개되었습니다.';
      resultEl.classList.add('is-show');
      return;
    }

    runAnimations(pending.map((i) => buildRunner(i, getLayout())));
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function pickColumnFromX(x) {
    const layout = getLayout();
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < state.count; i++) {
      const dist = Math.abs(x - lineX(i, layout));
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return minDist < layout.colW * 0.55 ? closest : -1;
  }

  canvas.addEventListener('click', (e) => {
    if (!state.ready || state.animating) return;
    const { x, y } = canvasCoords(e);
    const layout = getLayout();
    if (y > layout.padTop + 20) return;
    const col = pickColumnFromX(x);
    if (col >= 0) runSingleAnimation(col);
  });

  function syncArrays() {
    while (state.names.length < state.count) {
      const i = state.names.length;
      state.names.push(ladderDefaultName(i));
    }
    while (state.results.length < state.count) {
      const i = state.results.length;
      state.results.push(ladderDefaultResult(i));
    }
    state.names = state.names.slice(0, state.count);
    state.results = state.results.slice(0, state.count);
  }

  function renderSlots() {
    syncArrays();
    countLabel.textContent = String(state.count);

    topRow.innerHTML = '';
    bottomRow.innerHTML = '';

    for (let i = 0; i < state.count; i++) {
      const color = LADDER_MARKER_COLORS[i % LADDER_MARKER_COLORS.length];

      const topSlot = document.createElement('div');
      topSlot.className = 'ladder-game__slot';
      const topChip = document.createElement('div');
      topChip.className = 'ladder-game__chip ladder-game__chip--pickable';
      topChip.title = '클릭하면 이 참가자만 사다리를 탑니다';
      if (state.completed.has(i)) topChip.classList.add('is-revealed');
      if (state.ready && !state.animating) topChip.classList.add('is-ready');

      const dot = document.createElement('span');
      dot.className = 'ladder-game__dot';
      dot.style.background = color;
      topChip.appendChild(dot);

      const topInput = document.createElement('input');
      topInput.type = 'text';
      topInput.className = 'ladder-game__slot-input';
      topInput.value = state.names[i];
      topInput.placeholder = `참가자 ${i + 1}`;
      topInput.addEventListener('input', (e) => {
        state.names[i] = e.target.value;
        resetRound();
      });
      topInput.addEventListener('click', (e) => e.stopPropagation());
      topChip.appendChild(topInput);

      const pickHint = document.createElement('span');
      pickHint.className = 'ladder-game__pick-hint';
      pickHint.textContent = '▶';
      topChip.appendChild(pickHint);

      topChip.addEventListener('click', () => runSingleAnimation(i));
      topSlot.appendChild(topChip);
      topRow.appendChild(topSlot);

      const bottomSlot = document.createElement('div');
      bottomSlot.className = 'ladder-game__slot';
      const bottomChip = document.createElement('div');
      bottomChip.className = 'ladder-game__chip ladder-game__chip--result';
      if (state.completed.has(i)) bottomChip.classList.add('is-revealed');

      const bottomInput = document.createElement('input');
      bottomInput.type = 'text';
      bottomInput.className = 'ladder-game__slot-input ladder-game__slot-input--result';
      bottomInput.value = state.results[i];
      bottomInput.placeholder = `결과 ${i + 1}`;
      bottomInput.addEventListener('input', (e) => {
        state.results[i] = e.target.value;
        resetRound();
      });
      bottomChip.appendChild(bottomInput);
      bottomSlot.appendChild(bottomChip);
      bottomRow.appendChild(bottomSlot);
    }
  }

  function resetRound() {
    state.ready = false;
    state.completed.clear();
    state.bridges = [];
    revealAllBtn.disabled = false;
    shuffleBtn.disabled = false;
    countMinus.disabled = false;
    countPlus.disabled = false;
    resultEl.textContent = '「사다리 새로 만들기」를 누른 뒤 참가자를 선택해 보세요.';
    resultEl.classList.remove('is-show');
    drawLadder({ showBridges: false });
    updateSlotStyles();
  }

  function shuffleResults() {
    syncArrays();
    const shuffled = [...state.results];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    state.results = shuffled;
    state.numRows = Math.max(12, state.count * 3);
    state.bridges = generateBridges(state.count, state.numRows);
    state.ready = true;
    state.completed.clear();
    renderSlots();
    revealAllBtn.disabled = false;
    resultEl.textContent = '참가자를 클릭해 개별로 확인하거나, 전체공개를 눌러 보세요.';
    resultEl.classList.remove('is-show');
    drawLadder({ showBridges: false });
    updateSlotStyles();
  }

  function setCount(delta) {
    const next = state.count + delta;
    if (next < MIN_COUNT || next > MAX_COUNT) return;
    state.count = next;
    syncArrays();
    resetRound();
    renderSlots();
  }

  countMinus.addEventListener('click', () => setCount(-1));
  countPlus.addEventListener('click', () => setCount(1));
  shuffleBtn.addEventListener('click', shuffleResults);
  revealAllBtn.addEventListener('click', runRevealAll);

  renderSlots();
  shuffleResults();
}

/* ══════════════════════════════════════
   핀볼타기 (플링코)
   ══════════════════════════════════════ */
function initPinballGame() {
  const canvas = document.getElementById('pinballCanvas');
  const dropBtn = document.getElementById('pinballDrop');
  const resultEl = document.getElementById('pinballResult');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const SLOT_H = 56;
  const SLOT_TOP = H - SLOT_H;

  const SLOTS = ['🎁 당첨', '💨 꽝', '🍬 츄르', '✨ 설아짱', '💨 꽝', '🎁 당첨'];
  const slotCount = SLOTS.length;
  const slotW = W / slotCount;

  const pegR = 6;
  const ballR = 9;
  const pegs = [];
  const rows = 9;
  const pegStartY = 72;
  const pegRowGap = 40;

  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? 8 : 7;
    const rowWidth = (cols - 1) * 44;
    const startX = (W - rowWidth) / 2;
    const offsetX = r % 2 === 0 ? 0 : 22;
    for (let c = 0; c < cols; c++) {
      pegs.push({
        x: startX + offsetX + c * 44,
        y: pegStartY + r * pegRowGap,
      });
    }
  }

  const dividers = [];
  for (let i = 1; i < slotCount; i++) {
    dividers.push({ x: i * slotW, top: SLOT_TOP - 30, bottom: H });
  }

  let ball = null;
  let animId = null;
  let running = false;
  let lastTime = 0;

  const PHYS = {
    gravity: 0.35,
    friction: 0.992,
    bounce: 0.75,
    pegBounce: 0.82,
    maxVy: 12,
    maxVx: 8,
  };

  function drawBoard() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(94,184,232,0.08)';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = '#6b6378';
    ctx.font = '500 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ 여기서 공이 떨어집니다', W / 2, 32);

    SLOTS.forEach((label, i) => {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(94,184,232,0.14)' : 'rgba(94,184,232,0.07)';
      ctx.fillRect(i * slotW + 2, SLOT_TOP, slotW - 4, SLOT_H - 4);
      ctx.strokeStyle = 'rgba(94,184,232,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(i * slotW + 2, SLOT_TOP, slotW - 4, SLOT_H - 4);
      ctx.fillStyle = '#6b6378';
      ctx.font = '500 11px "Noto Sans KR", sans-serif';
      ctx.fillText(label, i * slotW + slotW / 2, H - 20);
    });

    dividers.forEach((d) => {
      ctx.strokeStyle = '#5eb8e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(d.x, d.top);
      ctx.lineTo(d.x, d.bottom);
      ctx.stroke();
    });

    pegs.forEach((p) => {
      ctx.fillStyle = '#eef6fb';
      ctx.beginPath();
      ctx.arc(p.x, p.y, pegR + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5eb8e8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, pegR, 0, Math.PI * 2);
      ctx.fill();
    });

    if (ball) {
      ctx.fillStyle = 'rgba(94,184,232,0.25)';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a9fd4';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resolveCircleCollision(b, cx, cy, cr, bounce) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = b.r + cr;
    if (dist >= minDist || dist === 0) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    b.x += nx * overlap;
    b.y += ny * overlap;

    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + bounce) * vn * nx;
      b.vy -= (1 + bounce) * vn * ny;
    }
    b.vx += (Math.random() - 0.5) * 0.8;
    return true;
  }

  function physicsStep(b) {
    b.vy = Math.min(PHYS.maxVy, b.vy + PHYS.gravity);
    b.vx *= PHYS.friction;
    b.vy *= 0.999;

    b.vx = Math.max(-PHYS.maxVx, Math.min(PHYS.maxVx, b.vx));
    b.vy = Math.max(-PHYS.maxVy, Math.min(PHYS.maxVy, b.vy));

    b.x += b.vx;
    b.y += b.vy;

    const wallL = ballR + 6;
    const wallR = W - ballR - 6;
    if (b.x < wallL) {
      b.x = wallL;
      b.vx = Math.abs(b.vx) * PHYS.bounce;
    }
    if (b.x > wallR) {
      b.x = wallR;
      b.vx = -Math.abs(b.vx) * PHYS.bounce;
    }

    if (b.y < ballR + 4) {
      b.y = ballR + 4;
      b.vy = Math.abs(b.vy) * 0.5;
    }

    pegs.forEach((p) => {
      resolveCircleCollision(b, p.x, p.y, pegR, PHYS.pegBounce);
    });

    dividers.forEach((d) => {
      if (b.y > d.top && b.y < d.bottom) {
        if (Math.abs(b.x - d.x) < b.r + 2) {
          if (b.x < d.x) {
            b.x = d.x - b.r - 2;
            b.vx = -Math.abs(b.vx) * PHYS.bounce;
          } else {
            b.x = d.x + b.r + 2;
            b.vx = Math.abs(b.vx) * PHYS.bounce;
          }
        }
      }
    });
  }

  function getSlotIndex(x) {
    return Math.min(slotCount - 1, Math.max(0, Math.floor(x / slotW)));
  }

  function tick(now) {
    if (!ball) return;

    const dt = lastTime ? Math.min(3, (now - lastTime) / 16.67) : 1;
    lastTime = now;

    for (let i = 0; i < Math.ceil(dt * 2); i++) {
      physicsStep(ball);
    }

    drawBoard();

    if (ball.y + ball.r >= SLOT_TOP) {
      const idx = getSlotIndex(ball.x);
      const slotCenter = idx * slotW + slotW / 2;
      ball.x += (slotCenter - ball.x) * 0.15;
      ball.vx *= 0.8;
      ball.vy *= 0.7;

      if (ball.y + ball.r >= H - ballR - 8) {
        resultEl.textContent = `🎉 결과: ${SLOTS[idx]}!`;
        resultEl.classList.add('is-show');
        ball = null;
        running = false;
        dropBtn.disabled = false;
        lastTime = 0;
        drawBoard();
        return;
      }
    }

    animId = requestAnimationFrame(tick);
  }

  function dropBall(x) {
    if (running) return;
    running = true;
    dropBtn.disabled = true;
    resultEl.textContent = '공이 떨어지는 중...';
    resultEl.classList.remove('is-show');
    lastTime = 0;

    ball = {
      x: x ?? W / 2 + (Math.random() - 0.5) * 24,
      y: 18,
      r: ballR,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0.2,
    };
    drawBoard();
    animId = requestAnimationFrame(tick);
  }

  dropBtn.addEventListener('click', () => dropBall());

  canvas.addEventListener('click', (e) => {
    if (running) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    if (x < 20 || x > W - 20) return;
    dropBall(x);
  });

  function resizePinballCanvas() {
    const wrap = canvas.parentElement;
    const maxW = wrap.clientWidth;
    const scale = Math.min(1, maxW / W);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    drawBoard();
  }

  resizePinballCanvas();
  window.addEventListener('resize', resizePinballCanvas);
  drawBoard();
}
