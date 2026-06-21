/**
 * 핀볼 맵 — 넓은 통로·넉넉한 핀 간격 (막힘 방지)
 */
(function buildMarbleStages() {
  const CENTER = 14;

  function peg(x, y, radius = 0.32) {
    return {
      type: 'static',
      position: { x, y },
      props: { density: 1, restitution: 0.72, angularVelocity: 0 },
      shape: { type: 'circle', radius, rotation: 0 },
    };
  }

  function wall(points, restitution = 0.1) {
    return {
      type: 'static',
      position: { x: 0, y: 0 },
      props: { density: 1, restitution, angularVelocity: 0 },
      shape: { type: 'polyline', points, rotation: 0 },
    };
  }

  function addPegGrid(entities, left, right, top, bottom, rows, cols) {
    const gapX = (right - left - 1.2) / (cols - 1);
    const gapY = (bottom - top) / Math.max(1, rows - 1);
    for (let row = 0; row < rows; row += 1) {
      const y = top + row * gapY;
      const rowCols = row % 2 === 0 ? cols : cols - 1;
      const offset = row % 2 === 0 ? 0 : gapX * 0.5;
      for (let col = 0; col < rowCols; col += 1) {
        const x = left + 0.8 + offset + col * gapX;
        if (x <= right - 0.7) entities.push(peg(x, y));
      }
    }
  }

  function funnelWalls(left, right, floorY, mouthY) {
    const mid = (left + right) / 2;
    return [
      wall([
        [left, -10],
        [left, mouthY - 6],
        [mid - 2.4, mouthY],
        [mid - 1.1, floorY - 4],
        [mid - 1.1, floorY + 6],
      ]),
      wall([
        [right, -10],
        [right, mouthY - 6],
        [mid + 2.4, mouthY],
        [mid + 1.1, floorY - 4],
        [mid + 1.1, floorY + 6],
      ]),
    ];
  }

  function classicPlinko() {
    const left = CENTER - 5.5;
    const right = CENTER + 5.5;
    const entities = funnelWalls(left, right, 96, 82);
    addPegGrid(entities, left, right, 6, 74, 10, 7);
    return {
      title: 'Classic Plinko',
      goalY: 94,
      zoomY: 86,
      funnelY: 78,
      entities,
    };
  }

  function wideCascade() {
    const left = CENTER - 6;
    const right = CENTER + 6;
    const entities = funnelWalls(left, right, 95, 80);
    addPegGrid(entities, left + 0.5, right - 0.5, 5, 70, 8, 8);

    entities.push(wall([
      [CENTER - 3.5, 52],
      [CENTER - 1.2, 58],
      [CENTER + 1.2, 58],
      [CENTER + 3.5, 52],
    ], 0.35));

    return {
      title: 'Wide Cascade',
      goalY: 93,
      zoomY: 85,
      funnelY: 76,
      entities,
    };
  }

  function starLane() {
    const left = CENTER - 5;
    const right = CENTER + 5;
    const entities = funnelWalls(left, right, 97, 83);
    addPegGrid(entities, left, right, 8, 72, 9, 6);

    for (let i = 0; i < 4; i += 1) {
      const y = 28 + i * 11;
      entities.push(wall([
        [left + 1.5, y],
        [CENTER - 0.8, y + 2.5],
        [CENTER + 0.8, y + 2.5],
        [right - 1.5, y],
      ], 0.2));
    }

    return {
      title: 'Star Lane',
      goalY: 95,
      zoomY: 87,
      funnelY: 77,
      entities,
    };
  }

  window.MARBLE_STAGES = [
    classicPlinko(),
    wideCascade(),
    starLane(),
  ];
})();
