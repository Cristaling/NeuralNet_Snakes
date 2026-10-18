// A plain multilayer perceptron, stored the same way the 2017 C# code saved it:
// layer by layer, neuron by neuron, each neuron's input weights followed by its bias.
// One neuron's weights are one row of that layer's weight matrix.

export const ACTIVATIONS = {
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  // The 2017 code computed 1 / (1 + e^x): a sigmoid mirrored left to right.
  sigmoid2017: (x) => 1 / (1 + Math.exp(x)),
  tanh: Math.tanh,
  relu: (x) => (x > 0 ? x : 0),
  linear: (x) => x,
};

export function weightCount(sizes) {
  let n = 0;
  for (let l = 1; l < sizes.length; l++) n += sizes[l] * (sizes[l - 1] + 1);
  return n;
}

// Index of the first weight of layer l (layers are numbered from 1; layer 0 is the input).
export function layerOffset(sizes, l) {
  let off = 0;
  for (let k = 1; k < l; k++) off += sizes[k] * (sizes[k - 1] + 1);
  return off;
}

export function randomWeights(n, rng, range) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = (rng() * 2 - 1) * range;
  return w;
}

export class Brain {
  constructor(sizes, weights, hidden, output) {
    this.sizes = sizes;
    this.w = weights;
    this.acts = sizes.map((n) => new Float64Array(n));
    this.setActivations(hidden, output);
  }

  setActivations(hidden, output) {
    this.hiddenName = hidden;
    this.outputName = output;
    this.hidden = ACTIVATIONS[hidden];
    this.output = ACTIVATIONS[output];
  }

  // y = f(W·x + b) for every layer in turn.
  forward(input) {
    const { sizes, w, acts } = this;
    acts[0].set(input);
    const last = sizes.length - 1;
    let off = 0;
    for (let l = 1; l <= last; l++) {
      const nin = sizes[l - 1];
      const nout = sizes[l];
      const a = acts[l - 1];
      const o = acts[l];
      const f = l === last ? this.output : this.hidden;
      for (let j = 0; j < nout; j++) {
        let s = 0;
        for (let i = 0; i < nin; i++) s += w[off + i] * a[i];
        s += w[off + nin];
        o[j] = f(s);
        off += nin + 1;
      }
    }
    return acts[last];
  }
}
