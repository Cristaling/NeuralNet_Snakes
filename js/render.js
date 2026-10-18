import { DX, DY, BLOCK, FOOD } from './sim.js';
import { layerOffset } from './brain.js';

function hexToRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const t = {
    board: v('--board'),
    gridline: v('--gridline'),
    food: v('--food'),
    corpse: v('--corpse'),
    cell: v('--cell'),
    accent: v('--accent'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    rule: v('--rule'),
    surface: v('--surface'),
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
  };
  t.rgb = { surface: hexToRgb(v('--surface')), pos: hexToRgb(v('--pos')), neg: hexToRgb(v('--neg')) };
  return t;
}

export function snakeColor(s, theme) {
  return `hsl(${s.hue.toFixed(0)} 45% ${theme.dark ? 58 : 44}%)`;
}

// v in [-1, 1] → RGB between blue (negative), the surface colour (zero) and amber (positive).
function diverge(rgb, v) {
  const t = Math.min(1, Math.abs(v)) ** 0.8;
  const c = v >= 0 ? rgb.pos : rgb.neg;
  const s = rgb.surface;
  return [s[0] + (c[0] - s[0]) * t, s[1] + (c[1] - s[1]) * t, s[2] + (c[2] - s[2]) * t];
}

// Sizes the board canvas to a whole number of device pixels per cell.
export function fitBoard(canvas, N) {
  const dpr = window.devicePixelRatio || 1;
  const css = canvas.clientWidth || 600;
  const cp = Math.max(1, Math.floor((css * dpr) / N));
  if (canvas.width !== cp * N) {
    canvas.width = cp * N;
    canvas.height = cp * N;
  }
}

export function drawBoard(canvas, sim, follow, theme) {
  const arena = follow ? follow.arena : sim.arenas[0];
  if (!arena) return;
  const N = arena.N;
  fitBoard(canvas, N);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const cp = W / N;
  ctx.fillStyle = theme.board;
  ctx.fillRect(0, 0, W, W);
  if (cp >= 7) {
    ctx.strokeStyle = theme.gridline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < N; i++) {
      const p = Math.round(i * cp) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, W);
      ctx.moveTo(0, p);
      ctx.lineTo(W, p);
    }
    ctx.stroke();
  }
  const inset = cp >= 6 ? 1 : 0;
  const g = arena.grid;
  ctx.fillStyle = theme.corpse;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === BLOCK) ctx.fillRect((i % N) * cp + inset, ((i / N) | 0) * cp + inset, cp - 2 * inset, cp - 2 * inset);
  }
  ctx.fillStyle = theme.food;
  for (const i of arena.food) {
    const x = i % N;
    const y = (i / N) | 0;
    if (cp >= 5) {
      ctx.beginPath();
      ctx.arc((x + 0.5) * cp, (y + 0.5) * cp, cp * 0.36, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x * cp, y * cp, cp, cp);
    }
  }
  for (const s of sim.snakes) {
    if (s.dead || s.arena !== arena || s === follow) continue;
    paintSnake(ctx, s, N, cp, inset, snakeColor(s, theme), theme);
  }
  if (follow) {
    paintSnake(ctx, follow, N, cp, inset, follow.dead ? theme.ink3 : theme.accent, theme);
    if (!follow.dead) drawVisionFrame(ctx, follow, sim.arch, N, cp, theme);
  }
}

function paintSnake(ctx, s, N, cp, inset, color, theme) {
  ctx.fillStyle = color;
  for (const i of s.body) ctx.fillRect((i % N) * cp + inset, ((i / N) | 0) * cp + inset, cp - 2 * inset, cp - 2 * inset);
  if (cp >= 5) {
    const h = s.head;
    const cx = ((h % N) + 0.5 + DX[s.dir] * 0.2) * cp;
    const cy = (((h / N) | 0) + 0.5 + DY[s.dir] * 0.2) * cp;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, cp * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Outlines the cells the followed snake can see.
function drawVisionFrame(ctx, s, arch, N, cp, theme) {
  const hx = s.head % N;
  const hy = (s.head / N) | 0;
  const fx = DX[s.dir];
  const fy = DY[s.dir];
  const lx = fy;
  const ly = -fx;
  const h = (arch.W - 1) / 2;
  const xs = [];
  const ys = [];
  for (const ahead of [0, arch.D - 1]) {
    for (const side of [-h, h]) {
      xs.push(hx + ahead * fx + side * lx);
      ys.push(hy + ahead * fy + side * ly);
    }
  }
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs) + 1;
  const y1 = Math.max(...ys) + 1;
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = Math.max(1.5, cp * 0.12);
  ctx.setLineDash([Math.max(3, cp * 0.4), Math.max(2, cp * 0.25)]);
  ctx.strokeRect(x0 * cp, y0 * cp, (x1 - x0) * cp, (y1 - y0) * cp);
  ctx.restore();
}

export function drawVision(canvas, s, arch, theme) {
  const dpr = window.devicePixelRatio || 1;
  const c = Math.round(Math.min(26, 130 / arch.W) * dpr);
  const w = arch.W * c;
  const h = arch.D * c;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w / dpr}px`;
  }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = theme.board;
  ctx.fillRect(0, 0, w, h);
  if (!s) return;
  const gap = Math.max(1, Math.round(dpr));
  for (let r = 0; r < arch.D; r++) {
    for (let col = 0; col < arch.W; col++) {
      const v = s.vision[r * arch.W + col];
      ctx.fillStyle = v === BLOCK ? theme.corpse : v === FOOD ? theme.food : theme.cell;
      ctx.fillRect(col * c + gap, r * c + gap, c - 2 * gap, c - 2 * gap);
    }
  }
  // The head is the middle cell of the last row.
  const hx = ((arch.W - 1) / 2) * c;
  const hy = (arch.D - 1) * c;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(hx + gap, hy + gap, c - 2 * gap, c - 2 * gap);
  if (arch.foodSense) {
    const n = s.input.length;
    const fwd = s.input[n - 2];
    const left = s.input[n - 1];
    if (fwd || left) {
      const cx = hx + c / 2;
      const cy = hy + c / 2;
      const len = c * 1.6;
      ctx.strokeStyle = theme.food;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - left * len, cy - fwd * len);
      ctx.stroke();
    }
  }
}

// The brain panel: activation strips and weight heatmaps, rebuilt when the network shape changes.
export class BrainView {
  constructor(root, summary) {
    this.root = root;
    this.summary = summary;
    this.key = '';
    this.weights = null;
    this.themeKey = '';
  }

  set(s, theme) {
    if (!s) return;
    const sizes = s.brain.sizes;
    const key = sizes.join('-');
    if (key !== this.key) this.build(sizes);
    const tk = theme.dark ? 'd' : 'l';
    if (s.weights !== this.weights || tk !== this.themeKey) {
      this.paintWeights(s, theme);
      this.weights = s.weights;
      this.themeKey = tk;
    }
    this.snake = s;
  }

  // One block per layer, laid out like y = f(W·x): the layer's inputs x run along the top
  // (one cell per matrix column, the last one is the constant 1 for the bias), the weight
  // matrix W sits below, and the outputs y run down its right side (one cell per row).
  build(sizes) {
    this.key = sizes.join('-');
    this.root.textContent = '';
    const maxN = Math.max(...sizes.map((n, i) => (i < sizes.length - 1 ? n + 1 : n)));
    this.scale = Math.max(2, Math.min(14, Math.floor(360 / maxN)));
    const s = this.scale;
    const STRIP = 12;
    this.blocks = [];
    this.heats = [];
    const L = sizes.length - 1;
    let total = 0;
    const strip = (w, h, cssW, cssH, label) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      c.setAttribute('aria-label', label);
      return c;
    };
    for (let l = 1; l <= L; l++) {
      const nin = sizes[l - 1] + 1;
      const nout = sizes[l];
      total += nin * nout;
      const inName = l === 1 ? 'inputs' : `hidden ${l - 1}`;
      const outName = l === L ? 'output' : `hidden ${l}`;
      const block = document.createElement('div');
      block.className = `wblock${l === L ? ' out' : ''}`;
      const head = document.createElement('div');
      head.className = 'wb-head';
      head.innerHTML = `<span class="bl">Layer ${l}</span><span class="bs">${inName} → ${outName} · ${nout} × ${nin} = ${(nin * nout).toLocaleString('en-US')} weights</span>`;
      const x = strip(nin, 1, nin * s, STRIP, `Values entering layer ${l}`);
      x.className = 'wb-x';
      const rowsH = Math.max(nout * s, STRIP);
      const heat = strip(nin, nout, nin * s, rowsH, `Layer ${l} weight matrix, ${nout} rows by ${nin} columns`);
      heat.className = 'wb-w';
      const y = strip(1, nout, STRIP, rowsH, `Values leaving layer ${l}`);
      y.className = 'wb-y';
      block.append(head, x, heat, y);
      if (l === L) {
        const d = document.createElement('span');
        d.className = 'bd';
        block.appendChild(d);
        this.decision = d;
      }
      this.root.appendChild(block);
      this.blocks.push({ x, y, l });
      this.heats.push(heat);
    }
    this.total = total;
  }

  paintWeights(s, theme) {
    const sizes = s.brain.sizes;
    this.heats.forEach((canvas, i) => {
      const l = i + 1;
      const nin = sizes[l - 1] + 1;
      const nout = sizes[l];
      const off = layerOffset(sizes, l);
      const w = s.weights;
      let sum = 0;
      for (let k = 0; k < nin * nout; k++) sum += Math.abs(w[off + k]);
      const scale = (sum / (nin * nout)) * 2.5 || 1;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(nin, nout);
      for (let k = 0; k < nin * nout; k++) {
        const [r, g, b] = diverge(theme.rgb, w[off + k] / scale);
        img.data[k * 4] = r;
        img.data[k * 4 + 1] = g;
        img.data[k * 4 + 2] = b;
        img.data[k * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    this.summary.textContent = `${(sizes.length - 1)} weight matrices · ${this.total.toLocaleString('en-US')} weights · ${sizes.join(' → ')}`;
  }

  update(theme, outputMode) {
    const s = this.snake;
    if (!s) return;
    const acts = s.brain.acts;
    const last = acts.length - 1;
    const paint = (canvas, values, scale, horizontal) => {
      const n = values.length;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(horizontal ? n : 1, horizontal ? 1 : n);
      for (let k = 0; k < n; k++) {
        const [r, g, b] = diverge(theme.rgb, values[k] / scale);
        img.data[k * 4] = r;
        img.data[k * 4 + 1] = g;
        img.data[k * 4 + 2] = b;
        img.data[k * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    for (const { x, y, l } of this.blocks) {
      const inp = acts[l - 1];
      const withBias = new Float64Array(inp.length + 1);
      withBias.set(inp);
      withBias[inp.length] = 1;
      paint(x, withBias, 1, true);
      let scale = 1;
      if (l === last && s.brain.outputName === 'linear') {
        scale = 0;
        for (const v of acts[l]) scale = Math.max(scale, Math.abs(v));
        scale = scale || 1;
      }
      paint(y, acts[l], scale, false);
    }
    const out = acts[last];
    const word = s.lastTurn < 0 ? 'left' : s.lastTurn > 0 ? 'right' : 'straight';
    this.decision.textContent = outputMode === 'argmax' ? `→ ${word}` : `${out[0].toFixed(2)} → ${word}`;
  }
}

const METRICS = {
  eaten: ['bestEaten', 'avgEaten', 'food eaten'],
  cells: ['bestCells', 'avgCells', 'cells visited'],
  time: ['bestTime', 'avgTime', 'ticks alive'],
};

export function drawChart(canvas, history, metric, theme) {
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.ink3;
  if (history.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillText('Fills in after the first generation.', cw / 2, ch / 2);
    return;
  }
  const [kb, ka, unit] = METRICS[metric];
  const pl = 34;
  const pr = 8;
  const pt = 10;
  const pb = 20;
  const w = cw - pl - pr;
  const h = ch - pt - pb;
  let max = 0;
  for (const r of history) max = Math.max(max, r[kb]);
  max = niceMax(max);
  const n = history.length;
  const x = (i) => pl + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => pt + h - (v / max) * h;
  ctx.strokeStyle = theme.rule;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  for (const f of [0, 0.5, 1]) {
    const yy = Math.round(y(max * f)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pl, yy);
    ctx.lineTo(cw - pr, yy);
    ctx.stroke();
    ctx.fillText(fmtAxis(max * f), pl - 6, yy + 3);
  }
  ctx.textAlign = 'left';
  ctx.fillText(`gen ${history[0].gen}`, pl, ch - 5);
  ctx.textAlign = 'right';
  ctx.fillText(`gen ${history[n - 1].gen} · ${unit}`, cw - pr, ch - 5);
  const stride = Math.max(1, Math.floor(n / w));
  const line = (key, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i += stride) {
      const px = x(i);
      const py = y(history[i][key]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    const lastY = y(history[n - 1][key]);
    ctx.lineTo(x(n - 1), lastY);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x(n - 1), lastY, width + 1, 0, Math.PI * 2);
    ctx.fill();
  };
  line(ka, theme.ink3, 1.5);
  line(kb, theme.accent, 2);
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function fmtAxis(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : Number.isInteger(v) ? String(v) : v.toFixed(1);
}
