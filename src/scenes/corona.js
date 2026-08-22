// Scene: Corona — fullscreen shader sun with flares that breathe with the music.
const FRAG = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= 1.6;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float t = uTime * 0.15;

  // turbulent corona ring
  float wob = fbm(vec2(a * 3.0 + t, r * 2.0 - t)) * (0.55 + uBass * 1.2 + uBeat * 0.5);
  float core = 0.34 + wob * 0.22;
  // flares streaking outward on treble
  float flare = pow(abs(sin(a * 9.0 + t * 2.0)), 6.0) * (0.12 + uTreble * 0.9);
  float disk = smoothstep(core + flare + 0.28, core * 0.6, r);
  float glow = exp(-max(0.0, r - core) * (4.5 - uMid * 2.2));

  vec3 col = mix(uColA, uColB, clamp(wob * 1.6, 0.0, 1.0));
  col = mix(col, uColC, disk * (0.55 + uBeat * 0.35));
  col *= disk * 1.25 + glow * 0.75;
  col += uColA * glow * (0.2 + uBeat * 0.4);
  // surface texture inside the disk
  float surf = fbm(uv * 5.0 + vec2(t, -t * 0.6));
  col *= 0.75 + surf * 0.6;
  float vig = smoothstep(2.2, 0.4, r);
  gl_FragColor = vec4(col * vig, 1.0);
}`;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`;

import * as THREE from 'three';

export default {
  name: 'Corona',
  create({ scene, colorAt }) {
    const uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 }, uBeat: { value: 0 },
      uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uColC: { value: new THREE.Color() },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthWrite: false, depthTest: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    quad.renderOrder = -1;
    scene.add(quad);

    return {
      update(dt, audio, params) {
        uniforms.uTime.value += dt;
        uniforms.uBass.value = audio.bass * params.reactBass;
        uniforms.uMid.value = audio.mid * params.reactMid;
        uniforms.uTreble.value = audio.treble * params.reactTreble;
        uniforms.uBeat.value = audio.beatIntensity * params.beatFlash;
        const a = colorAt(0.9), b = colorAt(0.55), c = colorAt(0.12);
        uniforms.uColA.value.setRGB(a[0], a[1], a[2]);
        uniforms.uColB.value.setRGB(b[0], b[1], b[2]);
        uniforms.uColC.value.setRGB(c[0], c[1], c[2]);
      },
      dispose() { quad.removeFromParent(); },
    };
  },
};
