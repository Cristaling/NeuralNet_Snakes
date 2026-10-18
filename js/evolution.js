import { randomWeights } from './brain.js';

// Builds the next generation from brains ranked best first.
// Like the 2017 GeneticManager: the best snakes are paired (1st with 2nd, 3rd with 4th, ...)
// and every pair produces the same recipe of children until the population is full.
export function nextGeneration(ranked, p, rng, n) {
  const target = p.populationSize;
  const out = [];
  const perPair = p.recipeCopies + p.recipeMutants + p.recipeHalfSwap + p.recipePointSwap + p.recipeFresh;
  if (perPair === 0 || ranked.length === 0) {
    while (out.length < target) out.push(randomWeights(n, rng, p.initRange));
    return out;
  }
  const crossed = (child) => {
    if (p.mutateCrossover) mutate(child, p, rng);
    return child;
  };
  let pair = 0;
  while (out.length < target) {
    const a = ranked[(2 * pair) % ranked.length];
    const b = ranked[(2 * pair + 1) % ranked.length];
    const parents = [a, b];
    pair++;
    for (let i = 0; i < p.recipeCopies; i++) out.push(parents[i % 2].slice());
    for (let i = 0; i < p.recipeMutants; i++) {
      const c = parents[i % 2].slice();
      mutate(c, p, rng);
      out.push(c);
    }
    for (let i = 0; i < p.recipeHalfSwap; i += 2) {
      const [c1, c2] = swapTail(a, b, Math.floor(n / 2));
      out.push(crossed(c1));
      if (i + 1 < p.recipeHalfSwap) out.push(crossed(c2));
    }
    for (let i = 0; i < p.recipePointSwap; i += 2) {
      const [c1, c2] = swapTail(a, b, Math.floor(rng() * n));
      out.push(crossed(c1));
      if (i + 1 < p.recipePointSwap) out.push(crossed(c2));
    }
    for (let i = 0; i < p.recipeFresh; i++) out.push(randomWeights(n, rng, p.initRange));
  }
  out.length = target;
  return out;
}

// Each chosen weight moves by a uniform amount in [-strength, +strength].
export function mutate(w, p, rng) {
  const all = p.mutationChance >= 1;
  for (let i = 0; i < w.length; i++) {
    if (all || rng() < p.mutationChance) w[i] += (rng() - 0.5) * 2 * p.mutationStrength;
  }
}

// Two children: each keeps its own parent's weights up to `from`, then takes the other parent's.
export function swapTail(a, b, from) {
  const c1 = a.slice();
  const c2 = b.slice();
  for (let i = from; i < a.length; i++) {
    c1[i] = b[i];
    c2[i] = a[i];
  }
  return [c1, c2];
}
