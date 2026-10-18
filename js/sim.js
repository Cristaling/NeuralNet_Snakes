import { makeRng, randomSeed } from './rng.js';
import { Brain, weightCount, randomWeights } from './brain.js';
import { nextGeneration } from './evolution.js';

// Directions, clockwise from up, as in the 2017 code: 0 up, 1 right, 2 down, 3 left.
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

// Map cell values, as in 2017: 0 empty, 1 food, -1 wall or snake body.
export const EMPTY = 0;
export const FOOD = 1;
export const BLOCK = -1;

export function layerSizes(p) {
  const inputs = p.visionDepth * p.visionWidth + (p.foodSense ? 2 : 0);
  const outputs = p.outputMode === 'argmax' ? 3 : 1;
  const sizes = [inputs];
  for (let i = 0; i < p.hiddenLayers; i++) sizes.push(p.hiddenSize);
  sizes.push(outputs);
  return sizes;
}

export function outputActivation(activation, outputMode) {
  if (outputMode === 'argmax') return 'linear';
  return activation === 'sigmoid2017' ? 'sigmoid2017' : 'sigmoid';
}

export class Arena {
  constructor(N) {
    this.N = N;
    this.grid = new Int8Array(N * N);
    this.food = new Set();
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.N && y < this.N;
  }
  get(x, y) {
    return this.grid[y * this.N + x];
  }
  setIndex(i, v) {
    if (this.grid[i] === FOOD) this.food.delete(i);
    this.grid[i] = v;
    if (v === FOOD) this.food.add(i);
  }
  placeFood(count, rng) {
    const N = this.N;
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 60 + 100; tries++) {
      const i = Math.floor(rng() * N) + Math.floor(rng() * N) * N;
      if (this.grid[i] === EMPTY) {
        this.setIndex(i, FOOD);
        placed++;
      }
    }
    return placed;
  }
  clone() {
    const a = new Arena(this.N);
    a.grid.set(this.grid);
    a.food = new Set(this.food);
    return a;
  }
}

export class Snake {
  constructor(id, weights, arena, body, sim) {
    const { arch, p } = sim;
    this.id = id;
    this.weights = weights;
    this.arena = arena;
    this.body = body; // cell indices, tail first, head last
    this.dir = 2;
    this.dead = false;
    this.diedAt = 0;
    this.timeAlive = 0;
    this.cells = 0;
    this.eaten = 0;
    this.sinceFood = 0;
    this.lastTurn = 0;
    this.visited = new Uint8Array(arena.N * arena.N);
    this.vision = new Int8Array(arch.D * arch.W);
    this.input = new Float64Array(arch.sizes[0]);
    this.brain = new Brain(arch.sizes, weights, p.activation, outputActivation(p.activation, arch.outputMode));
    this.hue = (id * 137.508) % 360;
  }
  get head() {
    return this.body[this.body.length - 1];
  }
}

export class Simulation {
  constructor(params) {
    this.p = params; // shared with the UI, so live settings apply at once
    this.generation = 0;
    this.tick = 0;
    this.history = [];
    this.snakes = [];
    this.arenas = [];
    this.population = [];
    this.alive = 0;
    this.label = '';
    this.onGeneration = null;
  }

  setArchFromParams() {
    const p = this.p;
    this.arch = {
      sizes: layerSizes(p),
      D: p.visionDepth,
      W: p.visionWidth,
      foodSense: p.foodSense,
      outputMode: p.outputMode,
    };
    this.seedParam = String(p.seed);
  }

  // True when a setting that only applies to a new population differs from the running one.
  needsRestart() {
    if (!this.arch) return true;
    const a = this.arch;
    const s = layerSizes(this.p);
    return (
      s.join() !== a.sizes.join() ||
      this.p.visionDepth !== a.D ||
      this.p.visionWidth !== a.W ||
      this.p.foodSense !== a.foodSense ||
      this.p.outputMode !== a.outputMode ||
      String(this.p.seed) !== this.seedParam
    );
  }

  newRandomPopulation() {
    const seed = this.p.seed !== '' ? Number(this.p.seed) >>> 0 : randomSeed();
    this.seed = seed;
    this.rng = makeRng(seed);
    this.setArchFromParams();
    this.generation = 0;
    this.history = [];
    this.label = '';
    const n = weightCount(this.arch.sizes);
    const pop = Array.from({ length: this.p.populationSize }, () => randomWeights(n, this.rng, this.p.initRange));
    this.startGeneration(pop);
  }

  loadPopulation(pop, label) {
    this.setArchFromParams();
    const n = weightCount(this.arch.sizes);
    const bad = pop.find((w) => w.length !== n);
    if (bad) throw new Error(`These brains have ${bad.length.toLocaleString('en-US')} weights, but the current settings need ${n.toLocaleString('en-US')}.`);
    if (!this.rng) {
      this.seed = randomSeed();
      this.rng = makeRng(this.seed);
    }
    this.generation = 0;
    this.history = [];
    this.label = label || '';
    this.startGeneration(pop.map((w) => Float64Array.from(w)));
  }

  startGeneration(pop) {
    const p = this.p;
    const N = p.mapSize;
    const L = p.startLength;
    this.generation++;
    this.tick = 0;
    this.population = pop;
    this.snakes = [];
    this.arenas = [];
    if (p.sharedWorld) {
      const arena = new Arena(N);
      this.arenas.push(arena);
      pop.forEach((w, i) => this.addSnake(i, w, arena, this.findSpawn(arena, L), L));
      arena.placeFood(p.foodCount, this.rng);
    } else {
      // Every snake gets an identical copy: same food, same starting spot.
      const base = new Arena(N);
      const spot = this.findSpawn(base, L);
      for (let k = 0; k < L; k++) base.setIndex((spot.y - k) * N + spot.x, BLOCK);
      base.placeFood(p.foodCount, this.rng);
      for (let k = 0; k < L; k++) base.setIndex((spot.y - k) * N + spot.x, EMPTY);
      pop.forEach((w, i) => {
        const arena = base.clone();
        this.arenas.push(arena);
        this.addSnake(i, w, arena, spot, L);
      });
    }
    this.alive = this.snakes.length;
  }

  // A vertical snake with its head at the bottom, facing down, as the 2017 spawner made them.
  findSpawn(arena, L) {
    const N = arena.N;
    const m = Math.min(5, Math.floor(N / 4));
    const yMin = Math.max(m, L - 1);
    const ySpan = Math.max(1, N - m - yMin);
    for (let t = 0; t < 300; t++) {
      const x = m + Math.floor(this.rng() * (N - 2 * m));
      const y = yMin + Math.floor(this.rng() * ySpan);
      let ok = true;
      for (let k = 0; k < L && ok; k++) ok = arena.get(x, y - k) === EMPTY;
      if (ok) return { x, y };
    }
    return { x: Math.floor(N / 2), y: Math.min(N - 1, yMin) };
  }

  addSnake(id, weights, arena, spot, L) {
    const N = arena.N;
    const body = [];
    for (let k = L - 1; k >= 0; k--) {
      const i = (spot.y - k) * N + spot.x;
      body.push(i);
      arena.setIndex(i, BLOCK);
    }
    const s = new Snake(id, weights, arena, body, this);
    this.snakes.push(s);
    return s;
  }

  applyActivation() {
    for (const s of this.snakes) s.brain.setActivations(this.p.activation, outputActivation(this.p.activation, this.arch.outputMode));
  }

  // One tick. Returns true when it ended the generation instead.
  step() {
    if (this.tick >= this.p.generationTicks || this.alive === 0) {
      this.endGeneration();
      return true;
    }
    this.tick++;
    for (const s of this.snakes) if (!s.dead) this.moveSnake(s);
    return false;
  }

  // Fills the snake's inputs: the window in front of it, rotated to its heading,
  // farthest row first, left to right (the 2017 layout), then the optional compass.
  sense(s) {
    const { D, W, foodSense } = this.arch;
    const a = s.arena;
    const N = a.N;
    const hx = s.head % N;
    const hy = (s.head / N) | 0;
    const fx = DX[s.dir];
    const fy = DY[s.dir];
    const lx = fy; // the cell to the snake's left is head + (fy, -fx)
    const ly = -fx;
    const h = (W - 1) / 2;
    let k = 0;
    for (let r = 0; r < D; r++) {
      const ahead = D - 1 - r;
      for (let c = 0; c < W; c++) {
        const side = h - c; // positive = to the left
        const x = hx + ahead * fx + side * lx;
        const y = hy + ahead * fy + side * ly;
        const v = a.inside(x, y) ? a.grid[y * N + x] : BLOCK;
        s.vision[k] = v;
        s.input[k] = v;
        k++;
      }
    }
    if (foodSense) {
      let best = Infinity;
      let fwd = 0;
      let left = 0;
      for (const i of a.food) {
        const dx = (i % N) - hx;
        const dy = ((i / N) | 0) - hy;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < best) {
          best = d;
          fwd = (dx * fx + dy * fy) / d;
          left = (dx * lx + dy * ly) / d;
        }
      }
      s.input[k] = fwd;
      s.input[k + 1] = left;
    }
  }

  moveSnake(s) {
    const p = this.p;
    const a = s.arena;
    const N = a.N;
    s.timeAlive++;
    s.sinceFood++;
    this.sense(s);
    const out = s.brain.forward(s.input);
    let turn = 0;
    if (this.arch.outputMode === 'argmax') {
      turn = out[0] > out[1] && out[0] >= out[2] ? -1 : out[2] > out[1] && out[2] > out[0] ? 1 : 0;
    } else if (out[0] <= 0.33334) {
      turn = -1;
    } else if (out[0] >= 0.66665) {
      turn = 1;
    }
    s.lastTurn = turn;
    s.dir = (s.dir + turn + 4) % 4;
    const nx = (s.head % N) + DX[s.dir];
    const ny = ((s.head / N) | 0) + DY[s.dir];
    if (!a.inside(nx, ny) || a.get(nx, ny) === BLOCK) {
      this.kill(s);
      return;
    }
    const ni = ny * N + nx;
    const ate = a.grid[ni] === FOOD;
    if (ate) {
      s.eaten++;
      s.sinceFood = 0;
    } else {
      a.setIndex(s.body.shift(), EMPTY);
    }
    s.body.push(ni);
    a.setIndex(ni, BLOCK);
    if (ate && p.respawnFood) a.placeFood(1, this.rng);
    if (!s.visited[ni]) {
      s.visited[ni] = 1;
      s.cells++;
    }
    if (p.starveTicks > 0 && s.sinceFood >= p.starveTicks) this.kill(s);
  }

  kill(s) {
    s.dead = true;
    s.diedAt = this.tick;
    this.alive--;
    if (!this.p.corpsesBlock) for (const i of s.body) s.arena.setIndex(i, EMPTY);
  }

  score(s) {
    const p = this.p;
    return p.wEaten * s.eaten + p.wCells * s.cells + p.wTime * s.timeAlive;
  }

  compare(a, b) {
    if (this.p.fitnessMode === 'weighted') return this.score(b) - this.score(a);
    return b.body.length - a.body.length || b.cells - a.cells || b.timeAlive - a.timeAlive;
  }

  rank(list = this.snakes) {
    return [...list].sort((a, b) => this.compare(a, b));
  }

  endGeneration() {
    const ranked = this.rank();
    const n = ranked.length || 1;
    const stat = (f) => {
      let best = 0;
      let sum = 0;
      for (const s of ranked) {
        const v = f(s);
        if (v > best) best = v;
        sum += v;
      }
      return [best, sum / n];
    };
    const [bestEaten, avgEaten] = stat((s) => s.eaten);
    const [bestCells, avgCells] = stat((s) => s.cells);
    const [bestTime, avgTime] = stat((s) => s.timeAlive);
    this.history.push({ gen: this.generation, bestEaten, avgEaten, bestCells, avgCells, bestTime, avgTime });
    if (this.history.length > 20000) this.history.shift();
    const next = nextGeneration(ranked.map((s) => s.weights), this.p, this.rng, weightCount(this.arch.sizes));
    this.startGeneration(next);
    if (this.onGeneration) this.onGeneration(this);
  }
}
