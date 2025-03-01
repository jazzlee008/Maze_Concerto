const DEFAULT_BALL_SIZE = 10;
export const PhysicsEngine = (() => {
  const Vec2 = {
    rotate: (v, angle) => ({
      x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
      y: v.x * Math.sin(angle) + v.y * Math.cos(angle)
    }),
    normalize: v => {
      const len = Math.hypot(v.x, v.y);
      return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
    }
  };

  const transformMazePoint = (point, boundary) => {
    const rotated = Vec2.rotate(point, boundary.rotation);
    return { x: boundary.center.x + rotated.x, y: boundary.center.y + rotated.y };
  };

  const detectBoundaryCollision = (position, boundary, ballSize) => {
    const safetyMargin = ballSize * 0.2;
    const localPos = Vec2.rotate({
      x: position.x - boundary.center.x,
      y: position.y - boundary.center.y
    }, -boundary.rotation);

    let nearest = { collided: false };
    const halfSize = boundary.size / 2;
    const edges = [
      { a: { x: -halfSize, y: -halfSize }, b: { x: halfSize, y: -halfSize } },
      { a: { x: halfSize, y: -halfSize }, b: { x: halfSize, y: halfSize } },
      { a: { x: halfSize, y: halfSize }, b: { x: -halfSize, y: halfSize } },
      { a: { x: -halfSize, y: halfSize }, b: { x: -halfSize, y: -halfSize } }
    ];
    edges.forEach(edge => {
      const aToB = { x: edge.b.x - edge.a.x, y: edge.b.y - edge.a.y };
      const aToPoint = { x: localPos.x - edge.a.x, y: localPos.y - edge.a.y };
      const t = Math.max(0, Math.min(1, (aToPoint.x * aToB.x + aToPoint.y * aToB.y) / (aToB.x ** 2 + aToB.y ** 2)));
      const closest = { x: edge.a.x + t * aToB.x, y: edge.a.y + t * aToB.y };
      const dx = localPos.x - closest.x, dy = localPos.y - closest.y;
      const distance = Math.hypot(dx, dy);
      const penetration = ballSize - distance + safetyMargin;
      if (penetration > 0 && penetration > (nearest.penetration || 0)) {
        nearest = {
          collided: true,
          penetration,
          normal: Vec2.normalize({ x: dx, y: dy }),
          source: 'boundary'
        };
      }
    });
    return nearest;
  };

  const detectLineCollision = (position, a, b, ballSize) => {
    const safetyMargin = ballSize * 0.2;
    const aToB = { x: b.x - a.x, y: b.y - a.y };
    const aToPos = { x: position.x - a.x, y: position.y - a.y };
    const t = Math.max(0, Math.min(1, (aToPos.x * aToB.x + aToPos.y * aToB.y) / (aToB.x ** 2 + aToB.y ** 2)));
    const closest = { x: a.x + t * aToB.x, y: a.y + t * aToB.y };
    const dx = position.x - closest.x, dy = position.y - closest.y;
    const distance = Math.hypot(dx, dy);
    const penetration = ballSize - distance + safetyMargin;
    if (penetration > 0) {
      return {
        collided: true,
        penetration,
        normal: Vec2.normalize({ x: dx, y: dy })
      };
    }
    return { collided: false };
  };

  const update = (state, params, deltaTime) => {
    state.ball.velocity.y += params.gravity * deltaTime * 50;
    let newPos = {
      x: state.ball.position.x + state.ball.velocity.x * deltaTime,
      y: state.ball.position.y + state.ball.velocity.y * deltaTime
    };
    let collisionOccurred = false;
    for (let i = 0; i < 10; i++) {
      let collision = detectBoundaryCollision(newPos, state.boundary, DEFAULT_BALL_SIZE);
      if (collision.collided) collisionOccurred = true;
      if (state.maze) {
        state.maze.walls.forEach(wall => {
          const aGlobal = transformMazePoint(wall.a, state.boundary);
          const bGlobal = transformMazePoint(wall.b, state.boundary);
          const col = detectLineCollision(newPos, aGlobal, bGlobal, DEFAULT_BALL_SIZE);
          if (col.collided && col.penetration > (collision.penetration || 0)) {
            collision = col;
            collisionOccurred = true;
          }
        });
      }
      if (!collision.collided) break;
      let globalNormal = (collision.source === 'boundary')
        ? Vec2.rotate(collision.normal, state.boundary.rotation)
        : collision.normal;
      const vDot = state.ball.velocity.x * globalNormal.x + state.ball.velocity.y * globalNormal.y;
      if (vDot < 0) {
        const bounce = -(1 + Math.min(params.restitution, 0.98)) * vDot;
        state.ball.velocity.x += bounce * globalNormal.x;
        state.ball.velocity.y += bounce * globalNormal.y;
      }
      newPos.x += globalNormal.x * collision.penetration;
      newPos.y += globalNormal.y * collision.penetration;
    }
    state.ball.position = newPos;
    return collisionOccurred;
  };

  return { update };
})();
