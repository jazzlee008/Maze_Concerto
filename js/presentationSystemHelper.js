export function generateMaze(complexity, mazeSize) {
  const rows = complexity, cols = complexity;
  const cellSize = mazeSize / complexity;
  const grid = [];
  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      grid[i][j] = { row: i, col: j, walls: { top: true, right: true, bottom: true, left: true }, visited: false };
    }
  }
  const stack = [];
  const startCell = grid[0][0];
  startCell.visited = true;
  stack.push(startCell);
  const getNeighbors = (cell) => {
    const neighbors = [];
    const { row, col } = cell;
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (col < cols - 1) neighbors.push(grid[row][col + 1]);
    if (row < rows - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    return neighbors.filter(n => !n.visited);
  };
  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = getNeighbors(current);
    if (neighbors.length) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (next.row < current.row) { current.walls.top = false; next.walls.bottom = false; }
      else if (next.row > current.row) { current.walls.bottom = false; next.walls.top = false; }
      else if (next.col > current.col) { current.walls.right = false; next.walls.left = false; }
      else if (next.col < current.col) { current.walls.left = false; next.walls.right = false; }
      next.visited = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  const walls = [];
  const offset = { x: -mazeSize / 2, y: -mazeSize / 2 };
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = grid[i][j];
      const x = offset.x + j * cellSize;
      const y = offset.y + i * cellSize;
      if (cell.walls.right) { walls.push({ a: { x: x + cellSize, y: y }, b: { x: x + cellSize, y: y + cellSize } }); }
      if (cell.walls.bottom) { walls.push({ a: { x: x, y: y + cellSize }, b: { x: x + cellSize, y: y + cellSize } }); }
      if (i === 0 && cell.walls.top) { walls.push({ a: { x: x, y: y }, b: { x: x + cellSize, y: y } }); }
      if (j === 0 && cell.walls.left) { walls.push({ a: { x: x, y: y }, b: { x: x, y: y + cellSize } }); }
    }
  }
  let endRow, endCol;
  do {
    endRow = Math.floor(Math.random() * rows);
    endCol = Math.floor(Math.random() * cols);
  } while (endRow === 0 && endCol === 0);
  const endpoint = { 
    x: offset.x + endCol * cellSize + cellSize / 2, 
    y: offset.y + endRow * cellSize + cellSize / 2 
  };
  return { rows, cols, cellSize, walls, endpoint };
}

export function spawnFireworks(position) {
  const particles = [];
  const count = 100;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 2;
    particles.push({
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: Math.random() * 60 + 60,
      color: `hsl(${Math.floor(Math.random() * 360)},100%,50%)`
    });
  }
  return particles;
}
