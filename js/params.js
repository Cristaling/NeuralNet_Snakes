// Every tunable setting. `applies` says when a change takes effect:
//   now      immediately
//   gen      from the next generation
//   restart  only for a new population (it changes the shape of the brain, or the seed)

export const GROUPS = [
  { id: 'world', title: 'World' },
  { id: 'snake', title: 'Snake' },
  { id: 'brain', title: 'Brain' },
  { id: 'evolution', title: 'Evolution' },
  { id: 'fitness', title: 'Ranking' },
];

export const APPLIES = { now: 'Live', gen: 'Next generation', restart: 'New population' };

const weighted = (v) => v.fitnessMode === 'weighted';

export const PARAMS = [
  { group: 'world', key: 'mapSize', label: 'Map size', type: 'int', min: 20, max: 160, step: 1, def: 80, unit: 'cells', applies: 'gen', help: 'Width and height of the square map.' },
  { group: 'world', key: 'foodCount', label: 'Food per generation', type: 'int', min: 0, max: 1000, step: 5, def: 200, applies: 'gen', help: 'Placed at the start of each generation. The 2017 slider went from 0 to 600.' },
  { group: 'world', key: 'respawnFood', label: 'Replace eaten food', type: 'bool', def: false, applies: 'now', help: 'Off in 2017: eaten food stayed gone until the next generation.' },
  { group: 'world', key: 'sharedWorld', label: 'All snakes share one map', type: 'bool', def: true, applies: 'gen', help: 'On in 2017: snakes compete for food and can crash into each other. Off: every snake gets its own identical copy of the map, which makes the comparison fair.' },
  { group: 'world', key: 'corpsesBlock', label: 'Dead snakes stay as walls', type: 'bool', def: true, applies: 'now', help: 'On in 2017. Only matters on a shared map.' },

  { group: 'snake', key: 'startLength', label: 'Starting length', type: 'int', min: 2, max: 10, step: 1, def: 4, unit: 'cells', applies: 'gen' },
  { group: 'snake', key: 'starveTicks', label: 'Starve after', type: 'int', min: 0, max: 1000, step: 10, def: 0, unit: 'ticks without food', zeroLabel: 'never', applies: 'now', help: 'Stops snakes from surviving by circling forever. 0 means never, as in 2017.' },
  { group: 'snake', key: 'visionDepth', label: 'Vision depth', type: 'int', min: 2, max: 11, step: 1, def: 5, unit: 'rows', applies: 'restart', help: 'Rows of cells the snake sees, from its own head row forward.' },
  { group: 'snake', key: 'visionWidth', label: 'Vision width', type: 'int', min: 3, max: 11, step: 2, def: 5, unit: 'columns', applies: 'restart', help: 'Always odd, so the head sits in the middle column.' },
  { group: 'snake', key: 'foodSense', label: 'Food compass', type: 'bool', def: false, applies: 'restart', help: 'Two extra inputs pointing at the nearest food: how far ahead, and how far to the left. Not in 2017.' },
  { group: 'snake', key: 'outputMode', label: 'Steering', type: 'select', options: [['threshold', '1 output split in thirds (2017)'], ['argmax', '3 outputs, the largest wins']], def: 'threshold', applies: 'restart', help: 'In 2017 one output below 0.33 meant turn left, above 0.67 turn right, anything between went straight.' },

  { group: 'brain', key: 'hiddenLayers', label: 'Hidden layers', type: 'int', min: 0, max: 4, step: 1, def: 2, applies: 'restart' },
  { group: 'brain', key: 'hiddenSize', label: 'Neurons per hidden layer', type: 'int', min: 2, max: 256, step: 1, def: 100, applies: 'restart', help: 'The 2017 saved snakes use 2 layers of 100.' },
  { group: 'brain', key: 'activation', label: 'Activation', type: 'select', options: [['sigmoid', 'Sigmoid'], ['sigmoid2017', 'Mirrored sigmoid (the 2017 code)'], ['tanh', 'Tanh'], ['relu', 'ReLU']], def: 'sigmoid', applies: 'now', help: 'The 2017 code computed 1 / (1 + eˣ), a sigmoid flipped left to right. Evolution adapts to either.' },
  { group: 'brain', key: 'initRange', label: 'Random weight range', type: 'float', min: 0.05, max: 3, step: 0.05, def: 1, prefix: '±', applies: 'gen', help: 'New random brains draw each weight uniformly from this range.' },

  { group: 'evolution', key: 'populationSize', label: 'Population', type: 'int', min: 4, max: 200, step: 2, def: 40, unit: 'snakes', applies: 'gen' },
  { group: 'evolution', key: 'generationTicks', label: 'Generation length', type: 'int', min: 10, max: 3000, step: 10, def: 200, unit: 'ticks', applies: 'gen', help: 'A generation also ends as soon as every snake is dead.' },
  { group: 'evolution', key: 'mutationStrength', label: 'Mutation size', type: 'log', min: 0.0001, max: 1, def: 0.01, prefix: '±', applies: 'gen', help: 'How far one mutation can move a weight.' },
  { group: 'evolution', key: 'mutationChance', label: 'Weights mutated', type: 'float', min: 0.01, max: 1, step: 0.01, def: 1, percent: true, applies: 'gen', help: '100% in 2017: every weight of a mutant moved a little.' },
  { group: 'evolution', key: 'recipeCopies', label: 'Parent copies', type: 'int', min: 0, max: 2, step: 1, def: 2, unit: 'per pair', applies: 'gen', help: 'The best snakes are paired: 1st with 2nd, 3rd with 4th, and so on. Each pair has these children.' },
  { group: 'evolution', key: 'recipeMutants', label: 'Mutated copies', type: 'int', min: 0, max: 12, step: 1, def: 2, unit: 'per pair', applies: 'gen' },
  { group: 'evolution', key: 'recipeHalfSwap', label: 'Half-and-half children', type: 'int', min: 0, max: 12, step: 1, def: 2, unit: 'per pair', applies: 'gen', help: 'First half of the weights from one parent, second half from the other.' },
  { group: 'evolution', key: 'recipePointSwap', label: 'Random-split children', type: 'int', min: 0, max: 12, step: 1, def: 2, unit: 'per pair', applies: 'gen', help: 'The same, but split at a random weight.' },
  { group: 'evolution', key: 'recipeFresh', label: 'Brand-new random snakes', type: 'int', min: 0, max: 12, step: 1, def: 2, unit: 'per pair', applies: 'gen' },
  { group: 'evolution', key: 'mutateCrossover', label: 'Mutate the crossed children too', type: 'bool', def: false, applies: 'gen', help: 'Commented out in the 2017 code.' },

  { group: 'fitness', key: 'fitnessMode', label: 'Rank snakes by', type: 'select', options: [['ranked', 'Length, then cells visited, then time alive (2017)'], ['weighted', 'A weighted score']], def: 'ranked', applies: 'gen' },
  { group: 'fitness', key: 'wEaten', label: 'Points per food', type: 'float', min: 0, max: 100, step: 1, def: 50, applies: 'gen', showIf: weighted },
  { group: 'fitness', key: 'wCells', label: 'Points per new cell visited', type: 'float', min: 0, max: 10, step: 0.1, def: 1, applies: 'gen', showIf: weighted },
  { group: 'fitness', key: 'wTime', label: 'Points per tick alive', type: 'float', min: 0, max: 2, step: 0.01, def: 0, applies: 'gen', showIf: weighted },
  { group: 'fitness', key: 'seed', label: 'Random seed', type: 'text', def: '', placeholder: 'random', applies: 'restart', help: 'A number makes a run repeatable. Leave it empty for a fresh run each time.' },
];

export function defaults() {
  const v = {};
  for (const p of PARAMS) v[p.key] = p.def;
  return v;
}

// Clamps and coerces a stored or imported value; returns the default when it can't be used.
export function sanitize(p, v) {
  if (p.type === 'bool') return typeof v === 'boolean' ? v : p.def;
  if (p.type === 'select') return p.options.some(([k]) => k === v) ? v : p.def;
  if (p.type === 'text') return v == null ? p.def : String(v).replace(/[^0-9]/g, '').slice(0, 10);
  const n = Number(v);
  if (!Number.isFinite(n)) return p.def;
  const c = Math.min(p.max, Math.max(p.min, n));
  return p.type === 'int' ? Math.round(c) : c;
}

export const PRESETS = [
  {
    id: 'original',
    label: '2017 original',
    help: 'The settings of the original project.',
    values: defaults(),
  },
  {
    id: 'quick',
    label: 'Learns in minutes',
    help: 'Small private maps, a food compass, a small brain and gentler evolution.',
    values: {
      ...defaults(),
      mapSize: 30,
      foodCount: 25,
      respawnFood: true,
      sharedWorld: false,
      starveTicks: 120,
      foodSense: true,
      outputMode: 'argmax',
      hiddenLayers: 1,
      hiddenSize: 12,
      activation: 'tanh',
      populationSize: 60,
      generationTicks: 600,
      mutationStrength: 0.2,
      mutationChance: 0.15,
      recipeCopies: 2,
      recipeMutants: 6,
      recipeHalfSwap: 0,
      recipePointSwap: 2,
      recipeFresh: 0,
      mutateCrossover: true,
      fitnessMode: 'weighted',
      wEaten: 50,
      wCells: 1,
      wTime: 0,
    },
  },
];
