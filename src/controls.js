// Schema-driven control panel. Params object is shared app state (also saved in presets).
import { PALETTES, cssGradient } from './palette.js';

export const params = {
  // audio
  sensitivity: 1.2,
  barCount: 96,
  freqMapping: 'log',
  fftSize: 2048,
  smoothing: 0.8,
  beatSensitivity: 1.45,
  beatDecay: 5,
  // colors
  palette: 'aurora',
  customStops: ['#7c5cff', '#22d3ee', '#ff6ec7'],
  hueSpeed: 0.06,
  beatFlash: 0.5,
  glowStrength: 1.0,
  // camera / fx
  orbitSpeed: 0.15,
  fov: 70,
  beatShake: 0.3,
  bloom: 0.8,
  vignette: 0.5,
  chromatic: 0.3,
  brightness: 1.5,
  pixelate: 0,
  scanline: 0,
  grain: 0,
  mirrorX: false,
  beatZoom: 0,
  camRoll: 0,
  sway: 0,
  fovPulse: 0,
  postKaleido: 0,
  kaleidoSpin: 0.2,
  radialBlur: 0,
  hueShift: 0,
  posterize: 0,
  invertBeat: 0,
  mirrorY: false,
  halftone: 0,
  edge: 0,
  duotone: 0,
  wobble: 0,
  wobbleSpeed: 1,
  hueAuto: 0,
  autoGain: true,
  camMode: 'orbit',
  camDistance: 42,
  camHeight: 10,
  trails: 0,
  fogDensity: 0.012,
  background: '#05060a',
  strobe: 0,
  // per-scene
  scene: 'bars',
  mirror: true,
  barHeight: 18,
  spin: 0.2,
  particleCount: 4000,
  particleSpread: 40,
  tunnelSpeed: 6,
  tunnelRadius: 10,
  terrainSpeed: 8,
  terrainHeight: 12,
  orbDisplace: 1.2,
  gridRows: 40,
  nebulaDensity: 1.0,
  kaleidoSlices: 8,
  reactBass: 1.0,
  reactMid: 0.6,
  reactTreble: 0.4,
  // auto VJ + performance
  autoVJ: false,
  autoInterval: 20,
  transitionTime: 1.2,
  transitionStyle: 'random',
  syncBeats: true,
  autoChangePalette: true,
  autoChangeCamera: true,
  autoChangeFx: true,
  quality: 1,
  // flow (Currents)  flowLines: 140,
  flowAmp: 2.5,
  flowTime: 1.0,
  vortex: 1.0,
  vortexX: 12,
  vortexY: 0,
  vortexR: 8,
  // other new scenes
  spiralArms: 3,
  rayCount: 180,
  rayLength: 18,
  ringCount: 5,
  ringGap: 4,
  liquidAmp: 2.0,
  matrixSize: 16,
  ribbonCount: 14,
  petals: 5,
  // fluid sim
  fluidAmount: 1.0,
  fluidDissipation: 1.0,
  fluidSwirl: 24,
};

export function sceneParamsList() {
  // Per-scene visible controls (subset of params keys)
  return {
    flow:         ['flowLines', 'flowAmp', 'flowTime', 'vortex', 'vortexX', 'vortexY', 'vortexR', 'reactBass', 'reactMid'],
    bars:        ['barCount', 'barHeight', 'mirror', 'spin'],
    rings:       ['ringCount', 'ringGap', 'barCount', 'spin'],
    starburst:   ['rayCount', 'rayLength', 'spin', 'reactBass'],
    spiral:      ['spiralArms', 'spin', 'reactBass'],
    particles:   ['particleCount', 'particleSpread', 'spin', 'reactBass'],
    tunnel:      ['barCount', 'tunnelSpeed', 'tunnelRadius', 'spin'],
    terrain:     ['barCount', 'terrainSpeed', 'terrainHeight'],
    orb:         ['orbDisplace', 'spin', 'reactBass', 'reactTreble'],
    grid:        ['gridRows', 'barCount', 'terrainSpeed'],
    nebula:      ['nebulaDensity', 'reactBass', 'reactMid'],
    kaleidoscope:['kaleidoSlices', 'beatFlash', 'reactTreble'],
    waveplain:   ['barCount', 'liquidAmp', 'reactBass'],
    fluid:       ['fluidAmount', 'fluidDissipation', 'fluidSwirl', 'reactBass', 'reactTreble'],
    ribbons:     ['ribbonCount', 'spin', 'reactBass', 'reactMid'],
    flower:      ['petals', 'spin', 'reactBass'],
    skyline:     ['barCount', 'barHeight', 'spin'],
    helix:       ['gridRows', 'spin', 'reactBass', 'reactMid'],
    pulsar:      ['spin', 'reactBass', 'reactTreble'],
    lissajous:   ['spin', 'flowTime', 'reactBass', 'reactTreble'],
    storm:       ['particleCount', 'particleSpread', 'reactBass'],
    fireworks:   ['reactBass', 'reactTreble', 'beatFlash'],
    butterfly:   ['spin', 'reactBass', 'reactMid'],
    warp:        ['particleCount', 'particleSpread', 'reactBass'],
    gyroscope:   ['spin', 'reactBass', 'reactTreble'],
    rain:        ['barCount', 'terrainSpeed', 'reactBass', 'reactTreble'],
    vortex:      ['spin', 'reactBass', 'reactTreble'],
    smoke:       ['reactBass', 'reactMid', 'beatFlash'],
    prism:       ['spin', 'reactBass', 'beatFlash'],
    corona:      ['reactBass', 'reactMid', 'reactTreble', 'beatFlash'],
    matrix:      ['matrixSize', 'spin'],
  };
}

const SCHEMA = {
  barCount:      { label: 'Detail / bars', type: 'range', min: 16, max: 256, step: 1 },
  sensitivity:   { label: 'Sensitivity', type: 'range', min: 0.5, max: 3, step: 0.05 },
  freqMapping:   { label: 'Frequency mapping', type: 'select', options: [['log', 'Logarithmic'], ['linear', 'Linear']] },
  fftSize:       { label: 'FFT size', type: 'select', options: [[512, '512'], [1024, '1024'], [2048, '2048'], [4096, '4096']] },
  smoothing:     { label: 'Smoothing', type: 'range', min: 0, max: 0.95, step: 0.01 },
  beatSensitivity: { label: 'Beat sensitivity', type: 'range', min: 1.1, max: 2.5, step: 0.05 },
  beatDecay:     { label: 'Beat decay', type: 'range', min: 1, max: 12, step: 0.5 },
  palette:       { label: 'Palette', type: 'palette' },
  customStops:   { label: 'Custom gradient', type: 'gradient' },
  hueSpeed:      { label: 'Hue cycle speed', type: 'range', min: 0, max: 0.5, step: 0.01 },
  beatFlash:     { label: 'Beat color flash', type: 'range', min: 0, max: 1, step: 0.05 },
  glowStrength:  { label: 'Glow strength', type: 'range', min: 0, max: 2, step: 0.05 },
  orbitSpeed:    { label: 'Auto-orbit speed', type: 'range', min: 0, max: 1, step: 0.01 },
  fov:           { label: 'Field of view', type: 'range', min: 30, max: 120, step: 1 },
  beatShake:     { label: 'Beat camera shake', type: 'range', min: 0, max: 1, step: 0.05 },
  bloom:         { label: 'Bloom', type: 'range', min: 0, max: 2, step: 0.05 },
  vignette:      { label: 'Vignette', type: 'range', min: 0, max: 1, step: 0.05 },
  chromatic:     { label: 'Chromatic aberration', type: 'range', min: 0, max: 1, step: 0.05 },
  mirror:        { label: 'Mirror', type: 'check' },
  barHeight:     { label: 'Height scale', type: 'range', min: 2, max: 40, step: 0.5 },
  spin:          { label: 'Spin speed', type: 'range', min: -1, max: 1, step: 0.02 },
  particleCount: { label: 'Particle count', type: 'range', min: 500, max: 20000, step: 500 },
  particleSpread:{ label: 'Spread', type: 'range', min: 10, max: 120, step: 1 },
  tunnelSpeed:   { label: 'Speed', type: 'range', min: 0, max: 20, step: 0.5 },
  tunnelRadius:  { label: 'Radius', type: 'range', min: 4, max: 30, step: 0.5 },
  terrainSpeed:  { label: 'Scroll speed', type: 'range', min: 0, max: 30, step: 0.5 },
  terrainHeight: { label: 'Height', type: 'range', min: 1, max: 30, step: 0.5 },
  orbDisplace:   { label: 'Displacement', type: 'range', min: 0, max: 4, step: 0.1 },
  gridRows:      { label: 'Rows', type: 'range', min: 8, max: 120, step: 1 },
  nebulaDensity: { label: 'Density', type: 'range', min: 0.2, max: 3, step: 0.05 },
  kaleidoSlices: { label: 'Mirror slices', type: 'range', min: 2, max: 24, step: 1 },
  reactBass:     { label: 'Bass reaction', type: 'range', min: 0, max: 2, step: 0.05 },
  reactMid:      { label: 'Mid reaction', type: 'range', min: 0, max: 2, step: 0.05 },
  reactTreble:   { label: 'Treble reaction', type: 'range', min: 0, max: 2, step: 0.05 },
  // camera / fx extras
  camMode:       { label: 'Camera mode', type: 'select', options: [['orbit', 'Auto-orbit'], ['front', 'Front view'], ['top', 'Top view']] },
  camDistance:   { label: 'Camera distance', type: 'range', min: 10, max: 120, step: 1 },
  camHeight:     { label: 'Camera height', type: 'range', min: -40, max: 60, step: 1 },
  trails:        { label: 'Motion trails', type: 'range', min: 0, max: 0.97, step: 0.01 },
  fogDensity:    { label: 'Fog density', type: 'range', min: 0, max: 0.06, step: 0.001 },
  background:    { label: 'Background color', type: 'color' },
  strobe:        { label: 'Beat strobe', type: 'range', min: 0, max: 1, step: 0.05 },
  brightness:    { label: 'Brightness', type: 'range', min: 0.2, max: 4, step: 0.05 },
  pixelate:      { label: 'Pixelate', type: 'range', min: 0, max: 200, step: 1 },
  scanline:      { label: 'Scanlines', type: 'range', min: 0, max: 1, step: 0.05 },
  grain:         { label: 'Film grain', type: 'range', min: 0, max: 1, step: 0.05 },
  mirrorX:       { label: 'Mirror symmetry', type: 'check' },
  beatZoom:      { label: 'Beat zoom punch', type: 'range', min: 0, max: 1, step: 0.05 },
  camRoll:       { label: 'Camera roll', type: 'range', min: -1, max: 1, step: 0.02 },
  sway:          { label: 'Camera sway', type: 'range', min: 0, max: 1, step: 0.02 },
  fovPulse:      { label: 'Bass FOV pulse', type: 'range', min: 0, max: 1, step: 0.02 },
  postKaleido:   { label: 'Kaleidoscope FX', type: 'range', min: 0, max: 12, step: 1 },
  kaleidoSpin:   { label: 'Kaleido spin', type: 'range', min: -1, max: 1, step: 0.02 },
  radialBlur:    { label: 'Radial beat blur', type: 'range', min: 0, max: 1, step: 0.02 },
  hueShift:      { label: 'Hue rotate', type: 'range', min: -1, max: 1, step: 0.01 },
  posterize:     { label: 'Posterize levels', type: 'range', min: 0, max: 10, step: 1 },
  invertBeat:    { label: 'Invert on beat', type: 'range', min: 0, max: 1, step: 0.05 },
  ribbonCount:   { label: 'Ribbon count', type: 'range', min: 3, max: 40, step: 1 },
  petals:        { label: 'Petals', type: 'range', min: 2, max: 12, step: 1 },
  mirrorY:       { label: 'Mirror vertical', type: 'check' },
  halftone:      { label: 'Halftone dots', type: 'range', min: 0, max: 1, step: 0.05 },
  edge:          { label: 'Edge sketch', type: 'range', min: 0, max: 1, step: 0.05 },
  duotone:       { label: 'Duotone', type: 'range', min: 0, max: 1, step: 0.05 },
  wobble:        { label: 'Screen wobble', type: 'range', min: 0, max: 1, step: 0.02 },
  wobbleSpeed:   { label: 'Wobble speed', type: 'range', min: 0.1, max: 4, step: 0.05 },
  hueAuto:       { label: 'Auto hue cycle', type: 'range', min: 0, max: 1, step: 0.02 },
  autoGain:      { label: 'Auto gain (normalize loudness)', type: 'check' },
  autoVJ:          { label: 'Auto VJ mode', type: 'check' },
  autoInterval:    { label: 'Scene duration (s)', type: 'range', min: 5, max: 90, step: 1 },
  transitionTime:  { label: 'Transition length (s)', type: 'range', min: 0.2, max: 4, step: 0.1 },
  transitionStyle: { label: 'Transition style', type: 'select', options: [
    ['random', '🎲 Random mix'], ['glitch', 'Glitch slices'], ['zoomspin', 'Zoom spin'],
    ['slide', 'Whip slide'], ['pixeldissolve', 'Pixel dissolve'], ['iris', 'Iris wipe'],
    ['rgbsplit', 'RGB split'], ['fade', 'Fade']] },
  syncBeats:      { label: 'Switch on the beat', type: 'check' },
  autoChangePalette: { label: 'Change palette', type: 'check' },
  autoChangeCamera:  { label: 'Change camera', type: 'check' },
  autoChangeFx:      { label: 'Change post FX', type: 'check' },
  quality:         { label: 'Render quality', type: 'select', options: [[0.5, 'Low (fastest)'], [0.75, 'Balanced'], [1, 'High'], [1.5, 'Ultra (laggy)']] },
  // flow / new scenes
  flowLines:     { label: 'Line count', type: 'range', min: 20, max: 400, step: 5 },
  flowAmp:       { label: 'Waviness', type: 'range', min: 0, max: 10, step: 0.1 },
  flowTime:      { label: 'Flow speed', type: 'range', min: 0, max: 4, step: 0.05 },
  vortex:        { label: 'Vortex strength', type: 'range', min: 0, max: 3, step: 0.05 },
  vortexX:       { label: 'Vortex X', type: 'range', min: -40, max: 40, step: 1 },
  vortexY:       { label: 'Vortex Y', type: 'range', min: -25, max: 25, step: 1 },
  vortexR:       { label: 'Vortex size', type: 'range', min: 2, max: 25, step: 0.5 },
  spiralArms:    { label: 'Spiral arms', type: 'range', min: 1, max: 8, step: 1 },
  rayCount:      { label: 'Ray count', type: 'range', min: 16, max: 512, step: 8 },
  rayLength:     { label: 'Ray length', type: 'range', min: 4, max: 50, step: 0.5 },
  ringCount:     { label: 'Ring count', type: 'range', min: 1, max: 24, step: 1 },
  ringGap:       { label: 'Ring spacing', type: 'range', min: 1, max: 12, step: 0.25 },
  liquidAmp:     { label: 'Wave amplitude', type: 'range', min: 0, max: 8, step: 0.1 },
  matrixSize:    { label: 'Grid size', type: 'range', min: 4, max: 40, step: 1 },
  fluidAmount:      { label: 'Audio splat amount', type: 'range', min: 0.1, max: 3, step: 0.05 },
  fluidDissipation: { label: 'Trail length (lower = longer)', type: 'range', min: 0.2, max: 4, step: 0.05 },
  fluidSwirl:       { label: 'Swirl (vorticity)', type: 'range', min: 0, max: 50, step: 1 },
};

const GROUP_TITLES = { audio: 'Analysis', colors: 'Palette', camera: 'Camera', atmos: 'Atmosphere & FX', atmos2: 'Retro / Post FX', auto: 'Auto VJ', perf: 'Performance' };

function fmtVal(key, v) {
  const s = SCHEMA[key];
  if (!s) return v;
  if (s.type === 'select') return '';
  return typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : (v ? 'on' : 'off');
}

export function buildControl(key, onChange) {
  const s = SCHEMA[key];
  const div = document.createElement('div');
  div.className = 'ctl';
  const v = params[key];

  if (s.type === 'range') {
    div.innerHTML = `<label>${s.label}<span class="val">${fmtVal(key, v)}</span></label>`;
    const input = document.createElement('input');
    input.type = 'range'; input.min = s.min; input.max = s.max; input.step = s.step; input.value = v;
    input.addEventListener('input', () => {
      params[key] = parseFloat(input.value);
      div.querySelector('.val').textContent = fmtVal(key, params[key]);
      onChange?.(key, params[key]);
    });
    div.appendChild(input);
  } else if (s.type === 'select') {
    div.innerHTML = `<label>${s.label}</label>`;
    const sel = document.createElement('select');
    for (const [val, name] of s.options) {
      const o = document.createElement('option');
      o.value = String(val); o.textContent = name;
      if (String(v) === String(val)) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      params[key] = isNaN(parseFloat(sel.value)) ? sel.value : parseFloat(sel.value);
      onChange?.(key, params[key]);
    });
    div.appendChild(sel);
  } else if (s.type === 'check') {
    div.innerHTML = `<label class="ctl-check"><input type="checkbox" ${v ? 'checked' : ''}> ${s.label}</label>`;
    div.querySelector('input').addEventListener('change', (e) => {
      params[key] = e.target.checked;
      onChange?.(key, params[key]);
    });
  } else if (s.type === 'color') {
    div.innerHTML = `<label>${s.label}</label>`;
    const input = document.createElement('input');
    input.type = 'color'; input.value = v;
    input.addEventListener('input', () => {
      params[key] = input.value;
      onChange?.(key, params[key]);
    });
    div.appendChild(input);
  }
  return div;
}

export function buildPalettePicker(onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'palette-swatches';
  const names = [...Object.keys(PALETTES), 'custom'];
  for (const name of names) {
    const b = document.createElement('div');
    b.className = 'palette-swatch' + (params.palette === name ? ' active' : '');
    b.title = name;
    b.style.background = cssGradient(name === 'custom' ? params.customStops : PALETTES[name]);
    b.addEventListener('click', () => {
      params.palette = name;
      wrap.querySelectorAll('.palette-swatch').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      onChange?.();
    });
    wrap.appendChild(b);
  }
  return wrap;
}

export function buildGradientEditor(onChange) {
  const div = document.createElement('div');
  div.className = 'ctl';
  div.innerHTML = `<label>Custom gradient stops</label>`;
  const row = document.createElement('div');
  row.className = 'ctl-row';
  params.customStops.forEach((c, i) => {
    const input = document.createElement('input');
    input.type = 'color'; input.value = c; input.flex = '1';
    input.style.flex = '1'; input.style.height = '26px'; input.style.padding = '0';
    input.addEventListener('input', () => {
      params.customStops[i] = input.value;
      onChange?.();
    });
    row.appendChild(input);
  });
  div.appendChild(row);
  return div;
}

export function controlsForGroup(group, keys, onChange) {
  const g = document.createElement('div');
  g.className = 'ctl-group';
  const t = document.createElement('div');
  t.className = 'ctl-group-title';
  t.textContent = GROUP_TITLES[group] || 'Scene';
  g.appendChild(t);
  for (const k of keys) g.appendChild(buildControl(k, onChange));
  return g;
}
