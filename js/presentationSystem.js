import { PhysicsEngine } from "./physicsEngine.js";
import { MusicPlayer } from "./musicPlayer.js";
import { spawnFireworks, generateMaze } from "./presentationSystemHelper.js"; // 辅助函数另行拆分

const DEFAULT_SQUARE_SIZE = 300;
const DEFAULT_BALL_SIZE = 10;

export const PresentationSystem = (() => {
  let canvas, ctx;
  let state = {
    boundary: { center: { x: 0, y: 0 }, size: DEFAULT_SQUARE_SIZE, rotation: 0 },
    ball: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    maze: null,
    fireworks: [],
    gameState: "playing", // "playing" 或 "completed"
    startTime: null,      // 本局开始计时（毫秒）
    recorded: false       // 防止重复记录关卡数据
  };

  let params = {
    restitution: 0.7,
    rotationSpeed: 1.0,
    gravity: 9.8,
    mazeComplexity: 10
  };

  let lastTime = 0;
  let angularVelocity = 0;
  let isButtonPressed = false;

  // 单独创建音乐播放器实例
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const musicPlayer = new MusicPlayer(audioCtx);

  function init() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    setupControls();
    canvas.addEventListener("click", onCanvasClick);
    window.addEventListener("resize", setupBoundary);
    setupBoundary();
    restartLevel();
    requestAnimationFrame(update);
  }

  function setupControls() {
    document.getElementById("restitution").addEventListener("input", (e) => {
      params.restitution = Math.min(parseFloat(e.target.value), 0.98);
      document.getElementById("restitutionValue").textContent = params.restitution.toFixed(1);
    });
    document.getElementById("rotation").addEventListener("input", (e) => {
      params.rotationSpeed = Number(e.target.value);
      document.getElementById("rotationValue").textContent = params.rotationSpeed.toFixed(1);
      angularVelocity = isButtonPressed ? -params.rotationSpeed : params.rotationSpeed;
    });
    document.getElementById("gravity").addEventListener("input", (e) => {
      params.gravity = parseFloat(e.target.value);
      document.getElementById("gravityValue").textContent = params.gravity;
    });
    document.getElementById("mazeComplexity").addEventListener("input", (e) => {
      params.mazeComplexity = parseInt(e.target.value);
      document.getElementById("mazeComplexityValue").textContent = params.mazeComplexity;
      restartLevel();
    });
    const btn = document.getElementById("rotateBtn");
    btn.addEventListener("mousedown", () => {
      isButtonPressed = true;
      angularVelocity = -params.rotationSpeed;
      if (!state.startTime) {
        state.startTime = Date.now();
      }
    });
    btn.addEventListener("mouseup", () => {
      isButtonPressed = false;
      angularVelocity = params.rotationSpeed;
    });
    btn.addEventListener("mouseleave", () => {
      if (isButtonPressed) {
        isButtonPressed = false;
        angularVelocity = params.rotationSpeed;
      }
    });
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isButtonPressed = true;
      angularVelocity = -params.rotationSpeed;
      if (!state.startTime) {
        state.startTime = Date.now();
      }
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      isButtonPressed = false;
      angularVelocity = params.rotationSpeed;
    });
    document.getElementById("exportBtn").addEventListener("click", () => {
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const year = now.getFullYear();
      const month = ("0" + (now.getMonth() + 1)).slice(-2);
      const day = ("0" + now.getDate()).slice(-2);
      const hours = ("0" + now.getHours()).slice(-2);
      const minutes = ("0" + now.getMinutes()).slice(-2);
      a.download = `Maze_Concerto_${year}${month}${day}_${hours}${minutes}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById("importBtn").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const imported = JSON.parse(evt.target.result);
          const record = Array.isArray(imported)
            ? imported[imported.length - 1]
            : imported;
          loadImportedRecord(record);
        } catch (err) {
          alert("导入的文件格式不正确！");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  function setupBoundary() {
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    state.boundary.center = { x: canvas.width / 2, y: canvas.height / 2 };
  }

  function restartLevel() {
    const requiredSize = params.mazeComplexity * (2 * DEFAULT_BALL_SIZE + 10);
    const effectiveSize = Math.max(DEFAULT_SQUARE_SIZE, requiredSize);
    state.boundary.size = effectiveSize;
    state.maze = generateMaze(params.mazeComplexity, effectiveSize);
    state.ball.position = {
      x: state.boundary.center.x - effectiveSize / 2 + state.maze.cellSize / 2,
      y: state.boundary.center.y - effectiveSize / 2 + state.maze.cellSize / 2,
    };
    state.ball.velocity = { x: 0, y: 0 };
    state.boundary.rotation = 0;
    angularVelocity = 0;
    isButtonPressed = false;
    state.fireworks = [];
    state.gameState = "playing";
    state.startTime = null;
    state.recorded = false;
    document.getElementById("timerValue").textContent = "0.0";
  }

  function loadImportedRecord(record) {
    params.restitution = record.restitution;
    params.rotationSpeed = record.rotationSpeed;
    params.gravity = record.gravity;
    params.mazeComplexity = record.mazeComplexity;

    document.getElementById("restitution").value = record.restitution;
    document.getElementById("restitutionValue").textContent = record.restitution.toFixed(1);
    document.getElementById("rotation").value = record.rotationSpeed;
    document.getElementById("rotationValue").textContent = record.rotationSpeed.toFixed(1);
    document.getElementById("gravity").value = record.gravity;
    document.getElementById("gravityValue").textContent = record.gravity;
    document.getElementById("mazeComplexity").value = record.mazeComplexity;
    document.getElementById("mazeComplexityValue").textContent = record.mazeComplexity;

    state.boundary.size = record.boundarySize;
    const cellSize = state.boundary.size / record.mazeComplexity;
    state.maze = {
      rows: record.mazeComplexity,
      cols: record.mazeComplexity,
      cellSize: cellSize,
      walls: record.mazeWalls,
      endpoint: record.endpoint,
    };
    state.ball.position = {
      x: state.boundary.center.x - state.boundary.size / 2 + cellSize / 2,
      y: state.boundary.center.y - state.boundary.size / 2 + cellSize / 2,
    };
    state.ball.velocity = { x: 0, y: 0 };
    state.boundary.rotation = 0;
    angularVelocity = 0;
    isButtonPressed = false;
    state.fireworks = [];
    state.gameState = "playing";
    state.startTime = null;
    state.recorded = false;
    document.getElementById("timerValue").textContent = "0.0";
  }

  function onCanvasClick() {
    if (state.gameState === "completed") {
      restartLevel();
    }
  }

  function transformPoint(point) {
    const rotated = {
      x: point.x * Math.cos(state.boundary.rotation) - point.y * Math.sin(state.boundary.rotation),
      y: point.x * Math.sin(state.boundary.rotation) + point.y * Math.cos(state.boundary.rotation),
    };
    return {
      x: state.boundary.center.x + rotated.x,
      y: state.boundary.center.y + rotated.y,
    };
  }

  function update(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1) || 0;
    lastTime = timestamp;

    if (state.gameState === "playing") {
      state.boundary.rotation += angularVelocity * deltaTime;
      PhysicsEngine.update(state, params, deltaTime);

      if (state.startTime) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        document.getElementById("timerValue").textContent = elapsed.toFixed(1);
      }

      if (musicPlayer.originalBuffer) {
        const desiredType = angularVelocity >= 0 ? "forward" : "reverse";
        const desiredRate = 1.0;
        musicPlayer.update(desiredType, desiredRate);
      }

      const endGlobal = transformPoint(state.maze.endpoint);
      const dx = state.ball.position.x - endGlobal.x;
      const dy = state.ball.position.y - endGlobal.y;
      if (Math.hypot(dx, dy) < DEFAULT_BALL_SIZE) {
        state.gameState = "completed";
        state.fireworks = spawnFireworks(endGlobal);
        if (!state.recorded) {
          const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
          const record = {
            restitution: params.restitution,
            rotationSpeed: params.rotationSpeed,
            gravity: params.gravity,
            mazeComplexity: params.mazeComplexity,
            boundarySize: state.boundary.size,
            mazeWalls: state.maze.walls,
            endpoint: state.maze.endpoint,
            timeSpent: parseFloat(elapsed.toFixed(1)),
            completionDate: new Date().toISOString(),
          };
          records.push(record);
          state.recorded = true;
        }
      }
    } else if (state.gameState === "completed") {
      state.fireworks.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.lifetime--;
      });
      state.fireworks = state.fireworks.filter((p) => p.lifetime > 0);
      musicPlayer.update("forward", 1.0);
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoundary();
    if (state.maze) drawMaze();
    drawBall();
    if (state.gameState === "completed") drawFireworks();
  }

  function drawBoundary() {
    ctx.save();
    ctx.translate(state.boundary.center.x, state.boundary.center.y);
    ctx.rotate(state.boundary.rotation);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.strokeRect(
      -state.boundary.size / 2,
      -state.boundary.size / 2,
      state.boundary.size,
      state.boundary.size
    );
    ctx.restore();
  }

  function drawMaze() {
    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    state.maze.walls.forEach((wall) => {
      const aGlobal = transformPoint(wall.a);
      const bGlobal = transformPoint(wall.b);
      ctx.beginPath();
      ctx.moveTo(aGlobal.x, aGlobal.y);
      ctx.lineTo(bGlobal.x, bGlobal.y);
      ctx.stroke();
    });
    const endGlobal = transformPoint(state.maze.endpoint);
    ctx.beginPath();
    ctx.arc(endGlobal.x, endGlobal.y, DEFAULT_BALL_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = "green";
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(state.ball.position.x, state.ball.position.y, DEFAULT_BALL_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }

  function drawFireworks() {
    state.fireworks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
  }

  return { init };
})();
