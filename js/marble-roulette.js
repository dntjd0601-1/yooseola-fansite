/**
 * 츄르단 마블 룰렛 — lazygyu/roulette 맵·물리 기반 (MIT / freeware)
 * https://lazygyu.github.io/roulette/
 */
function initMarbleRoulette() {
  const canvas = document.getElementById('pinballCanvas');
  const minimap = document.getElementById('pinballMinimap');
  const namesInput = document.getElementById('pinballNames');
  const mapSelect = document.getElementById('pinballMap');
  const shuffleBtn = document.getElementById('pinballShuffle');
  const startBtn = document.getElementById('pinballStart');
  const restartBtn = document.getElementById('pinballRestart');
  const footerEl = document.getElementById('pinballFooter');
  const winnerEl = document.getElementById('pinballWinner');
  const winnerNameEl = document.getElementById('pinballWinnerName');
  const rankEl = document.getElementById('pinballRank');
  const resultEl = document.getElementById('pinballResult');
  const winBtns = document.querySelectorAll('[data-pinball-win]');
  const rootEl = document.querySelector('.marble-roulette');
  const panel = document.getElementById('gamePinball');

  if (!canvas || !minimap || !rootEl || !panel) return;

  const MAP_NAMES_KO = {
    'Classic Plinko': '클래식 플링코',
    'Wide Cascade': '와이드 폭포',
    'Star Lane': '별빛 코스',
  };

  const INITIAL_ZOOM = 30;
  const ZOOM_THRESHOLD = 5;
  const MARBLE_RADIUS = 0.4;
  const STEP_MS = 10;
  const STUCK_MS = 250;
  const STUCK_MOVE_THRESH = 0.008;
  const STUCK_SPEED_THRESH = 0.35;
  const CHANNEL_CENTER_X = 14;
  const FORCE_FINISH_Y_OFFSET = 1.2;
  const STORAGE_KEY = 'churudan_marble_names';

  const THEME = {
    bgTop: '#0b1224',
    bgBottom: '#050810',
    entity: {
      polyline: { stroke: 'rgba(120, 175, 255, 0.9)', glow: '#6ec4f5', glowR: 10 },
      box: { fill: 'rgba(110, 196, 245, 0.85)', stroke: '#9edcff', glow: '#6ec4f5', glowR: 8 },
      circle: { fill: '#ffe08a', stroke: '#fff6cc', glow: '#ffd966', glowR: 14 },
    },
  };

  let pl = null;
  let stages = null;
  let ctx = null;
  let mctx = null;
  let physics = null;
  let stageIndex = 0;
  let stage = null;
  let marbles = [];
  let winners = [];
  let winner = null;
  let winnerRank = 0;
  let totalCount = 0;
  let winMode = 'first';
  let isRunning = false;
  let started = false;
  let animId = null;
  let lastFrame = 0;
  let accum = 0;
  let timeScale = 1;
  let goalDist = Infinity;
  let fastForward = false;
  let particles = [];

  const camera = { x: 12.95, y: 2, zoom: 1, tx: 12.95, ty: 2, tz: 1, follow: false };

  let catImg = new Image();

  function removeWhiteBackground(img) {
    const c = document.createElement('canvas');
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, w, h);
    const d = data.data;
    const visited = new Uint8Array(w * h);
    const queue = [];

    const isBg = (x, y) => {
      const i = (y * w + x) * 4;
      return d[i] >= 245 && d[i + 1] >= 245 && d[i + 2] >= 245;
    };

    const push = (x, y) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx] || !isBg(x, y)) return;
      visited[idx] = 1;
      queue.push(x, y);
    };

    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }

    while (queue.length) {
      const y = queue.pop();
      const x = queue.pop();
      const i = (y * w + x) * 4;
      d[i + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    cx.putImageData(data, 0, 0);
    const out = new Image();
    out.src = c.toDataURL('image/png');
    return new Promise((resolve) => {
      out.onload = () => resolve(out);
    });
  }

  function loadCatSprite() {
    const raw = new Image();
    const apply = () => {
      removeWhiteBackground(raw).then((processed) => {
        catImg = processed;
        draw();
      });
    };
    raw.onload = apply;
    raw.src = 'images/pinball-cat.png';
    if (raw.complete) apply();
  }

  /* ───────── Physics ───────── */
  function createPhysics(world) {
    const marbleMap = {};
    const entities = [];

    function clearBodies() {
      Object.values(marbleMap).forEach((b) => world.destroyBody(b));
      Object.keys(marbleMap).forEach((k) => delete marbleMap[k]);
      entities.forEach((e) => world.destroyBody(e.body));
      entities.length = 0;
    }

    function loadStage(def) {
      clearBodies();
      (def.entities || []).forEach((ent) => {
        const bodyType = ent.type === 'kinematic' ? 'kinematic' : 'static';
        const body = world.createBody({
          type: bodyType,
          position: pl.Vec2(ent.position.x, ent.position.y),
          angle: ent.shape.type === 'box' ? (ent.shape.rotation || 0) : 0,
        });
        if (ent.props.angularVelocity) body.setAngularVelocity(ent.props.angularVelocity);

        const fixDef = {
          friction: 0.05,
          restitution: ent.props.restitution ?? 0.08,
          density: ent.props.density ?? 1,
        };

        if (ent.shape.type === 'box') {
          body.createFixture(pl.Box(ent.shape.width, ent.shape.height), fixDef);
        } else if (ent.shape.type === 'circle') {
          body.createFixture(pl.Circle(ent.shape.radius), {
            friction: 0.04,
            restitution: ent.props.restitution ?? 0.72,
            density: 1,
          });
        } else if (ent.shape.type === 'polyline') {
          const pts = ent.shape.points;
          for (let i = 0; i < pts.length - 1; i++) {
            body.createFixture(
              pl.Edge(pl.Vec2(pts[i][0], pts[i][1]), pl.Vec2(pts[i + 1][0], pts[i + 1][1])),
              { friction: 0.03, restitution: ent.props.restitution ?? 0.12 },
            );
          }
        }

        entities.push({
          body,
          x: ent.position.x,
          y: ent.position.y,
          shape: ent.shape,
          life: ent.props.life ?? -1,
        });
      });
    }

    return {
      loadStage,
      clearBodies,
      createMarble(id, x, y) {
        const body = world.createBody({ type: 'dynamic', position: pl.Vec2(x, y) });
        body.createFixture(pl.Circle(MARBLE_RADIUS), {
          density: 1.1 + Math.random() * 0.3,
          friction: 0.002,
          restitution: 0.42,
        });
        body.setSleepingAllowed(false);
        body.setBullet(true);
        body.setActive(false);
        marbleMap[id] = body;
      },
      startMarbles() {
        Object.values(marbleMap).forEach((b) => b.setActive(true));
      },
      getMarbleVelocity(id) {
        const b = marbleMap[id];
        if (!b) return { x: 0, y: 0 };
        const v = b.getLinearVelocity();
        return { x: v.x, y: v.y };
      },
      nudgeMarble(id) {
        const b = marbleMap[id];
        if (!b) return;
        b.setAwake(true);
        const pos = b.getPosition();
        const vel = b.getLinearVelocity();
        const pullX = (CHANNEL_CENTER_X - pos.x) * 1.6;
        if (vel.y < 2) {
          b.applyForce(pl.Vec2(pullX, 8), b.getWorldCenter(), true);
        }
      },
      funnelAssist(id) {
        const b = marbleMap[id];
        if (!b) return;
        b.setAwake(true);
        const pos = b.getPosition();
        const vel = b.getLinearVelocity();
        const pullX = (CHANNEL_CENTER_X - pos.x) * 3.5;
        b.applyForce(pl.Vec2(pullX, 14), b.getWorldCenter(), true);
        if (vel.y < 3) {
          b.setLinearVelocity(pl.Vec2(vel.x * 0.5 + pullX * 0.08, Math.max(vel.y, 4)));
        }
      },
      forceFinish(id, goalY) {
        const b = marbleMap[id];
        if (!b) return;
        b.setAwake(true);
        b.setLinearVelocity(pl.Vec2(0, 0));
        b.setTransform(pl.Vec2(CHANNEL_CENTER_X, goalY + FORCE_FINISH_Y_OFFSET), 0);
      },
      unstickMarble(id) {
        const b = marbleMap[id];
        if (!b) return;
        b.setAwake(true);
        const pos = b.getPosition();
        const vel = b.getLinearVelocity();
        const pullX = Math.max(-10, Math.min(10, (CHANNEL_CENTER_X - pos.x) * 5));
        b.setLinearVelocity(pl.Vec2(vel.x * 0.15 + pullX * 0.12, Math.max(vel.y, 5)));
        b.applyLinearImpulse(pl.Vec2(pullX, 12 + Math.random() * 4), b.getWorldCenter(), true);
      },
      removeMarble(id) {
        if (marbleMap[id]) {
          world.destroyBody(marbleMap[id]);
          delete marbleMap[id];
        }
      },
      getMarble(id) {
        const b = marbleMap[id];
        if (!b) return { x: 0, y: 0, angle: 0 };
        const p = b.getPosition();
        return { x: p.x, y: p.y, angle: b.getAngle() };
      },
      step(dt) {
        world.step(dt, 18, 8);
      },
      getEntities() {
        return entities.map((e) => ({
          x: e.x,
          y: e.y,
          angle: e.body.getAngle(),
          shape: e.shape,
        }));
      },
    };
  }

  /* ───────── Camera ───────── */
  function setCamera(center, zoom) {
    camera.x = camera.tx = center?.x ?? 14;
    camera.y = camera.ty = center?.y ?? 2;
    camera.zoom = camera.tz = zoom ?? 1.5;
    camera.follow = false;
  }

  function calcSpawnCamera(count) {
    const cols = Math.min(count, 10);
    const rows = Math.ceil(count / 10);
    const lineDelta = -Math.max(0, rows - 5);
    const cx = 10.25 + (cols - 1) * 0.3;
    const cy = (1 + rows) / 2 + lineDelta;
    const margin = 4;
    const viewW = canvas.width / INITIAL_ZOOM;
    const viewH = canvas.height / INITIAL_ZOOM;
    const spawnW = Math.max((cols - 1) * 0.6, 1);
    const spawnH = Math.max(rows - 1, 1);
    const z = Math.max(1.4, Math.min(
      viewW / (spawnW + margin * 2),
      viewH / (spawnH + margin * 2),
      3.2,
    ));
    setCamera({ x: cx, y: cy }, z);
  }

  function updateCamera() {
    if (!camera.follow || !marbles.length) return;
    const idx = Math.max(0, winnerRank - winners.length);
    const target = marbles[idx] || marbles[0];
    camera.tx = target.x;
    camera.ty = target.y;
    if (goalDist < ZOOM_THRESHOLD) {
      camera.tz = Math.max(1, (1 - goalDist / ZOOM_THRESHOLD) * 4);
    } else {
      camera.tz = 1;
    }
    camera.x += (camera.tx - camera.x) * 0.12;
    camera.y += (camera.ty - camera.y) * 0.12;
    camera.zoom += (camera.tz - camera.zoom) * 0.12;
  }

  function applyWorldTransform(context) {
    const s = INITIAL_ZOOM * camera.zoom;
    context.setTransform(
      s, 0, 0, s,
      canvas.width * 0.5 - camera.x * s,
      canvas.height * 0.5 - camera.y * s,
    );
  }

  /* ───────── Game logic ───────── */
  function parseNames(text) {
    const out = [];
    text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).forEach((part) => {
      const m = part.match(/^(.+?)\*(\d+)$/);
      if (m) {
        const n = Math.min(30, parseInt(m[2], 10) || 1);
        for (let i = 0; i < n; i++) out.push(m[1].trim());
      } else {
        out.push(part);
      }
    });
    return out.slice(0, 30);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setupMarbles(names) {
    physics.loadStage(stage);
    marbles = [];
    winners = [];
    winner = null;
    particles = [];

    const orders = shuffle(names.map((_, i) => i));
    names.forEach((name, i) => {
      const order = orders[i];
      const maxLine = Math.ceil(names.length / 10);
      const line = Math.floor(order / 10);
      const lineDelta = -Math.max(0, Math.ceil(maxLine / 10) - 5);
      const hue = Math.round((360 / names.length) * order);
      const x = 10.25 + (order % 10) * 0.6;
      const y = maxLine - line + lineDelta;
      physics.createMarble(order, x, y);
      marbles.push({
        id: order,
        name,
        hue,
        color: `hsl(${hue} 90% 65%)`,
        active: false,
        finished: false,
        stuck: 0,
        lx: x,
        ly: y,
        x,
        y,
        angle: 0,
      });
    });
    totalCount = names.length;
    calcSpawnCamera(totalCount);
    goalDist = Infinity;
    syncMarbles();
  }

  function syncMarbles() {
    marbles.forEach((m) => {
      const p = physics.getMarble(m.id);
      m.x = p.x;
      m.y = p.y;
      m.angle = p.angle;
    });
  }

  function updateMarbles(dt) {
    const funnelY = stage.funnelY ?? stage.goalY - 18;

    marbles.forEach((m) => {
      const p = physics.getMarble(m.id);
      m.x = p.x;
      m.y = p.y;
      m.angle = p.angle;

      if (m.active && !m.finished) {
        const vel = physics.getMarbleVelocity(m.id);
        const speed = Math.hypot(vel.x, vel.y);
        const moved = Math.hypot(m.x - m.lx, m.y - m.ly);

        if (m.y >= funnelY) {
          physics.funnelAssist(m.id);
        } else if (speed < 0.55 && vel.y < 1.5) {
          physics.nudgeMarble(m.id);
        }

        if (speed < STUCK_SPEED_THRESH && moved < STUCK_MOVE_THRESH) {
          m.stuck += dt;
          if (m.stuck > STUCK_MS) {
            if (m.y >= funnelY - 4) {
              physics.forceFinish(m.id, stage.goalY);
              const forced = physics.getMarble(m.id);
              m.x = forced.x;
              m.y = forced.y;
              m.stuck = 0;
            } else {
              physics.unstickMarble(m.id);
              m.stuck = 0;
            }
          }
        } else {
          m.stuck = 0;
        }

        if (m.y >= stage.goalY - 6 && speed < 0.25 && m.stuck > STUCK_MS * 0.6) {
          physics.forceFinish(m.id, stage.goalY);
          const forced = physics.getMarble(m.id);
          m.x = forced.x;
          m.y = forced.y;
          m.stuck = 0;
        }

        m.lx = m.x;
        m.ly = m.y;
      }

      if (m.y > stage.goalY && !m.finished) {
        m.finished = true;
        winners.push(m);
        setTimeout(() => physics.removeMarble(m.id), 400);
        checkWinner();
      }
    });

    marbles = marbles.filter((m) => !m.finished || m.y <= stage.goalY);
    const idx = Math.max(0, winnerRank - winners.length);
    const lead = marbles[idx];
    goalDist = lead ? Math.abs(stage.zoomY - lead.y) : Infinity;

    if (winners.length < winnerRank + 1 && goalDist < ZOOM_THRESHOLD && lead?.y > stage.zoomY - ZOOM_THRESHOLD * 1.2) {
      timeScale = Math.max(0.25, goalDist / ZOOM_THRESHOLD);
    } else {
      timeScale = 1;
    }
    updateRank();
  }

  function checkWinner() {
    if (!isRunning) return;
    if (winners.length === winnerRank + 1) {
      finishGame(winners[winnerRank]);
    } else if (winnerRank === totalCount - 1 && winners.length === totalCount - 1) {
      const last = marbles.find((m) => !m.finished) || winners[winners.length - 1];
      if (last) finishGame(last);
    }
  }

  function showRestart(on) {
    if (footerEl) footerEl.hidden = !on;
  }

  function resetGame() {
    isRunning = false;
    winner = null;
    winners = [];
    winnerEl.hidden = true;
    accum = 0;
    lastFrame = 0;
    goalDist = Infinity;
    timeScale = 1;
    fastForward = false;
    camera.follow = false;
    rootEl.classList.remove('is-playing');
    enableControls(true);
    showRestart(false);
    shuffleGame();
  }

  function finishGame(m) {
    isRunning = false;
    winner = m;
    winnerNameEl.textContent = m.name;
    winnerEl.hidden = false;
    if (resultEl) resultEl.textContent = `🎉 당첨: ${m.name}`;
    rootEl.classList.remove('is-playing');
    enableControls(true);
    showRestart(true);
    spawnParticles();
    setTimeout(() => resize(), 80);
  }

  function spawnParticles() {
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        life: 60 + Math.random() * 40,
        color: `hsl(${Math.random() * 360} 80% 60%)`,
      });
    }
  }

  function updateParticles() {
    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 1;
      return p.life > 0;
    });
  }

  function updateRank() {
    if (!rankEl) return;
    rankEl.innerHTML = winners.map((m, i) => {
      const win = (winMode === 'first' && i === 0) || (winMode === 'last' && i === winners.length - 1 && !isRunning);
      return `<li class="${win ? 'is-winner' : ''}"><span>${i + 1}</span>${m.name}</li>`;
    }).join('');
  }

  /* ───────── Draw ───────── */
  function drawEntities(context, list) {
    list.forEach((ent) => {
      context.save();
      context.translate(ent.x, ent.y);
      context.rotate(ent.angle);
      const shape = ent.shape;
      const theme = THEME.entity[shape.type] || THEME.entity.polyline;
      context.lineWidth = Math.max(0.06, 2.8 / (camera.zoom + INITIAL_ZOOM));
      context.strokeStyle = shape.color || theme.stroke || '#fff';
      context.fillStyle = shape.color || theme.fill || '#fff';
      context.shadowBlur = theme.glowR || 0;
      context.shadowColor = shape.bloomColor || theme.glow || '#0ff';

      if (shape.type === 'polyline' && shape.points?.length) {
        context.beginPath();
        context.moveTo(shape.points[0][0], shape.points[0][1]);
        for (let i = 1; i < shape.points.length; i++) {
          context.lineTo(shape.points[i][0], shape.points[i][1]);
        }
        context.stroke();
      } else if (shape.type === 'box') {
        const w = shape.width * 2;
        const h = shape.height * 2;
        context.fillRect(-w / 2, -h / 2, w, h);
        context.strokeRect(-w / 2, -h / 2, w, h);
      } else if (shape.type === 'circle') {
        context.beginPath();
        context.arc(0, 0, shape.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
      context.shadowBlur = 0;
      context.restore();
    });
  }

  function drawMarble(context, m, highlight) {
    const r = MARBLE_RADIUS;
    const labelScale = 1 / (camera.zoom * INITIAL_ZOOM);

    context.save();
    context.translate(m.x, m.y);
    context.rotate(m.angle);
    if (catImg.complete && catImg.naturalWidth) {
      context.save();
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.clip();
      context.drawImage(catImg, -r, -r, r * 2, r * 2);
      context.restore();
    } else {
      context.fillStyle = m.color;
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fill();
    }
    if (highlight) {
      context.strokeStyle = '#fff';
      context.lineWidth = 0.04;
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();

    context.save();
    context.translate(m.x, m.y + r + 0.12);
    context.scale(labelScale, labelScale);
    context.font = 'bold 14px "Noto Sans KR", sans-serif';
    context.textAlign = 'center';
    context.lineWidth = 3;
    context.strokeStyle = '#000';
    context.fillStyle = m.color;
    context.strokeText(m.name, 0, 0);
    context.fillText(m.name, 0, 0);
    context.restore();
  }

  function drawMinimap() {
    const mw = minimap.width;
    const mh = minimap.height;
    if (!mw || !mh) return;

    mctx.fillStyle = 'rgba(20,20,30,0.95)';
    mctx.fillRect(0, 0, mw, mh);

    const sx = mw / 28;
    const sy = mh / (stage.goalY + 30);

    physics.getEntities().forEach((e) => {
      if (e.shape.type !== 'polyline' || !e.shape.points?.length) return;
      mctx.strokeStyle = 'rgba(255,255,255,0.3)';
      mctx.lineWidth = 1;
      mctx.beginPath();
      e.shape.points.forEach((p, i) => {
        const px = (e.x + p[0]) * sx;
        const py = (e.y + p[1]) * sy;
        if (i === 0) mctx.moveTo(px, py);
        else mctx.lineTo(px, py);
      });
      mctx.stroke();
    });

    marbles.forEach((m) => {
      mctx.fillStyle = m.color;
      mctx.beginPath();
      mctx.arc(m.x * sx, m.y * sy, 3.5, 0, Math.PI * 2);
      mctx.fill();
    });

    const viewH = (canvas.height / (INITIAL_ZOOM * camera.zoom)) * sy;
    mctx.strokeStyle = '#5eb8e8';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(0, (camera.y - canvas.height / (INITIAL_ZOOM * camera.zoom * 2)) * sy, mw, viewH);
  }

  function drawParticles2D() {
    particles.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!ctx || canvas.width < 2 || canvas.height < 2) return;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, THEME.bgTop);
    grad.addColorStop(1, THEME.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyWorldTransform(ctx);
    drawEntities(ctx, physics.getEntities());

    const leadIdx = Math.max(0, winnerRank - winners.length);
    marbles.forEach((m, i) => drawMarble(ctx, m, isRunning && i === leadIdx));
    ctx.restore();

    drawMinimap();
    drawParticles2D();

    if (winner && !isRunning) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, canvas.height - 72, canvas.width, 72);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`당첨: ${winner.name}`, canvas.width - 16, canvas.height - 28);
    }
  }

  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;
    accum += dt * (fastForward ? 3 : 1);

    if (isRunning) {
      while (accum >= STEP_MS) {
        physics.step((STEP_MS / 1000) * timeScale);
        updateMarbles(STEP_MS);
        accum -= STEP_MS;
      }
      if (marbles.length > 1) marbles.sort((a, b) => b.y - a.y);
      updateCamera();
    }

    updateParticles();
    draw();
    animId = requestAnimationFrame(frame);
  }

  /* ───────── UI ───────── */
  function enableControls(on) {
    startBtn.disabled = !on;
    shuffleBtn.disabled = !on;
    namesInput.disabled = !on;
    mapSelect.disabled = !on;
    winBtns.forEach((b) => { b.disabled = !on; });
  }

  function shuffleGame() {
    const names = parseNames(namesInput.value);
    if (!names.length) {
      if (resultEl) resultEl.textContent = '이름을 입력해 주세요.';
      return;
    }
    localStorage.setItem(STORAGE_KEY, namesInput.value);
    setupMarbles(names);
    winnerEl.hidden = true;
    if (!isRunning) showRestart(false);
    if (resultEl) resultEl.textContent = `${names.length}명 준비 완료 · 셔플됨`;
    draw();
  }

  function startGame() {
    const names = parseNames(namesInput.value);
    if (names.length < 2) {
      if (resultEl) resultEl.textContent = '2명 이상 입력해 주세요.';
      return;
    }
    setupMarbles(names);
    winnerRank = winMode === 'last' ? Math.max(0, totalCount - 1) : 0;
    isRunning = true;
    winner = null;
    winners = [];
    winnerEl.hidden = true;
    accum = 0;
    lastFrame = 0;
    goalDist = Infinity;
    timeScale = 1;
    if (resultEl) resultEl.textContent = '진행 중…';

    rootEl.classList.add('is-playing');
    enableControls(false);
    showRestart(true);
    marbles.forEach((m) => { m.active = true; });
    camera.follow = true;
    physics.startMarbles();
    resize();
  }

  function loadMap(index) {
    if (isRunning) return;
    stageIndex = index;
    stage = stages[index];
    shuffleGame();
  }

  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap || wrap.clientWidth < 10) return;

    const w = wrap.clientWidth;
    const h = Math.max(220, wrap.clientHeight);
    canvas.width = w;
    canvas.height = h;

    minimap.width = 110;
    minimap.height = Math.min(72, Math.round(110 * 0.55));

    if (marbles.length && !isRunning) calcSpawnCamera(totalCount);
    draw();
  }

  function boot() {
    if (started) {
      resize();
      return;
    }
    if (typeof planck === 'undefined' || !window.MARBLE_STAGES?.length) {
      if (resultEl) resultEl.textContent = '핀볼 엔진 로딩 실패';
      return;
    }

    started = true;
    pl = planck;
    stages = window.MARBLE_STAGES;
    stage = stages[stageIndex];
    ctx = canvas.getContext('2d', { alpha: false });
    mctx = minimap.getContext('2d');
    physics = createPhysics(pl.World(pl.Vec2(0, 16)));

    stages.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = MAP_NAMES_KO[s.title] || s.title;
      mapSelect.appendChild(opt);
    });
    mapSelect.value = String(stageIndex);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) namesInput.value = saved;

    winBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isRunning) return;
        winMode = btn.dataset.pinballWin;
        winBtns.forEach((b) => b.classList.toggle('active', b === btn));
      });
    });

    mapSelect.addEventListener('change', () => loadMap(parseInt(mapSelect.value, 10)));
    shuffleBtn.addEventListener('click', shuffleGame);
    startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', resetGame);

    const setFast = (v) => { if (isRunning) fastForward = v; };
    canvas.addEventListener('mousedown', () => setFast(true));
    canvas.addEventListener('mouseup', () => setFast(false));
    canvas.addEventListener('mouseleave', () => setFast(false));
    canvas.addEventListener('touchstart', (e) => { setFast(true); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', () => setFast(false));

    loadCatSprite();

    panel.__pinballResize = () => { if (started) resize(); else boot(); };

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => resize()).observe(wrap = canvas.parentElement);
    }
    window.addEventListener('resize', resize);

    physics.loadStage(stage);
    shuffleGame();
    resize();
    if (!animId) animId = requestAnimationFrame(frame);
  }

  let wrap;
  panel.__pinballResize = boot;

  if (panel.classList.contains('active')) boot();
}
