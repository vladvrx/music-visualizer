// Preset save/load in localStorage + JSON export/import.
import { params } from './controls.js';

const KEY = 'mv-presets';

// Built-in looks. "Currents Cover" recreates the Tame Impala album artwork.
export const FACTORY = {
  'Currents Cover': {
    scene: 'flow', palette: 'currents', background: '#0a0b10',
    camMode: 'front', camDistance: 58, orbitSpeed: 0, beatShake: 0,
    flowLines: 170, flowAmp: 2.4, flowTime: 0.7, vortex: 1.25, vortexX: 14, vortexY: 0, vortexR: 9,
    hueSpeed: 0, bloom: 0.35, vignette: 0.35, chromatic: 0, trails: 0.45, fogDensity: 0,
    reactBass: 0.35, reactMid: 0.3, reactTreble: 0.25, strobe: 0,
  },
  'Liquid Light': {
    scene: 'fluid', palette: 'aurora', background: '#04050a',
    camMode: 'front', camDistance: 50, orbitSpeed: 0, beatShake: 0,
    fluidAmount: 1.2, fluidDissipation: 0.7, fluidSwirl: 32,
    bloom: 1.0, vignette: 0.4, chromatic: 0.2, trails: 0, fogDensity: 0,
    hueSpeed: 0.04, beatFlash: 0.3, reactBass: 1.2, reactTreble: 1.0,
  },
  'Liquid Fire': {
    scene: 'fluid', palette: 'fire', background: '#0a0301',
    camMode: 'front', camDistance: 50, orbitSpeed: 0, beatShake: 0,
    fluidAmount: 1.6, fluidDissipation: 0.5, fluidSwirl: 40,
    bloom: 1.2, vignette: 0.5, chromatic: 0.3, trails: 0, fogDensity: 0,
    hueSpeed: 0, beatFlash: 0.2, reactBass: 1.5, reactTreble: 0.8,
  },
  'Currents — White Lines': {
    scene: 'flow', palette: 'mono', background: '#101114',
    camMode: 'front', camDistance: 58, orbitSpeed: 0, beatShake: 0,
    flowLines: 220, flowAmp: 1.8, flowTime: 0.5, vortex: 1.4, vortexX: 10, vortexY: 2, vortexR: 10,
    hueSpeed: 0, bloom: 0.2, vignette: 0.4, chromatic: 0, trails: 0.3, fogDensity: 0,
    reactBass: 0.3, reactMid: 0.3, reactTreble: 0.2, strobe: 0,
  },
  'Retro Synthwave': {
    scene: 'terrain', palette: 'vaporwave', background: '#0d0221',
    camMode: 'orbit', camDistance: 50, camHeight: 4, orbitSpeed: 0.08,
    terrainSpeed: 14, terrainHeight: 16, bloom: 1.3, vignette: 0.6, chromatic: 0.5,
    trails: 0, fogDensity: 0.02, hueSpeed: 0.03, beatFlash: 0.4,
  },
  'Deep Space': {
    scene: 'particles', palette: 'ice', background: '#010208',
    camMode: 'orbit', camDistance: 60, orbitSpeed: 0.1,
    particleCount: 12000, particleSpread: 80, bloom: 1.2, vignette: 0.7, chromatic: 0.2,
    trails: 0.6, fogDensity: 0, hueSpeed: 0.01, reactBass: 1.4,
  },
  'Fire Tunnel': {
    scene: 'tunnel', palette: 'fire', background: '#0a0301',
    camMode: 'front', camDistance: 30, orbitSpeed: 0, beatShake: 0.6,
    tunnelSpeed: 12, tunnelRadius: 12, bloom: 1.4, vignette: 0.6, chromatic: 0.4,
    trails: 0.5, fogDensity: 0, hueSpeed: 0, beatFlash: 0.6,
  },
  'Hypnosis': {
    scene: 'kaleidoscope', palette: 'neon', background: '#000000',
    camMode: 'front', camDistance: 50, orbitSpeed: 0,
    kaleidoSlices: 10, bloom: 1.0, vignette: 0.8, chromatic: 0.6, trails: 0.2,
    hueSpeed: 0.08, beatFlash: 0.4, strobe: 0, reactTreble: 1.2,
  },
};

export function applyFactory(name) {
  const p = FACTORY[name];
  if (!p) return false;
  Object.assign(params, p);
  return true;
}

export function listPresets() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function saveAll(map) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function savePreset(name) {
  if (!name) return;
  const map = listPresets();
  map[name] = JSON.parse(JSON.stringify(params));
  saveAll(map);
}

export function deletePreset(name) {
  const map = listPresets();
  delete map[name];
  saveAll(map);
}

export function applyPreset(name) {
  const p = listPresets()[name];
  if (!p) return false;
  Object.assign(params, p);
  return true;
}

export function exportPreset(name) {
  const p = listPresets()[name];
  if (!p) return;
  download(`${name}.json`, JSON.stringify(p, null, 2));
}

export function exportCurrent() {
  download('visualizer-preset.json', JSON.stringify(params, null, 2));
}

export function importPresetFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const p = JSON.parse(reader.result);
      Object.assign(params, p);
      savePreset(prompt('Preset name:', file.name.replace(/\.json$/, '')) || 'Imported');
      location.reload(); // simplest way to rebind all UI
    } catch (e) { alert('Invalid preset file'); }
  };
  reader.readAsText(file);
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
