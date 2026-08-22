import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import './styles.css';
import { AudioEngine } from './audio.js';
import { Analyzer } from './analyzer.js';
import { SCENES } from './scenes/index.js';
import { params, sceneParamsList, buildControl, buildPalettePicker, buildGradientEditor, controlsForGroup } from './controls.js';
import { PALETTES, sampleGradient, invalidatePaletteCache } from './palette.js';
import * as presets from './presets.js';
import { Recorder, screenshot } from './recorder.js';

// ---------- renderer ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
function applyQuality() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, params.quality));
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.012);
const camera = new THREE.PerspectiveCamera(params.fov, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 10, 40);

// ---------- post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.6, 0.1);
composer.addPass(bloomPass);
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uVignette: { value: 0.5 }, uChromatic: { value: 0.3 },
    uBrightness: { value: 1.5 }, uPixel: { value: 0 }, uScan: { value: 0 }, uGrain: { value: 0 },
    uMirror: { value: 0 }, uZoom: { value: 1 }, uTime: { value: 0 }, uFade: { value: 1 },
    uTransK: { value: 0 }, uTransType: { value: 0 }, uTransSeed: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignette, uChromatic, uBrightness, uPixel, uScan, uGrain, uMirror, uZoom, uTime, uFade;
    uniform float uTransK, uTransSeed;
    uniform int uTransType;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime * 13.0) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float k = uTransK;
      float pixel = uPixel;
      float chroma = uChromatic;

      // ---- transition geometry effects (applied before sampling) ----
      if (k > 0.001) {
        if (uTransType == 1) {
          // glitch: horizontal slice offsets + occasional row folding
          float row = floor(uv.y * (10.0 + uTransSeed * 26.0));
          float r = hash(vec2(row, uTransSeed * 100.0));
          uv.x += (r - 0.5) * k * k * 0.7;
          if (r > 1.0 - k * 0.4) uv.x = 1.0 - uv.x;
          chroma += k * 2.5;
        } else if (uTransType == 2) {
          // zoom spin: barrel toward camera while rotating
          vec2 c = uv - 0.5;
          float ang = k * k * 3.5 * (uTransSeed > 0.5 ? 1.0 : -1.0);
          float s = sin(ang), co = cos(ang);
          c = vec2(c.x * co - c.y * s, c.x * s + c.y * co);
          uv = c / max(0.001, 1.0 - k * k * 1.4) + 0.5;
        } else if (uTransType == 3) {
          // whip slide with motion shear
          float dir = uTransSeed > 0.5 ? 1.0 : -1.0;
          uv.x += dir * k * k * 1.6;
          uv.y += (hash(vec2(floor(uv.y * 30.0), uTransSeed)) - 0.5) * k * 0.15;
        } else if (uTransType == 4) {
          // pixel dissolve: chunky blocks take over
          pixel = max(pixel, k * k * 220.0);
          chroma += k * 1.2;
        } else if (uTransType == 8) {
          // rgb split explosion
          chroma += k * k * 14.0;
        }
      }

      // mirror: fold right half onto the left (symmetry effect)
      if (uMirror > 0.5) uv.x = min(uv.x, 1.0 - uv.x);
      // beat zoom (punch-in)
      uv = (uv - 0.5) / uZoom + 0.5;
      // pixelation
      if (pixel > 1.0) uv = (floor(uv * pixel) + 0.5) / pixel;
      vec2 d = (uv - 0.5) * chroma * 0.012;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d).b;

      // ---- transition color effects (applied after sampling) ----
      if (k > 0.001) {
        if (uTransType == 5) {
          // iris: visible circle collapses to a point (and re-expands after the switch)
          float R = 0.85 * (1.0 - k) + 0.03;
          col *= smoothstep(R, R - 0.05, length(vUv - 0.5) * 2.0);
        }
      }

      // scanlines
      if (uScan > 0.001) col *= 1.0 - uScan * 0.5 * step(0.5, fract(gl_FragCoord.y * 0.5));
      // film grain
      if (uGrain > 0.001) col += (hash(uv * 997.0) - 0.5) * uGrain * 0.35;
      col *= uBrightness * uFade;
      // flash guard: soft-knee limiter so stacked effects (bloom, strobe, brightness)
      // can never saturate large areas of the screen to pure white
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      if (luma > 1.2) col *= 1.2 / luma + (luma - 1.2) / luma * 0.15;
      float vig = 1.0 - uVignette * dot(vUv - 0.5, vUv - 0.5) * 2.2;
      gl_FragColor = vec4(col * vig, 1.0);
    }`,
};
const finalPass = new ShaderPass(FinalShader);
composer.addPass(finalPass);

// motion trails: fade previous frame toward the background color instead of clearing
renderer.setClearColor(params.background);
const fadeScene = new THREE.Scene();
const fadeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fadeMat = new THREE.MeshBasicMaterial({ color: params.background, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
fadeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMat));
const renderPass = composer.passes[0];
applyQuality();

// ---------- audio ----------
const audioEngine = new AudioEngine();
const analyzer = new Analyzer(() => audioEngine.analyser);

// palette color sampler with hue cycling + beat flash
let cycle = 0;
function colorAt(t) {
  const stops = params.palette === 'custom' ? params.customStops : PALETTES[params.palette] || PALETTES.aurora;
  const rgb = sampleGradient(stops, t, cycle);
  const flash = 1 + params.beatFlash * analyzer.beatIntensity * 0.8;
  return [rgb[0] * flash, rgb[1] * flash, rgb[2] * flash];
}

// ---------- scenes ----------
const sceneCtx = { scene, camera, colorAt, renderer };
let current = null;
let currentKey = null;
let sceneRebuildPending = false;

function setScene(key) {
  if (current) { current.dispose?.(); current = null; }
  currentKey = key;
  params.scene = key;
  current = SCENES[key].create(sceneCtx);
  current.rebuild?.(params);
  renderPanel(); // refresh scene params tab
}

function rebuildScene() { current?.rebuild?.(params); }

// on param changes that require geometry rebuild
function onParamChange(key) {
  if (['barCount', 'mirror', 'particleCount', 'gridRows', 'flowLines', 'ringCount', 'matrixSize', 'quality'].includes(key)) rebuildScene();
  if (key === 'fftSize') audioEngine.setFftSize(params.fftSize);
  if (key === 'smoothing') audioEngine.setSmoothing(params.smoothing);
  if (key === 'fov') { camera.fov = params.fov; camera.updateProjectionMatrix(); }
  if (key === 'fogDensity') { scene.fog.density = params.fogDensity; }
  if (key === 'background') { renderer.setClearColor(params.background); fadeMat.color.set(params.background); }
  if (key === 'quality') applyQuality();
}

// apply every param that needs a side effect (after loading a preset)
function applyAllSideEffects() {
  setScene(params.scene);
  camera.fov = params.fov; camera.updateProjectionMatrix();
  scene.fog.density = params.fogDensity;
  renderer.setClearColor(params.background);
  fadeMat.color.set(params.background);
  audioEngine.setFftSize(params.fftSize);
  audioEngine.setSmoothing(params.smoothing);
  renderPanel();
}

// ---------- control panel ----------
const panelBody = document.getElementById('panel-body');
let activeTab = 'scenes';

function renderPanel() {
  panelBody.innerHTML = '';
  if (activeTab === 'scenes') {
    const grid = document.createElement('div');
    grid.className = 'scene-grid';
    for (const [key, s] of Object.entries(SCENES)) {
      const b = document.createElement('button');
      b.className = 'scene-btn' + (key === currentKey ? ' active' : '');
      b.textContent = s.name;
      b.addEventListener('click', () => setScene(key));
      grid.appendChild(b);
    }
    panelBody.appendChild(grid);
    panelBody.appendChild(controlsForGroup('scene', sceneParamsList()[currentKey] || [], onParamChange));
  } else if (activeTab === 'audio') {
    panelBody.appendChild(controlsForGroup('audio', ['sensitivity', 'barCount', 'freqMapping', 'fftSize', 'smoothing', 'beatSensitivity', 'beatDecay'], onParamChange));
  } else if (activeTab === 'colors') {
    panelBody.appendChild(buildPalettePicker(() => renderPanel()));
    panelBody.appendChild(buildGradientEditor(() => { invalidatePaletteCache(); renderPanel(); }));
    panelBody.appendChild(controlsForGroup('colors', ['hueSpeed', 'beatFlash', 'glowStrength'], onParamChange));
  } else if (activeTab === 'auto') {
    panelBody.appendChild(controlsForGroup('auto', ['autoVJ', 'autoInterval', 'transitionTime', 'transitionStyle', 'syncBeats', 'autoChangePalette', 'autoChangeCamera', 'autoChangeFx'], onParamChange));
    panelBody.appendChild(controlsForGroup('perf', ['quality'], onParamChange));
  } else if (activeTab === 'camera') {
    panelBody.appendChild(controlsForGroup('camera', ['camMode', 'camDistance', 'camHeight', 'orbitSpeed', 'fov', 'beatShake'], onParamChange));
    panelBody.appendChild(controlsForGroup('atmos', ['brightness', 'background', 'trails', 'fogDensity', 'bloom', 'vignette', 'chromatic', 'strobe'], onParamChange));
    panelBody.appendChild(controlsForGroup('atmos2', ['pixelate', 'scanline', 'grain', 'mirrorX', 'beatZoom'], onParamChange));
  } else if (activeTab === 'presets') {
    renderPresetsTab();
  }
}

function renderPresetsTab() {
  // factory looks
  const ft = document.createElement('div');
  ft.className = 'ctl-group-title';
  ft.textContent = 'Built-in looks';
  panelBody.appendChild(ft);
  for (const name of Object.keys(presets.FACTORY)) {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `<span>${name}</span>`;
    const load = document.createElement('button');
    load.textContent = '📂'; load.title = 'Apply';
    load.addEventListener('click', () => {
      if (presets.applyFactory(name)) applyAllSideEffects();
    });
    item.appendChild(load);
    panelBody.appendChild(item);
  }

  const saveBtn = document.createElement('button');
  saveBtn.className = 'panel-btn';
  saveBtn.textContent = '💾 Save current settings as preset';
  saveBtn.addEventListener('click', () => {
    const name = prompt('Preset name:');
    if (name) { presets.savePreset(name); renderPanel(); }
  });
  panelBody.appendChild(saveBtn);

  const expBtn = document.createElement('button');
  expBtn.className = 'panel-btn secondary';
  expBtn.textContent = '⬇ Export current as JSON';
  expBtn.addEventListener('click', presets.exportCurrent);
  panelBody.appendChild(expBtn);

  const impBtn = document.createElement('button');
  impBtn.className = 'panel-btn secondary';
  impBtn.textContent = '⬆ Import preset JSON';
  impBtn.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => inp.files[0] && presets.importPresetFile(inp.files[0]);
    inp.click();
  });
  panelBody.appendChild(impBtn);

  const map = presets.listPresets();
  const names = Object.keys(map);
  const title = document.createElement('div');
  title.className = 'ctl-group-title';
  title.textContent = `Saved presets (${names.length})`;
  panelBody.appendChild(title);
  for (const name of names) {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `<span>${name}</span>`;
    const load = document.createElement('button'); load.textContent = '📂'; load.title = 'Load';
    load.addEventListener('click', () => {
      if (presets.applyPreset(name)) applyAllSideEffects();
    });
    const exp = document.createElement('button'); exp.textContent = '⬇'; exp.title = 'Export';
    exp.addEventListener('click', () => presets.exportPreset(name));
    const del = document.createElement('button'); del.textContent = '🗑'; del.title = 'Delete';
    del.addEventListener('click', () => { presets.deletePreset(name); renderPanel(); });
    item.append(load, exp, del);
    panelBody.appendChild(item);
  }
}

document.querySelectorAll('.panel-tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.panel-tabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    activeTab = b.dataset.tab;
    renderPanel();
  });
});

// ---------- transport / sources UI ----------
const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let lastUiUpdate = 0;
function refreshTransport() {
  // DOM writes are throttled — updating text nodes every frame causes layout churn
  const now = performance.now();
  if (now - lastUiUpdate < 250) return;
  lastUiUpdate = now;
  $('btn-play').textContent = audioEngine.isPlaying ? '⏸' : '▶';
  $('time-current').textContent = fmt(audioEngine.currentTime);
  $('time-total').textContent = fmt(audioEngine.duration);
  if (!seeking) $('seek').value = audioEngine.duration ? (audioEngine.currentTime / audioEngine.duration) * 1000 : 0;
  $('bpm-display').textContent = analyzer.bpm ? `${analyzer.bpm} BPM` : '-- BPM';
}
audioEngine.onStateChange = refreshTransport;
audioEngine.onTrackChange = () => {
  const t = audioEngine.playlist[audioEngine.index];
  $('now-playing').textContent = t ? `▶ ${t.name}${audioEngine.mode === 'mic' ? '' : ''}` : '';
  if (audioEngine.mode === 'mic') $('now-playing').textContent = '🎙 Microphone (live)';
  refreshPlaylist();
  refreshTransport();
};

$('btn-play').addEventListener('click', () => audioEngine.togglePlay());
$('btn-next').addEventListener('click', () => audioEngine.next());
$('btn-prev').addEventListener('click', () => audioEngine.prev());
let seeking = false;
$('seek').addEventListener('pointerdown', () => seeking = true);
$('seek').addEventListener('change', (e) => { audioEngine.seek(e.target.value / 1000); seeking = false; });
$('volume').addEventListener('input', (e) => {
  const v = e.target.value / 100;
  audioEngine.setVolume(v);
  $('volume-icon').textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
  $('volume-icon').classList.toggle('muted', v === 0);
});
// click the icon to mute/unmute
let lastVol = 0.8;
$('volume-icon').addEventListener('click', () => {
  const cur = audioEngine._volume;
  const next = cur > 0 ? 0 : (lastVol || 0.8);
  if (cur > 0) lastVol = cur;
  audioEngine.setVolume(next);
  $('volume').value = next * 100;
  $('volume').dispatchEvent(new Event('input'));
});

$('btn-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', (e) => audioEngine.addFiles([...e.target.files]));
$('btn-url').addEventListener('click', () => {
  const u = $('url-input').value.trim();
  if (u) audioEngine.loadUrl(u);
});
$('url-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-url').click(); });
$('btn-mic').addEventListener('click', async () => {
  if (audioEngine.mode === 'mic') audioEngine.stopMic();
  else { try { await audioEngine.startMic(); } catch { alert('Microphone access denied'); } }
  audioEngine.onTrackChange?.();
});

function refreshPlaylist() {
  const sel = $('playlist');
  sel.innerHTML = '';
  audioEngine.playlist.forEach((t, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = t.name;
    if (i === audioEngine.index) o.selected = true;
    sel.appendChild(o);
  });
}
$('playlist').addEventListener('change', (e) => audioEngine.playIndex(+e.target.value));

// drag & drop
let dragCount = 0;
addEventListener('dragenter', (e) => { e.preventDefault(); dragCount++; $('drop-overlay').classList.add('show'); });
addEventListener('dragleave', (e) => { e.preventDefault(); if (--dragCount <= 0) { dragCount = 0; $('drop-overlay').classList.remove('show'); } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => {
  e.preventDefault(); dragCount = 0; $('drop-overlay').classList.remove('show');
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(f.name));
  if (files.length) audioEngine.addFiles(files);
});

// ---------- recorder / screenshot / randomize / ui ----------
const recorder = new Recorder(canvas, () => audioEngine.mediaDest?.stream);
$('btn-record').addEventListener('click', () => {
  const on = recorder.toggle();
  $('btn-record').classList.toggle('recording', on);
  $('btn-record').title = on ? 'Stop recording (R)' : 'Record WebM (R)';
});
$('btn-screenshot').addEventListener('click', () => screenshot(renderer));
$('btn-fullscreen').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
$('btn-hide-ui').addEventListener('click', () => document.body.classList.toggle('ui-hidden'));

function randomize() {
  const paletteKeys = [...Object.keys(PALETTES), 'custom'];
  params.palette = paletteKeys[(Math.random() * paletteKeys.length) | 0];
  const sceneKeys = Object.keys(SCENES);
  params.spin = +(Math.random() * 1.4 - 0.7).toFixed(2);
  params.hueSpeed = +(Math.random() * 0.25).toFixed(2);
  params.beatFlash = +(Math.random() * 0.8).toFixed(2);
  params.orbitSpeed = +(Math.random() * 0.5).toFixed(2);
  if (Math.random() < 0.6) setScene(sceneKeys[(Math.random() * sceneKeys.length) | 0]);
  renderPanel();
}
$('btn-randomize').addEventListener('click', randomize);

// ---------- Auto VJ: automatic scene switching with styled transitions ----------
let autoTimer = 0;
let transition = null; // { t, switched, type, seed }
let pendingBeatSwitch = false;
let pendingBeatTimeout = 0;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const TRANSITION_TYPES = {
  fade: 0, glitch: 1, zoomspin: 2, slide: 3, pixeldissolve: 4,
  iris: 5, rgbsplit: 8,
};

function pickTransitionType() {
  if (params.transitionStyle !== 'random') return TRANSITION_TYPES[params.transitionStyle] ?? 0;
  // no full-screen white/noise blasts — they're flashbangs, not transitions.
  const weighted = ['glitch', 'glitch', 'zoomspin', 'zoomspin', 'slide', 'pixeldissolve',
    'iris', 'rgbsplit', 'rgbsplit', 'fade'];
  return TRANSITION_TYPES[pick(weighted)];
}

function autoVjSwitch() {
  const sceneKeys = Object.keys(SCENES).filter(k => k !== currentKey);
  setScene(pick(sceneKeys));
  if (params.autoChangePalette) {
    params.palette = pick([...Object.keys(PALETTES), 'custom']);
    invalidatePaletteCache();
  }
  // gentle option variety per transition
  params.spin = +(Math.random() * 1.2 - 0.6).toFixed(2);
  params.hueSpeed = +(Math.random() * 0.2).toFixed(2);
  params.orbitSpeed = +(Math.random() * 0.4).toFixed(2);
  if (params.autoChangeCamera && Math.random() < 0.35) {
    params.camMode = pick(['orbit', 'orbit', 'front', 'top']);
    params.camDistance = 30 + Math.random() * 40;
  }
  if (params.autoChangeFx) {
    params.trails = Math.random() < 0.3 ? +(Math.random() * 0.7).toFixed(2) : 0;
    params.mirrorX = Math.random() < 0.15;
    params.pixelate = Math.random() < 0.15 ? Math.floor(30 + Math.random() * 80) : 0;
    params.scanline = Math.random() < 0.2 ? +(Math.random() * 0.5).toFixed(2) : 0;
    params.beatZoom = Math.random() < 0.4 ? +(Math.random() * 0.6).toFixed(2) : 0;
  }
}

function updateAutoVJ(dt) {
  const u = finalPass.uniforms;
  if (transition) {
    transition.t += dt;
    const T = params.transitionTime;
    const half = T / 2;
    const t = transition.t;
    // eased intensity: ramps in, peaks at the switch, eases out
    let k;
    if (t < half) k = Math.pow(t / half, 2.2);
    else k = Math.pow(Math.max(0, 1 - (t - half) / half), 1.6);
    u.uTransK.value = k;
    u.uTransType.value = transition.type;
    u.uTransSeed.value = transition.seed;
    // classic fade uses the fade multiplier; everything else is shader FX
    u.uFade.value = transition.type === 0 ? Math.max(0.001, 1 - k) : 1;
    if (t >= half && !transition.switched) {
      transition.switched = true;
      autoVjSwitch();
      orbitAngle += Math.random() * Math.PI * 2; // whip the camera to a fresh angle
    }
    if (t >= T) {
      transition = null;
      u.uTransK.value = 0;
      u.uFade.value = 1;
    }
    return;
  }
  if (!params.autoVJ) return;
  autoTimer += dt;
  if (autoTimer >= params.autoInterval && !pendingBeatSwitch) {
    pendingBeatSwitch = true;
    pendingBeatTimeout = 2; // don't wait forever for a beat
  }
  if (pendingBeatSwitch) {
    pendingBeatTimeout -= dt;
    if (analyzer.beat || !params.syncBeats || pendingBeatTimeout <= 0) {
      pendingBeatSwitch = false;
      autoTimer = 0;
      transition = { t: 0, switched: false, type: pickTransitionType(), seed: Math.random() };
    }
  }
}

function setAutoVJ(on) {
  params.autoVJ = on;
  autoTimer = 0;
  pendingBeatSwitch = false;
  if (!on) {
    transition = null;
    finalPass.uniforms.uFade.value = 1;
    finalPass.uniforms.uTransK.value = 0;
  }
  $('btn-autovj').classList.toggle('active-btn', on);
  if (activeTab === 'auto') renderPanel();
}
$('btn-autovj').addEventListener('click', () => setAutoVJ(!params.autoVJ));

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  switch (e.key.toLowerCase()) {
    case ' ': e.preventDefault(); audioEngine.togglePlay(); break;
    case 'h': document.body.classList.toggle('ui-hidden'); break;
    case 'f': $('btn-fullscreen').click(); break;
    case 's': screenshot(renderer); break;
    case 'r': $('btn-record').click(); break;
    case 'x': randomize(); break;
    case 'a': setAutoVJ(!params.autoVJ); break;
    case 'arrowright': audioEngine.next(); break;
    case 'arrowleft': audioEngine.prev(); break;
  }
});

// ---------- render loop ----------
setScene('bars');
renderPanel();
refreshTransport();

const clock = new THREE.Clock();
const beatLight = $('beat-light');
analyzer.onBeat = () => { beatLight.classList.add('on'); setTimeout(() => beatLight.classList.remove('on'), 120); };

let orbitAngle = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  analyzer.update(dt, params);
  cycle = (cycle + dt * params.hueSpeed) % 1;
  updateAutoVJ(dt);

  // camera modes: auto-orbit / locked front / locked top (+ beat shake)
  const shake = params.beatShake * analyzer.beatIntensity;
  const dist = params.camDistance;
  if (params.camMode === 'orbit') {
    orbitAngle += dt * params.orbitSpeed;
    camera.position.set(
      Math.sin(orbitAngle) * dist + (Math.random() - 0.5) * shake * 2,
      params.camHeight + Math.sin(orbitAngle * 0.7) * 6 + (Math.random() - 0.5) * shake * 2,
      Math.cos(orbitAngle) * dist + (Math.random() - 0.5) * shake * 2,
    );
    camera.lookAt(0, 0, 0);
  } else if (params.camMode === 'front') {
    camera.position.set(0, 0, dist + (Math.random() - 0.5) * shake * 2);
    camera.lookAt(0, 0, 0);
  } else if (params.camMode === 'top') {
    camera.position.set(0, dist + (Math.random() - 0.5) * shake * 2, 0.01);
    camera.lookAt(0, 0, 0);
  }

  current?.update(dt, analyzer, params);

  // trails: fade previous frame toward background instead of full clear
  if (params.trails > 0.01) {
    renderPass.clear = false;
    fadeMat.opacity = 1 - params.trails;
    renderer.autoClear = false;
    renderer.render(fadeScene, fadeCam);
  } else {
    renderPass.clear = true;
    renderer.autoClear = true;
  }

  const strobeBoost = params.strobe * analyzer.beatIntensity * 3;
  bloomPass.strength = params.bloom * (0.6 + analyzer.bass * 0.4) + strobeBoost;
  const u = finalPass.uniforms;
  u.uVignette.value = params.vignette;
  u.uChromatic.value = params.chromatic * (1 + analyzer.beatIntensity);
  u.uBrightness.value = params.brightness;
  u.uPixel.value = params.pixelate;
  u.uScan.value = params.scanline;
  u.uGrain.value = params.grain;
  u.uMirror.value = params.mirrorX ? 1 : 0;
  u.uZoom.value = 1 + params.beatZoom * analyzer.beatIntensity * 0.18;
  u.uTime.value = analyzer.time;

  composer.render();
  refreshTransport();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
