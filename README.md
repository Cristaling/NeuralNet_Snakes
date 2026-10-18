# Neural Snakes

Snakes with small neural networks for brains, learning to play by evolution.

**Play with it: https://cristaling.github.io/NeuralNet_Snakes/**

This started in 2017 as my high-school certificate project (*atestat*), written in C# with Windows Forms.
The browser version keeps the original behaviour as its default and makes every setting adjustable.

## What's in the repository

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/` | The browser version. Plain JavaScript modules, no build step. |
| `Atestat_Iova_Rares_AI/` | The original 2017 C# project, unchanged. |
| `Atestat_Iova_Rares_AI/Iova_Rares_Atestat/bin/Debug/SnakeSaves/` | Snakes the 2017 program evolved and saved at generations 950, 1500 and 2000. The website can load them. |
| `tests/smoke.js` | A headless test of the simulation core. |

## How it works

- **Seeing:** each tick a snake sees a window of cells in front of it, rotated to its heading (5 × 5 in the original). Each cell is one input: −1 wall or body, 1 food, 0 empty. An optional food compass adds two inputs pointing at the nearest food.
- **Thinking:** a multilayer perceptron. The 2017 saved snakes are 25 → 100 → 100 → 1, which is 12,801 weights.
- **Steering:** one output split in thirds (left, straight, right), as in 2017, or three outputs where the largest wins.
- **Evolving:** after each generation the snakes are ranked (by length, then cells visited, then time alive, in the original). The best are paired, and each pair has copies, mutated copies, crossover children and some fresh random snakes.

The settings on the page say when each one takes effect: live, from the next generation, or only for a new population (anything that changes the shape of the brain).

## Running it locally

The page uses JavaScript modules and loads the 2017 save files with `fetch`, so open it through a local web server rather than as a file:

```bash
npx serve .
```

or

```bash
python -m http.server
```

Test the simulation core without a browser (Node 18 or newer):

```bash
npm test
```

## Notes on the 2017 code

The browser version reproduces two quirks of the original as options:

- The activation function was `1 / (1 + e^x)`, a sigmoid mirrored left to right. Evolution doesn't mind, but the saved snakes need it to behave as they did.
- Every mutant had all of its weights nudged by up to ±0.01.

It also documents one bug rather than reproducing it: in the last version of `Brain.cs`, the first layer's constructor arguments are swapped, so the network that code builds differs from the one in the save files.
