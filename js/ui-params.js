import { GROUPS, PARAMS, APPLIES, sanitize } from './params.js';

const LOG_STEPS = 1000;

export function formatValue(p, v) {
  if (p.type === 'bool' || p.type === 'select' || p.type === 'text') return '';
  if (p.zeroLabel && v === 0) return p.zeroLabel;
  let s;
  if (p.percent) s = `${Math.round(v * 100)}%`;
  else if (p.type === 'log') s = (v >= 0.1 ? v.toFixed(2) : v.toPrecision(2)).replace(/\.?0+$/, '');
  else if (p.type === 'float') s = v.toFixed((String(p.step).split('.')[1] || '').length);
  else s = v.toLocaleString('en-US');
  return `${p.prefix || ''}${s}${p.unit ? ` ${p.unit}` : ''}`;
}

const toLog = (p, v) => Math.round((LOG_STEPS * (Math.log10(v) - Math.log10(p.min))) / (Math.log10(p.max) - Math.log10(p.min)));
const fromLog = (p, pos) => Number((10 ** (Math.log10(p.min) + (pos / LOG_STEPS) * (Math.log10(p.max) - Math.log10(p.min)))).toPrecision(2));

// Builds the parameter form from the schema. `onChange(param, value)` runs after `values` is updated.
export function buildParamForm(root, values, onChange) {
  const rows = new Map();
  root.textContent = '';
  for (const g of GROUPS) {
    const fs = document.createElement('fieldset');
    fs.className = 'pgroup';
    const lg = document.createElement('legend');
    lg.textContent = g.title;
    fs.appendChild(lg);
    for (const p of PARAMS.filter((x) => x.group === g.id)) {
      const row = makeRow(p, values, onChange);
      rows.set(p.key, row);
      fs.appendChild(row.el);
    }
    root.appendChild(fs);
  }
  const api = {
    set(key, v) {
      const r = rows.get(key);
      if (r) r.show(v);
    },
    setAll(vals) {
      for (const [k, r] of rows) r.show(vals[k]);
      api.refresh();
    },
    refresh() {
      for (const p of PARAMS) {
        const r = rows.get(p.key);
        r.el.hidden = p.showIf ? !p.showIf(values) : false;
      }
    },
    markPending(keys) {
      for (const [k, r] of rows) r.el.classList.toggle('pending', keys.has(k));
    },
  };
  api.refresh();
  return api;
}

function makeRow(p, values, onChange) {
  const id = `p-${p.key}`;
  const el = document.createElement('div');
  el.className = 'prow';
  const top = document.createElement('div');
  top.className = 'top-line';
  let input;
  let out = null;

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = p.label;
  const badge = document.createElement('span');
  badge.className = `applies a-${p.applies}`;
  badge.textContent = APPLIES[p.applies];

  if (p.type === 'bool') {
    const wrap = document.createElement('div');
    wrap.className = 'boolrow';
    input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    wrap.append(input, label);
    top.append(wrap, badge);
    el.appendChild(top);
  } else {
    top.append(label, badge);
    el.appendChild(top);
    if (p.type === 'select') {
      input = document.createElement('select');
      for (const [k, text] of p.options) input.add(new Option(text, k));
    } else if (p.type === 'text') {
      input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.placeholder = p.placeholder || '';
      input.autocomplete = 'off';
    } else {
      input = document.createElement('input');
      input.type = 'range';
      if (p.type === 'log') {
        input.min = 0;
        input.max = LOG_STEPS;
        input.step = 1;
      } else {
        input.min = p.min;
        input.max = p.max;
        input.step = p.step;
      }
      out = document.createElement('output');
      out.htmlFor = id;
    }
    input.id = id;
    if (out) {
      const line = document.createElement('div');
      line.className = 'top-line';
      line.append(input, out);
      input.style.flex = '1';
      el.appendChild(line);
    } else {
      el.appendChild(input);
    }
  }
  if (p.help) {
    const h = document.createElement('p');
    h.className = 'help';
    h.textContent = p.help;
    el.appendChild(h);
  }

  const show = (v) => {
    if (p.type === 'bool') input.checked = v;
    else if (p.type === 'log') input.value = toLog(p, v);
    else input.value = v;
    if (out) out.textContent = formatValue(p, v);
  };
  const read = () => {
    if (p.type === 'bool') return input.checked;
    if (p.type === 'log') return fromLog(p, Number(input.value));
    if (p.type === 'select' || p.type === 'text') return input.value;
    return Number(input.value);
  };
  const commit = () => {
    const v = sanitize(p, read());
    values[p.key] = v;
    if (out) out.textContent = formatValue(p, v);
    if (p.type === 'text' && input.value !== v) input.value = v;
    onChange(p, v);
  };
  const isSlider = p.type === 'int' || p.type === 'float' || p.type === 'log';
  input.addEventListener(isSlider ? 'input' : 'change', commit);
  show(values[p.key]);
  return { el, show };
}
