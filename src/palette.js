// Palette engine: named gradients + custom gradient sampling with hue cycling.

export const PALETTES = {
  aurora:    ['#00c9a7', '#4d8dff', '#a155ff', '#ff6ec7'],
  sunset:    ['#ffd166', '#ff8c42', '#ef476f', '#7b2d8b'],
  ice:       ['#e0fbfc', '#98c1d9', '#3d5a80', '#0a1626'],
  fire:      ['#f9dc5c', '#f4a259', '#e76f51', '#9b2226'],
  neon:      ['#39ff14', '#00fff7', '#ff00e6', '#ffe600'],
  mono:      ['#ffffff', '#c0c0c0', '#707070', '#2a2a2a'],
  candy:     ['#ff9ecd', '#ffc9e0', '#b8f2e6', '#aeddc0'],
  rainbow:   ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
  ocean:     ['#03045e', '#0077b6', '#00b4d8', '#90e0ef'],
  toxic:     ['#d0f400', '#2bd900', '#00d9a3', '#0088ff'],
  currents:  ['#f8e9d8', '#e86a5c', '#c74b8f', '#6a4c9c', '#2e6f95', '#38b6a5'],
  currentsDark: ['#12151c', '#2b3a67', '#3f8f8b', '#8fd06c', '#e8c26a'],
  vaporwave: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'],
  gold:      ['#3c2a21', '#8c6a4f', '#d4a868', '#ffe8b0'],
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function rgbToHex([r, g, b]) {
  const f = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

// Cached hex->rgb conversion per stops array (avoids per-vertex allocation churn).
let stopCache = new WeakMap();
export function invalidatePaletteCache() { stopCache = new WeakMap(); }

function rgbStopsFor(stops) {
  let s = stopCache.get(stops);
  if (!s) { s = stops.map(hexToRgb); stopCache.set(stops, s); }
  return s;
}

// Sample a multi-stop gradient at t in 0..1; cycle shifts along the gradient.
export function sampleGradient(stops, t, cycle = 0) {
  if (!stops || stops.length === 0) return [1, 1, 1];
  const rgbStops = rgbStopsFor(stops);
  const tt = ((t + cycle) % 1 + 1) % 1 * (rgbStops.length - 1);
  const i = Math.min(rgbStops.length - 2, Math.floor(tt));
  const f = tt - i;
  const a = rgbStops[i], b = rgbStops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

export function cssGradient(stops) {
  return `linear-gradient(90deg, ${(stops || []).join(',')})`;
}
