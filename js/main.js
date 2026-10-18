import { Simulation } from './sim.js';
import { PARAMS, PRESETS, defaults, sanitize } from './params.js';
import { buildParamForm } from './ui-params.js';
import { drawBoard, drawVision, drawChart, readTheme, snakeColor, BrainView } from './render.js';
import { LEGACY_PARAMS, fetchLegacyGeneration } from './legacy.js';

const STORE = 'neural-snakes:params:v1';
const $ = (id) => document.getElementById(id);

function loadParams() {
  const v = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && typeof saved === 'object') for (const p of PARAMS) if (p.key in saved) v[p.key] = sanitize(p, saved[p.key]);
  } catch {
    /* storage unavailable: use defaults */
  }
  return v;
}
function saveParams() {
  try {
    localStorage.setItem(STORE, JSON.stringify(params));
  } catch {
    /* ignore */
  }
}

const params = loadParams();
const sim = new Simulation(params);
sim.newRandomPopulation();
// For tinkering from the browser console.
window.neuralSnakes = { sim, params };

let theme = readTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  theme = readTheme();
  needsChart = true;
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = !reducedMotion;
let tps = 20;
let maxSpeed = false;
let followId = null; // null = follow the leader
let chartMetric = 'eaten';
let needsChart = true;
let frame = 0;

const board = $('board');
const vision = $('vision');
const chart = $('chart');
const brainView = new BrainView($('brain-view'), $('brain-sum'));

// ---------- parameters ----------
const RESTART_KEYS = new Set(PARAMS.filter((p) => p.applies === 'restart').map((p) => p.key));
const form = buildParamForm($('param-groups'), params, (p) => {
  saveParams();
  if (p.key === 'activation') sim.applyActivation();
  if (p.key === 'fitnessMode') updateRankLabel();
  form.refresh();
  updateRestartBanner();
});

function updateRestartBanner() {
  const pending = new Set();
  if (sim.needsRestart()) {
    const a = sim.arch;
    if (params.visionDepth !== a.D) pending.add('visionDepth');
    if (params.visionWidth !== a.W) pending.add('visionWidth');
    if (params.foodSense !== a.foodSense) pending.add('foodSense');
    if (params.outputMode !== a.outputMode) pending.add('outputMode');
    if (String(params.seed) !== sim.seedParam) pending.add('seed');
    const hidden = a.sizes.length - 2;
    if (params.hiddenLayers !== hidden) pending.add('hiddenLayers');
    if (hidden > 0 && params.hiddenLayers > 0 && params.hiddenSize !== a.sizes[1]) pending.add('hiddenSize');
  }
  $('restart-banner').hidden = pending.size === 0;
  form.markPending(pending);
}

function updateRankLabel() {
  $('rank-mode').textContent = params.fitnessMode === 'weighted' ? 'by weighted score' : 'by length, cells, time';
}

const presetsEl = $('presets');
presetsEl.innerHTML = '<span class="lbl">Presets</span>';
for (const pr of PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn small';
  b.textContent = pr.label;
  b.title = pr.help;
  b.addEventListener('click', () => {
    Object.assign(params, pr.values);
    form.setAll(params);
    saveParams();
    restart(`Started a new population with the “${pr.label}” preset.`);
  });
  presetsEl.appendChild(b);
}

function restart(message) {
  sim.newRandomPopulation();
  followId = null;
  needsChart = true;
  updateRestartBanner();
  updateRankLabel();
  setRunLabel(message || '');
}

function setRunLabel(extra) {
  const what = sim.label ? `${sim.label}, continued` : `seed ${sim.seed}`;
  $('run-label').textContent = [extra, `Run: ${what}.`].filter(Boolean).join(' ');
}

// ---------- controls ----------
const runBtn = $('btn-run');
function setRunning(on) {
  running = on;
  runBtn.textContent = on ? 'Pause' : 'Start';
}
runBtn.addEventListener('click', () => setRunning(!running));
$('btn-step').addEventListener('click', () => {
  setRunning(false);
  advance(1);
});
$('btn-endgen').addEventListener('click', () => sim.endGeneration());
$('btn-new').addEventListener('click', () => restart('Started a new random population.'));
$('btn-restart').addEventListener('click', () => restart('Started a new population with the new settings.'));
$('btn-auto').addEventListener('click', () => {
  followId = null;
});

const speed = $('speed');
speed.addEventListener('input', () => {
  tps = Number(speed.value);
  $('speed-out').textContent = tps;
});
$('speed-max').addEventListener('change', (e) => {
  maxSpeed = e.target.checked;
  speed.disabled = maxSpeed;
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.target.closest('input, select, textarea, button')) return;
  e.preventDefault();
  setRunning(!running);
});

for (const b of $('chart-metric').querySelectorAll('button')) {
  b.addEventListener('click', () => {
    chartMetric = b.dataset.m;
    for (const o of $('chart-metric').querySelectorAll('button')) o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    needsChart = true;
  });
}

board.addEventListener('click', (e) => {
  const arena = currentArena();
  if (!arena) return;
  const r = board.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * arena.N);
  const y = Math.floor(((e.clientY - r.top) / r.height) * arena.N);
  let hit = null;
  let bestD = 4;
  for (const s of sim.snakes) {
    if (s.arena !== arena) continue;
    for (const i of s.body) {
      const d = Math.abs((i % arena.N) - x) + Math.abs(((i / arena.N) | 0) - y);
      if (d < bestD || (d === bestD && hit && hit.dead && !s.dead)) {
        bestD = d;
        hit = s;
      }
    }
  }
  if (hit) followId = hit.id;
});

$('leaders').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (b) followId = Number(b.dataset.id);
});

sim.onGeneration = () => {
  needsChart = true;
  if (followId !== null) followId = null;
};

// ---------- following ----------
function leader() {
  const alive = sim.snakes.filter((s) => !s.dead);
  return sim.rank(alive.length ? alive : sim.snakes)[0] || null;
}
function followed() {
  if (followId !== null) {
    const s = sim.snakes.find((x) => x.id === followId);
    if (s) return s;
    followId = null;
  }
  return leader();
}
function currentArena() {
  return params.sharedWorld || !followed() ? sim.arenas[0] : followed().arena;
}

// ---------- save and load ----------
const status = $('save-status');
function say(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('err', isError);
}

function toBase64(f64) {
  const bytes = new Uint8Array(f64.buffer, f64.byteOffset, f64.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Float64Array(bytes.buffer);
}

$('btn-export').addEventListener('click', () => {
  const data = {
    format: 'neural-snakes',
    version: 1,
    savedAt: new Date().toISOString(),
    generation: sim.generation,
    params: { ...params },
    sizes: sim.arch.sizes,
    dtype: 'float64-le-base64',
    population: sim.population.map(toBase64),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neural-snakes-gen${sim.generation}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  say(`Downloaded ${sim.population.length} brains from generation ${sim.generation} (${(blob.size / 1e6).toFixed(1)} MB).`);
});

$('file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.format !== 'neural-snakes' || !Array.isArray(data.population) || !data.params) throw new Error('This is not a Neural Snakes population file.');
    for (const p of PARAMS) if (p.key in data.params) params[p.key] = sanitize(p, data.params[p.key]);
    params.populationSize = sanitize(PARAMS.find((p) => p.key === 'populationSize'), data.population.length);
    const pop = data.population.map(fromBase64);
    sim.loadPopulation(pop, `${file.name}, generation ${data.generation}`);
    form.setAll(params);
    saveParams();
    afterLoad(`Loaded ${pop.length} brains from ${file.name}.`);
  } catch (err) {
    say(`Could not load ${file.name}: ${err.message}`, true);
  }
});

const legacyBtn = $('btn-legacy');
legacyBtn.addEventListener('click', async () => {
  const gen = $('legacy-gen').value;
  legacyBtn.disabled = true;
  try {
    const pop = await fetchLegacyGeneration(gen, 40, (i, n) => say(`Loading 2017 ${gen}: snake ${i} of ${n}…`));
    Object.assign(params, LEGACY_PARAMS);
    sim.loadPopulation(pop, `the 2017 snakes from ${gen.replace('Gen', 'generation ')}`);
    form.setAll(params);
    saveParams();
    afterLoad(`Loaded the 40 snakes the 2017 program saved at ${gen.replace('Gen', 'generation ')}. Settings switched to match them.`);
  } catch (err) {
    say(`${err.message} The 2017 files load from the repository, so this works on the published site or a local web server, not from a file opened directly.`, true);
  } finally {
    legacyBtn.disabled = false;
  }
});

function afterLoad(message) {
  followId = null;
  needsChart = true;
  updateRestartBanner();
  updateRankLabel();
  setRunLabel('');
  say(message);
}

// ---------- drawing ----------
function renderFollow(s) {
  const named = followId !== null;
  $('fl-name').textContent = s ? (named ? `snake #${s.id + 1}` : `the leader, #${s.id + 1}`) : 'nobody';
  $('btn-auto').hidden = !named;
  drawVision(vision, s, sim.arch, theme);
  if (!s) return;
  const rank = sim.rank().indexOf(s) + 1;
  const turn = s.lastTurn < 0 ? ['Left', 'turn-l'] : s.lastTurn > 0 ? ['Right', 'turn-r'] : ['Straight', 'turn-s'];
  const rows = [
    ['Rank', `${rank} of ${sim.snakes.length}`],
    ['Status', s.dead ? `died at tick ${s.diedAt}` : 'alive'],
    ['Length', s.body.length],
    ['Food eaten', s.eaten],
    ['Cells visited', s.cells],
    ['Ticks alive', s.timeAlive],
  ];
  if (params.fitnessMode === 'weighted') rows.push(['Score', Math.round(sim.score(s)).toLocaleString('en-US')]);
  let html = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  if (!s.dead) html += `<dt>Decision</dt><dd class="${turn[1]}">${turn[0]}</dd>`;
  $('fl-stats').innerHTML = html;
}

function renderLeaders(current) {
  const top = sim.rank().slice(0, 6);
  $('leaders').innerHTML = top
    .map((s, i) => {
      const nums = params.fitnessMode === 'weighted' ? `${Math.round(sim.score(s))} pts` : `${s.eaten} food · ${s.cells} cells`;
      return `<li><button type="button" data-id="${s.id}" class="${s === current ? 'on' : ''}"><span class="rk">${i + 1}</span><span class="${s.dead ? 'dead' : ''}"><span class="sw" style="background:${snakeColor(s, theme)}"></span>#${s.id + 1}${s.dead ? ' · dead' : ''}</span><span class="nums">${nums}</span></button></li>`;
    })
    .join('');
}

function renderStatus() {
  $('st-gen').textContent = sim.generation.toLocaleString('en-US');
  $('st-tick').textContent = sim.tick;
  $('st-ticks').textContent = params.generationTicks;
  $('st-alive').textContent = sim.alive;
  $('st-pop').textContent = sim.snakes.length;
}

// ---------- loop ----------
let last = performance.now();
let acc = 0;
let rateTicks = 0;
let rateStart = last;

function advance(n) {
  for (let i = 0; i < n; i++) sim.step();
  rateTicks += n;
}

function loop(now) {
  const dt = Math.min(100, now - last);
  last = now;
  if (running) {
    if (maxSpeed) {
      const end = performance.now() + 14;
      let n = 0;
      do {
        sim.step();
        n++;
      } while (performance.now() < end);
      rateTicks += n;
    } else {
      acc += (dt * tps) / 1000;
      const n = Math.min(60, Math.floor(acc));
      acc -= n;
      advance(n);
    }
  }
  if (now - rateStart > 1000) {
    $('st-rate').textContent = running ? `${Math.round((rateTicks * 1000) / (now - rateStart)).toLocaleString('en-US')} ticks/s` : 'paused';
    rateTicks = 0;
    rateStart = now;
  }
  const s = followed();
  drawBoard(board, sim, s, theme);
  brainView.set(s, theme);
  brainView.update(theme, sim.arch.outputMode);
  if (frame % 4 === 0) {
    renderFollow(s);
    renderLeaders(s);
    renderStatus();
  }
  if (needsChart) {
    drawChart(chart, sim.history, chartMetric, theme);
    needsChart = false;
  }
  frame++;
  requestAnimationFrame(loop);
}

new ResizeObserver(() => {
  needsChart = true;
}).observe(chart);

setRunning(running);
updateRestartBanner();
updateRankLabel();
setRunLabel(reducedMotion ? 'Paused because your system asks for reduced motion. Press Start.' : '');
requestAnimationFrame(loop);
