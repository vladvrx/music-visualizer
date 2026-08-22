// Scene: audio-reactive GPU fluid simulation (Stam stable fluids on WebGL).
// Music drives dye/velocity splats: bass = big plumes, treble = fine spray,
// beats = radial bursts. Solver: advect -> vorticity -> divergence -> pressure -> subtract.
//
// Perf notes: splats are batched (up to 16 per GPU pass), solver resolution and
// pressure iterations scale with the global quality setting, and render targets
// are only rebound when the target actually changes.
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const HEADER = `precision highp float; varying vec2 vUv; `;

const SHADERS = {
  clear: HEADER + `uniform sampler2D uTex; uniform float uValue; void main(){ gl_FragColor = uValue * texture2D(uTex, vUv); }`,
  splatBatch: HEADER + `
    uniform sampler2D uTex; uniform float uAspect; uniform int uCount;
    uniform vec2 uPoints[16]; uniform vec3 uValues[16]; uniform float uRadius;
    void main(){
      vec4 acc = texture2D(uTex, vUv);
      for (int i = 0; i < 16; i++) {
        if (i >= uCount) break;
        vec2 d = vUv - uPoints[i]; d.x *= uAspect;
        float g = exp(-dot(d, d) / uRadius);
        acc.xyz += uValues[i] * g;
      }
      gl_FragColor = acc;
    }`,
  advection: HEADER + `
    uniform sampler2D uVelocity, uSource; uniform vec2 uTexel;
    uniform float uDt, uDissipation;
    void main(){
      vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
      gl_FragColor = uDissipation * texture2D(uSource, coord);
      gl_FragColor.a = 1.0;
    }`,
  divergence: HEADER + `
    uniform sampler2D uVelocity; uniform vec2 uTexel;
    void main(){
      float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
      float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
      float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
      gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
    }`,
  curl: HEADER + `
    uniform sampler2D uVelocity; uniform vec2 uTexel;
    void main(){
      float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
      float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
      float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
      float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
      gl_FragColor = vec4(0.5 * (r - l - (t - b)), 0.0, 0.0, 1.0);
    }`,
  vorticity: HEADER + `
    uniform sampler2D uVelocity, uCurl; uniform vec2 uTexel; uniform float uCurlStrength, uDt;
    void main(){
      float l = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
      float r = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
      float t = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
      float c = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(t - b, -(r - l)) + 1e-4;
      force *= uCurlStrength * c / length(force) * uDt;
      vec2 v = texture2D(uVelocity, vUv).xy + force;
      gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
    }`,
  pressure: HEADER + `
    uniform sampler2D uPressure, uDivergence; uniform vec2 uTexel;
    void main(){
      float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
    }`,
  gradientSubtract: HEADER + `
    uniform sampler2D uPressure, uVelocity; uniform vec2 uTexel;
    void main(){
      float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      vec2 v = texture2D(uVelocity, vUv).xy - vec2(r - l, t - b);
      gl_FragColor = vec4(v, 0.0, 1.0);
    }`,
  display: HEADER + `
    uniform sampler2D uDye;
    void main(){
      vec3 c = texture2D(uDye, vUv).rgb;
      float dx = length(texture2D(uDye, vUv + vec2(0.004, 0.0)).rgb) - length(texture2D(uDye, vUv - vec2(0.004, 0.0)).rgb);
      float dy = length(texture2D(uDye, vUv + vec2(0.0, 0.004)).rgb) - length(texture2D(uDye, vUv - vec2(0.0, 0.004)).rgb);
      c *= 1.0 + (dx + dy) * -2.0;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

function makeTarget(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: false,
  });
}

function makeDouble(w, h) {
  return { front: makeTarget(w, h), back: makeTarget(w, h), swap() { const t = this.front; this.front = this.back; this.back = t; } };
}

function qualityProfile(q) {
  if (q <= 0.5) return { SIM: 96, DYE: 256, ITERS: 10 };
  if (q <= 0.75) return { SIM: 128, DYE: 384, ITERS: 16 };
  return { SIM: 160, DYE: 512, ITERS: 24 };
}

export default {
  name: 'Fluid',
  create({ scene, renderer, colorAt }) {
    let prof = qualityProfile(1);
    let velocity = makeDouble(prof.SIM, prof.SIM);
    let dye = makeDouble(prof.DYE, prof.DYE);
    let pressure = makeDouble(prof.SIM, prof.SIM);
    let divergence = makeTarget(prof.SIM, prof.SIM);
    let curlTex = makeTarget(prof.SIM, prof.SIM);

    const quadScene = new THREE.Scene();
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quadScene.add(quad);

    const materials = {};
    for (const [name, frag] of Object.entries(SHADERS)) {
      const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
      if (name === 'splatBatch') {
        m.uniforms.uPoints = { value: Array.from({ length: 16 }, () => new THREE.Vector2()) };
        m.uniforms.uValues = { value: Array.from({ length: 16 }, () => new THREE.Vector3()) };
        m.uniforms.uCount = { value: 0 };
        m.uniforms.uRadius = { value: 0.0016 };
        m.uniforms.uAspect = { value: 1 };
        m.uniforms.uTex = { value: null };
      }
      materials[name] = m;
    }

    let boundTarget = undefined; // undefined = unknown, null = canvas
    function run(mat, uniforms, target) {
      quad.material = mat;
      for (const [k, v] of Object.entries(uniforms || {})) {
        if (!mat.uniforms[k]) mat.uniforms[k] = { value: null };
        mat.uniforms[k].value = v;
      }
      if (boundTarget !== target) {
        renderer.setRenderTarget(target);
        boundTarget = target;
      }
      renderer.render(quadScene, quadCam);
    }
    function unbind() {
      if (boundTarget !== null) {
        renderer.setRenderTarget(null);
        boundTarget = null;
      }
    }

    // batched splats: collected during emission, flushed as 2 GPU passes per 16
    const splatQueue = [];
    function queueSplat(x, y, dx, dy, c) {
      splatQueue.push({ x, y, dx, dy, c });
      if (splatQueue.length >= 64) flushSplats();
    }
    function flushSplats() {
      const m = materials.splatBatch;
      m.uniforms.uAspect.value = innerWidth / innerHeight;
      const pts = m.uniforms.uPoints.value, vals = m.uniforms.uValues.value;
      for (let off = 0; off < splatQueue.length; off += 16) {
        const n = Math.min(16, splatQueue.length - off);
        for (let i = 0; i < n; i++) {
          const s = splatQueue[off + i];
          pts[i].set(s.x, s.y);
          vals[i].set(s.dx, s.dy, 0);
        }
        m.uniforms.uCount.value = n;
        run(m, { uTex: velocity.front.texture }, velocity.back);
        velocity.swap();
        for (let i = 0; i < n; i++) {
          const s = splatQueue[off + i];
          vals[i].set(s.c[0], s.c[1], s.c[2]);
        }
        run(m, { uTex: dye.front.texture }, dye.back);
        dye.swap();
      }
      splatQueue.length = 0;
    }

    // display quad lives in the main scene so bloom/transitions still apply.
    // Raw NDC fullscreen shader (like the other fullscreen scenes) so it ignores
    // the 3D camera and fog and always covers the screen.
    const displayMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SHADERS.display, depthTest: false, depthWrite: false,
      uniforms: { uDye: { value: null } },
    });
    const displayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat);
    displayQuad.frustumCulled = false;
    displayQuad.renderOrder = -1;
    scene.add(displayQuad);

    let idleT = 0;

    function emitAudio(audio, params) {
      const amt = params.fluidAmount;
      if (audio.bass > 0.05 && Math.random() < audio.bass * amt * 0.9) {
        const x = 0.15 + Math.random() * 0.7;
        const c = colorAt(Math.random());
        const br = (0.4 + audio.bass) * amt * 0.8;
        queueSplat(x, 0.05 + Math.random() * 0.1, (Math.random() - 0.5) * 60, 120 + audio.bass * 400 * amt, [c[0] * br, c[1] * br, c[2] * br]);
      }
      if (audio.treble > 0.08 && Math.random() < audio.treble * amt * 1.4) {
        const x = Math.random(), y = Math.random();
        const c = colorAt(Math.random());
        const br = audio.treble * amt * 0.7;
        queueSplat(x, y, (Math.random() - 0.5) * 300 * amt, (Math.random() - 0.5) * 300 * amt, [c[0] * br, c[1] * br, c[2] * br]);
      }
      if (audio.mid > 0.1 && Math.random() < audio.mid * amt * 0.6) {
        const y = Math.random();
        const c = colorAt(Math.random());
        const br = audio.mid * amt * 0.5;
        queueSplat(Math.random() < 0.5 ? 0.02 : 0.98, y, (Math.random() < 0.5 ? 1 : -1) * (150 + audio.mid * 300) * amt, (Math.random() - 0.5) * 100, [c[0] * br, c[1] * br, c[2] * br]);
      }
      if (audio.beat) {
        const cx = 0.3 + Math.random() * 0.4, cy = 0.3 + Math.random() * 0.4;
        const n = 5 + Math.floor(Math.random() * 4);
        const baseA = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = baseA + (i / n) * Math.PI * 2;
          const c = colorAt(i / n);
          const br = (0.5 + audio.energy) * amt * 0.6;
          queueSplat(cx, cy, Math.cos(a) * 500 * amt, Math.sin(a) * 500 * amt, [c[0] * br, c[1] * br, c[2] * br]);
        }
      }
    }

    return {
      rebuild(p) {
        const np = qualityProfile(p.quality ?? 1);
        if (np.SIM === prof.SIM && np.DYE === prof.DYE) return;
        prof = np;
        for (const d of [velocity, dye, pressure]) { d.front.dispose(); d.back.dispose(); }
        divergence.dispose(); curlTex.dispose();
        velocity = makeDouble(prof.SIM, prof.SIM);
        dye = makeDouble(prof.DYE, prof.DYE);
        pressure = makeDouble(prof.SIM, prof.SIM);
        divergence = makeTarget(prof.SIM, prof.SIM);
        curlTex = makeTarget(prof.SIM, prof.SIM);
        boundTarget = undefined;
      },
      update(dt, audio, params) {
        dt = Math.min(dt, 0.033);
        idleT += dt;
        if (Math.random() < dt * 2.2) {
          const c = colorAt((idleT * 0.05) % 1);
          queueSplat(Math.random(), Math.random(), (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, [c[0] * 0.25, c[1] * 0.25, c[2] * 0.25]);
        }
        emitAudio(audio, params);
        flushSplats();

        const texel = [1 / prof.SIM, 1 / prof.SIM];
        run(materials.curl, { uVelocity: velocity.front.texture, uTexel: texel }, curlTex);
        run(materials.vorticity, { uVelocity: velocity.front.texture, uCurl: curlTex.texture, uTexel: texel, uCurlStrength: params.fluidSwirl, uDt: dt }, velocity.back);
        velocity.swap();

        run(materials.divergence, { uVelocity: velocity.front.texture, uTexel: texel }, divergence);
        run(materials.clear, { uTex: pressure.front.texture, uValue: 0.8 }, pressure.back);
        pressure.swap();
        for (let i = 0; i < prof.ITERS; i++) {
          run(materials.pressure, { uPressure: pressure.front.texture, uDivergence: divergence.texture, uTexel: texel }, pressure.back);
          pressure.swap();
        }
        run(materials.gradientSubtract, { uPressure: pressure.front.texture, uVelocity: velocity.front.texture, uTexel: texel }, velocity.back);
        velocity.swap();

        const velDiss = 1 / (1 + dt * 0.22);
        const dyeDiss = 1 / (1 + dt * params.fluidDissipation);
        run(materials.advection, { uVelocity: velocity.front.texture, uSource: velocity.front.texture, uTexel: texel, uDt: dt, uDissipation: velDiss }, velocity.back);
        velocity.swap();
        run(materials.advection, { uVelocity: velocity.front.texture, uSource: dye.front.texture, uTexel: [1 / prof.DYE, 1 / prof.DYE], uDt: dt, uDissipation: dyeDiss }, dye.back);
        dye.swap();

        unbind();
        displayMat.uniforms.uDye.value = dye.front.texture;
      },
      dispose() {
        displayQuad.removeFromParent();
        for (const d of [velocity, dye, pressure]) { d.front.dispose(); d.back.dispose(); }
        divergence.dispose(); curlTex.dispose();
      },
    };
  },
};
