// Headless smoke test for the simulation core: `npm test` (Node 18+).
import { readFileSync, existsSync } from 'node:fs';
import { Simulation } from '../js/sim.js';
import { PRESETS, defaults } from '../js/params.js';
import { LEGACY_PARAMS, LEGACY_DIR, parseLegacy } from '../js/legacy.js';

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed = true;
};
const finite = (sim) => sim.history.every((h) => Object.values(h).every(Number.isFinite));

function runGenerations(params, gens) {
  const sim = new Simulation(params);
  sim.newRandomPopulation();
  while (sim.generation <= gens) sim.step();
  return sim;
}

// 1. The 2017 defaults run without errors.
{
  const sim = runGenerations({ ...defaults(), seed: '7' }, 3);
  check(sim.history.length === 3 && finite(sim), `2017 defaults: 3 generations, best cells ${sim.history.map((h) => h.bestCells).join(', ')}`);
}

// 2. The quick preset improves: compare the first and last 5 generations.
{
  const quick = PRESETS.find((p) => p.id === 'quick').values;
  const t0 = Date.now();
  const sim = runGenerations({ ...quick, seed: '42' }, 60);
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const early = avg(sim.history.slice(0, 5).map((h) => h.bestEaten));
  const late = avg(sim.history.slice(-5).map((h) => h.bestEaten));
  check(finite(sim), 'quick preset: all statistics are finite');
  check(late > early * 1.5 && late >= 5, `quick preset learns: best food eaten ${early.toFixed(1)} → ${late.toFixed(1)} over 60 generations (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// 3. The same seed gives the same run.
{
  const quick = PRESETS.find((p) => p.id === 'quick').values;
  const a = runGenerations({ ...quick, seed: '5' }, 4).history.map((h) => h.bestEaten).join();
  const b = runGenerations({ ...quick, seed: '5' }, 4).history.map((h) => h.bestEaten).join();
  check(a === b, `same seed, same result (${a})`);
}

// 4. The 2017 saved snakes load and beat random brains in their own setting.
{
  const dir = `${LEGACY_DIR}/Gen2000`;
  if (!existsSync(dir)) {
    check(false, `missing ${dir}`);
  } else {
    const pop = Array.from({ length: 40 }, (_, i) => parseLegacy(readFileSync(`${dir}/Snake${i + 1}.txt`, 'utf8')));
    const params = { ...defaults(), ...LEGACY_PARAMS, seed: '11' };
    const trial = (load) => {
      let cells = 0;
      let eaten = 0;
      for (let r = 0; r < 5; r++) {
        const sim = new Simulation({ ...params, seed: String(11 + r) });
        sim.newRandomPopulation();
        if (load) sim.loadPopulation(pop, '2017');
        while (sim.generation < 2) sim.step();
        cells += sim.history[0].avgCells;
        eaten += sim.history[0].avgEaten;
      }
      return { cells: cells / 5, eaten: eaten / 5 };
    };
    const legacy = trial(true);
    const random = trial(false);
    check(legacy.cells > random.cells * 1.5, `2017 Gen2000 vs random brains: avg cells visited ${legacy.cells.toFixed(1)} vs ${random.cells.toFixed(1)}, avg food ${legacy.eaten.toFixed(2)} vs ${random.eaten.toFixed(2)}`);
  }
}

process.exit(failed ? 1 : 0);
