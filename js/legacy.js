// Reads the snakes saved by the 2017 C# program: one weight per line, 12,801 lines per snake.
// That count matches a 25 → 100 → 100 → 1 network (25 vision cells in, one steering output).

export const LEGACY_SIZES = [25, 100, 100, 1];
export const LEGACY_WEIGHTS = 12801;
export const LEGACY_GENERATIONS = ['Gen950', 'Gen1500', 'Gen2000'];
export const LEGACY_DIR = 'Atestat_Iova_Rares_AI/Iova_Rares_Atestat/bin/Debug/SnakeSaves';

// The settings those brains were evolved with.
export const LEGACY_PARAMS = {
  mapSize: 80,
  startLength: 4,
  sharedWorld: true,
  corpsesBlock: true,
  respawnFood: false,
  starveTicks: 0,
  visionDepth: 5,
  visionWidth: 5,
  foodSense: false,
  outputMode: 'threshold',
  hiddenLayers: 2,
  hiddenSize: 100,
  activation: 'sigmoid2017',
  populationSize: 40,
};

export function parseLegacy(text) {
  const values = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (values.length !== LEGACY_WEIGHTS) throw new Error(`Expected ${LEGACY_WEIGHTS.toLocaleString('en-US')} weights, found ${values.length.toLocaleString('en-US')}.`);
  if (values.some((v) => !Number.isFinite(v))) throw new Error('The file has a line that is not a number.');
  return Float64Array.from(values);
}

export async function fetchLegacyGeneration(gen, count = 40, onProgress) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const res = await fetch(`${LEGACY_DIR}/${gen}/Snake${i}.txt`);
    if (!res.ok) throw new Error(`Could not load ${gen}/Snake${i}.txt (HTTP ${res.status}).`);
    out.push(parseLegacy(await res.text()));
    if (onProgress) onProgress(i, count);
  }
  return out;
}
