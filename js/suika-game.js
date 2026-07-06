/**
 * 츄르단 수박게임 — Matter.js + 유설아 움짤 스프라이트
 * 참고: https://v-company.xyz/games/suika
 */

let suikaPaused = true;
let suikaAnimFrame = null;
let suikaLastFrameAt = 0;

function initSuikaGame() {
  const panel = document.getElementById('gameSuika');
  if (!panel || panel.__suikaReady) return;

  if (typeof Matter === 'undefined' || !Array.isArray(SUIKA_TIERS)) {
    showSuikaError('게임 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
    return;
  }

  panel.__suikaReady = true;
  panel.__suikaState = createSuikaState(panel);
  renderSuikaEvolution();
  bindSuikaControls(panel.__suikaState);
  resetSuikaGame(panel.__suikaState);
  suikaPaused = false;
}

function pauseSuikaGame() {
  suikaPaused = true;
  if (suikaAnimFrame) {
    cancelAnimationFrame(suikaAnimFrame);
    suikaAnimFrame = null;
  }
}

function resumeSuikaGame() {
  const panel = document.getElementById('gameSuika');
  const state = panel?.__suikaState;
  if (!state?.engine || state.gameOver) return;
  suikaPaused = false;
  suikaLastFrameAt = performance.now();
  fitSuikaBoard(state);
  startSuikaLoop(state);
}

function focusSuikaGame() {
  document.getElementById('suikaBoardWrap')?.focus?.();
}

function showSuikaError(message) {
  const board = document.getElementById('suikaBoardWrap');
  if (board) board.innerHTML = `<p class="suika-game__error">${message}</p>`;
}

function createSuikaState(panel) {
  return {
    panel,
    boardEl: document.getElementById('suikaBoard'),
    spritesEl: document.getElementById('suikaSprites'),
    previewEl: document.getElementById('suikaPreview'),
    dropLineEl: document.getElementById('suikaDropLine'),
    dropLineEl: document.getElementById('suikaDropLine'),
    scoreEl: document.getElementById('suikaScore'),
    bestEl: document.getElementById('suikaBest'),
    nextBallEl: document.getElementById('suikaNextBall'),
    overlayEl: document.getElementById('suikaOverlay'),
    overlayTitleEl: document.getElementById('suikaOverlayTitle'),
    overlayScoreEl: document.getElementById('suikaOverlayScore'),
    scale: 1,
    score: 0,
    best: Number(localStorage.getItem(SUIKA_STORAGE_KEY) || 0),
    currentType: 0,
    nextType: 0,
    dropX: SUIKA_BOARD.width / 2,
    canDrop: true,
    gameOver: false,
    melons: 0,
    bodyMap: new Map(),
    pendingMerges: [],
    dangerTimer: 0,
    lastDropAt: 0,
    engine: null,
    previewNode: null,
  };
}

function renderSuikaEvolution() {
  const el = document.getElementById('suikaEvolution');
  if (!el) return;
  el.innerHTML = SUIKA_TIERS.map((tier, index) => {
    const size = Math.max(28, Math.round(tier.radius * 0.72));
    return `
      <div class="suika-game__evo-item" style="--evo-size:${size}px" title="${tier.name}">
        <img src="${tier.image}" alt="${tier.name}" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer">
        <span class="suika-game__evo-label">${index + 1}</span>
      </div>
    `;
  }).join('');
}

function bindSuikaControls(state) {
  const wrap = document.getElementById('suikaBoardWrap');
  const restartBtn = document.getElementById('suikaRestart');
  const overlayBtn = document.getElementById('suikaOverlayBtn');

  if (state.bestEl) state.bestEl.textContent = String(state.best);

  const setDropX = (clientX) => {
    if (!wrap || state.gameOver || !state.canDrop) return;
    const rect = wrap.getBoundingClientRect();
    const localX = (clientX - rect.left) / state.scale;
    const tier = SUIKA_TIERS[state.currentType];
    const min = tier.radius + 10;
    const max = SUIKA_BOARD.width - tier.radius - 10;
    state.dropX = Math.max(min, Math.min(max, localX));
    updateSuikaPreview(state);
  };

  wrap?.addEventListener('pointermove', (e) => setDropX(e.clientX));
  wrap?.addEventListener('pointerdown', (e) => {
    wrap.setPointerCapture?.(e.pointerId);
    setDropX(e.clientX);
    dropSuikaFruit(state);
  });
  wrap?.addEventListener('keydown', (e) => {
    if (state.gameOver) return;
    const step = e.shiftKey ? 20 : 10;
    if (e.key === 'ArrowLeft') {
      state.dropX = Math.max(SUIKA_TIERS[state.currentType].radius + 10, state.dropX - step);
      updateSuikaPreview(state);
    } else if (e.key === 'ArrowRight') {
      state.dropX = Math.min(SUIKA_BOARD.width - SUIKA_TIERS[state.currentType].radius - 10, state.dropX + step);
      updateSuikaPreview(state);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      dropSuikaFruit(state);
    }
  });

  restartBtn?.addEventListener('click', () => resetSuikaGame(state));
  overlayBtn?.addEventListener('click', () => {
    hideSuikaOverlay(state);
    resetSuikaGame(state);
  });

  window.addEventListener('resize', () => {
    if (state.panel.classList.contains('active')) fitSuikaBoard(state);
  });
}

function fitSuikaBoard(state) {
  const wrap = document.getElementById('suikaBoardWrap');
  if (!wrap || !state.boardEl) return;
  const maxW = Math.min(wrap.parentElement?.clientWidth || 560, 560);
  const maxH = Math.min(760, window.innerHeight * 0.58);
  state.scale = Math.min(maxW / SUIKA_BOARD.width, maxH / SUIKA_BOARD.height, 1);
  state.boardEl.style.width = `${SUIKA_BOARD.width}px`;
  state.boardEl.style.height = `${SUIKA_BOARD.height}px`;
  state.boardEl.style.transform = `scale(${state.scale})`;
  wrap.style.height = `${Math.floor(SUIKA_BOARD.height * state.scale)}px`;
}

function randomSuikaType() {
  return Math.floor(Math.random() * SUIKA_BOARD.maxDropTier);
}

function suikaImgHtml(tier) {
  return `<img src="${tier.image}" alt="${tier.name}" loading="eager" decoding="async" referrerpolicy="no-referrer">`;
}

function updateSuikaPreview(state) {
  if (!state.previewEl) return;
  const tier = SUIKA_TIERS[state.currentType];
  if (!state.previewNode) {
    state.previewNode = document.createElement('div');
    state.previewNode.className = 'suika-game__fruit suika-game__fruit--preview';
    state.previewEl.appendChild(state.previewNode);
  }
  const size = tier.radius * 2;
  state.previewNode.style.width = `${size}px`;
  state.previewNode.style.height = `${size}px`;
  state.previewNode.style.left = `${state.dropX - tier.radius}px`;
  state.previewNode.style.top = `${SUIKA_BOARD.dropY - tier.radius}px`;
  state.previewNode.style.borderColor = `${tier.color}99`;
  state.previewNode.style.backgroundColor = `${tier.color}22`;
  state.previewNode.innerHTML = suikaImgHtml(tier);

  if (state.dropLineEl) {
    state.dropLineEl.style.left = `${state.dropX}px`;
    state.dropLineEl.style.top = `${SUIKA_BOARD.dropY}px`;
    state.dropLineEl.style.height = `${SUIKA_BOARD.dangerY - SUIKA_BOARD.dropY + 8}px`;
  }
}

function updateSuikaNext(state) {
  if (!state.nextBallEl) return;
  const tier = SUIKA_TIERS[state.nextType];
  const size = Math.max(34, tier.radius * 1.15);
  state.nextBallEl.style.width = `${size}px`;
  state.nextBallEl.style.height = `${size}px`;
  state.nextBallEl.style.borderColor = `${tier.color}99`;
  state.nextBallEl.innerHTML = suikaImgHtml(tier);
}

function setSuikaScore(state, score) {
  state.score = score;
  if (state.scoreEl) state.scoreEl.textContent = String(score);
  if (score > state.best) {
    state.best = score;
    localStorage.setItem(SUIKA_STORAGE_KEY, String(score));
    if (state.bestEl) state.bestEl.textContent = String(score);
  }
}

function createSuikaSprite(state, body, type) {
  const tier = SUIKA_TIERS[type];
  const node = document.createElement('div');
  node.className = 'suika-game__fruit';
  node.dataset.bodyId = String(body.id);
  const size = tier.radius * 2;
  node.style.width = `${size}px`;
  node.style.height = `${size}px`;
  node.style.borderColor = `${tier.color}99`;
  node.style.backgroundColor = `${tier.color}22`;
  node.innerHTML = suikaImgHtml(tier);
  state.spritesEl.appendChild(node);
  state.bodyMap.set(body.id, { body, type, node });
  return node;
}

function syncSuikaSprites(state) {
  state.bodyMap.forEach(({ body, node }) => {
    const x = body.position.x;
    const y = body.position.y;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    node.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0) rotate(${body.angle}rad)`;
  });
}

function playSuikaTone(kind, pitch = 1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (kind === 'drop') {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (kind === 'merge') {
      [1, 1.25, 1.5].forEach((mult, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 320 * pitch * mult;
        g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.04 + 0.12);
        o.start(ctx.currentTime + i * 0.04);
        o.stop(ctx.currentTime + i * 0.04 + 0.12);
      });
    } else if (kind === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.value = 120;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    /* ignore audio errors */
  }
}

function suikaBodyOptions() {
  return {
    restitution: SUIKA_PHYSICS.restitution,
    friction: SUIKA_PHYSICS.friction,
    frictionAir: SUIKA_PHYSICS.frictionAir,
    label: 'fruit',
  };
}

function dropSuikaFruit(state) {
  if (state.gameOver || !state.canDrop || !state.engine) return;
  const now = Date.now();
  if (now - state.lastDropAt < SUIKA_BOARD.dropCooldownMs) return;
  state.lastDropAt = now;
  state.canDrop = false;
  playSuikaTone('drop');

  const { Bodies, Composite } = Matter;
  const tier = SUIKA_TIERS[state.currentType];
  const body = Bodies.circle(state.dropX, SUIKA_BOARD.dropY, tier.radius, suikaBodyOptions());
  Composite.add(state.engine.world, body);
  body.droppedAt = Date.now();
  createSuikaSprite(state, body, state.currentType);

  state.currentType = state.nextType;
  state.nextType = randomSuikaType();
  updateSuikaPreview(state);
  updateSuikaNext(state);

  setTimeout(() => {
    state.canDrop = !state.gameOver;
  }, SUIKA_BOARD.dropCooldownMs);
}

function handleSuikaCollisions(state, pairs) {
  const { Composite } = Matter;
  for (const pair of pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    if (a.label === 'wall' || b.label === 'wall') continue;

    const metaA = state.bodyMap.get(a.id);
    const metaB = state.bodyMap.get(b.id);
    if (!metaA || !metaB) continue;
    if (metaA.type !== metaB.type) continue;
    if (state.pendingMerges.some((p) => p.a === a.id || p.b === a.id || p.a === b.id || p.b === b.id)) continue;

    state.pendingMerges.push({ a: a.id, b: b.id, type: metaA.type });
  }

  const merges = [...state.pendingMerges];
  state.pendingMerges = [];

  merges.forEach(({ a, b, type }) => {
    const metaA = state.bodyMap.get(a);
    const metaB = state.bodyMap.get(b);
    if (!metaA || !metaB) return;

    if (type >= SUIKA_TIERS.length - 1) {
      Composite.remove(state.engine.world, [metaA.body, metaB.body]);
      metaA.node.remove();
      metaB.node.remove();
      state.bodyMap.delete(a);
      state.bodyMap.delete(b);
      setSuikaScore(state, state.score + 1000);
      state.melons += 1;
      playSuikaTone('merge', 2);
      return;
    }

    const nextType = type + 1;
    const nextTier = SUIKA_TIERS[nextType];
    const x = (metaA.body.position.x + metaB.body.position.x) / 2;
    const y = (metaA.body.position.y + metaB.body.position.y) / 2;
    const clampedX = Math.max(nextTier.radius + 2, Math.min(SUIKA_BOARD.width - nextTier.radius - 2, x));
    const clampedY = Math.min(SUIKA_BOARD.height - nextTier.radius - 2, y);

    Composite.remove(state.engine.world, [metaA.body, metaB.body]);
    metaA.node.remove();
    metaB.node.remove();
    state.bodyMap.delete(a);
    state.bodyMap.delete(b);

    const { Bodies, Composite: Comp } = Matter;
    const newBody = Bodies.circle(clampedX, clampedY, nextTier.radius, suikaBodyOptions());
    Comp.add(state.engine.world, newBody);
    newBody.droppedAt = Date.now();
    createSuikaSprite(state, newBody, nextType);
    setSuikaScore(state, state.score + nextTier.points);
    if (nextType === SUIKA_TIERS.length - 1) state.melons += 1;
    playSuikaTone('merge', 1 + nextType * 0.08);
  });
}

function checkSuikaDanger(state, deltaMs) {
  let danger = false;
  const now = Date.now();
  state.bodyMap.forEach(({ body, type }) => {
    const tier = SUIKA_TIERS[type];
    if (now - (body.droppedAt || 0) < 1200) return;
    if (body.position.y - tier.radius < SUIKA_BOARD.dangerY && Math.abs(body.velocity.y) < 0.35) {
      danger = true;
    }
  });

  if (danger) {
    state.dangerTimer += deltaMs;
    if (state.dangerTimer > 1400) endSuikaGame(state);
  } else {
    state.dangerTimer = 0;
  }
}

function endSuikaGame(state) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.canDrop = false;
  playSuikaTone('gameover');
  if (state.overlayEl) {
    state.overlayEl.hidden = false;
    if (state.overlayTitleEl) state.overlayTitleEl.textContent = '게임 오버';
    if (state.overlayScoreEl) {
      state.overlayScoreEl.textContent = `점수 ${state.score} · 대설아 ${state.melons}개`;
    }
  }
}

function hideSuikaOverlay(state) {
  if (state.overlayEl) state.overlayEl.hidden = true;
}

function clearSuikaWorld(state) {
  pauseSuikaGame();
  if (state.engine) {
    Matter.Engine.clear(state.engine);
    state.engine = null;
  }
  state.bodyMap.clear();
  state.pendingMerges = [];
  if (state.spritesEl) state.spritesEl.innerHTML = '';
  if (state.previewEl) {
    state.previewEl.innerHTML = '<div class="suika-game__drop-line" id="suikaDropLine" aria-hidden="true"></div>';
    state.dropLineEl = document.getElementById('suikaDropLine');
  }
  state.previewNode = null;
}

function resetSuikaGame(state) {
  clearSuikaWorld(state);
  hideSuikaOverlay(state);

  state.score = 0;
  state.melons = 0;
  state.gameOver = false;
  state.canDrop = true;
  state.dangerTimer = 0;
  state.lastDropAt = 0;
  state.currentType = randomSuikaType();
  state.nextType = randomSuikaType();
  setSuikaScore(state, 0);
  updateSuikaNext(state);
  fitSuikaBoard(state);

  const { Engine, Bodies, Composite, Events } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: SUIKA_PHYSICS.gravity } });
  const walls = [
    Bodies.rectangle(SUIKA_BOARD.width / 2, SUIKA_BOARD.height + 10, SUIKA_BOARD.width + 40, 20, {
      isStatic: true,
      label: 'wall',
      friction: SUIKA_PHYSICS.friction,
      restitution: 0,
    }),
    Bodies.rectangle(-10, SUIKA_BOARD.height / 2, 20, SUIKA_BOARD.height + 40, {
      isStatic: true,
      label: 'wall',
      friction: 0.12,
      restitution: 0,
    }),
    Bodies.rectangle(SUIKA_BOARD.width + 10, SUIKA_BOARD.height / 2, 20, SUIKA_BOARD.height + 40, {
      isStatic: true,
      label: 'wall',
      friction: 0.12,
      restitution: 0,
    }),
  ];
  Composite.add(engine.world, walls);

  Events.on(engine, 'collisionStart', (e) => handleSuikaCollisions(state, e.pairs));

  state.engine = engine;
  updateSuikaPreview(state);
  suikaPaused = false;
  suikaLastFrameAt = performance.now();
  startSuikaLoop(state);
}

function startSuikaLoop(state) {
  if (suikaAnimFrame) cancelAnimationFrame(suikaAnimFrame);

  const loop = (now) => {
    if (suikaPaused || !state.engine) return;
    const deltaMs = Math.min(32, now - suikaLastFrameAt || 16);
    suikaLastFrameAt = now;
    Matter.Engine.update(state.engine, deltaMs);
    syncSuikaSprites(state);
    if (!state.gameOver) checkSuikaDanger(state, deltaMs);
    suikaAnimFrame = requestAnimationFrame(loop);
  };

  suikaAnimFrame = requestAnimationFrame(loop);
}
