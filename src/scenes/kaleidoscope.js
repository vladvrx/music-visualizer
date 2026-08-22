// Scene: kaleidoscopic shader pattern pulsing on beats.
import * as THREE from 'three';

const FRAG = `
uniform float uTime;
uniform float uBass;
uniform float uTreble;
uniform float uBeat;
uniform float uSlices;
uniform vec3 uColA;
uniform vec3 uColB;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

void main(){
  vec2 uv = vUv * 2.0 - 1.0;
  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float slice = 3.14159265 * 2.0 / uSlices;
  float a = mod(ang, slice) / slice;          // 0..1 within slice
  a = abs(a * 2.0 - 1.0);                     // mirror within slice
  float t = uTime * (0.15 + uBass * 0.3) + uBeat * 0.4;
  vec2 p = vec2(a * (3.0 + uTreble * 3.0), len * (4.0 + uBass * 4.0) - t);
  float n = noise(p * 3.0) * 0.6 + noise(p * 7.0) * 0.3 + noise(p * 15.0) * 0.1;
  float rings = sin(len * (20.0 + uBass * 40.0) - t * 6.0) * 0.5 + 0.5;
  float v = n * rings * (0.5 + uBeat * 0.8);
  vec3 col = mix(uColA, uColB, clamp(v, 0.0, 1.0));
  col *= 0.25 + v * 1.5;
  col += uColB * uBeat * 0.3;
  float vig = smoothstep(1.4, 0.3, len);
  gl_FragColor = vec4(col * vig, 1.0);
}`;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`;

export default {
  name: 'Kaleidoscope',
  create({ scene, colorAt }) {
    const uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uTreble: { value: 0 }, uBeat: { value: 0 },
      uSlices: { value: 8 },
      uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthWrite: false, depthTest: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    quad.renderOrder = -1;
    scene.add(quad);

    return {
      update(dt, audio, params) {
        uniforms.uTime.value += dt;
        uniforms.uBass.value = audio.bass;
        uniforms.uTreble.value = audio.treble * params.reactTreble;
        uniforms.uBeat.value = audio.beatIntensity * params.beatFlash;
        uniforms.uSlices.value = params.kaleidoSlices;
        const a = colorAt(0.2), b = colorAt(0.85);
        uniforms.uColA.value.setRGB(a[0], a[1], a[2]);
        uniforms.uColB.value.setRGB(b[0], b[1], b[2]);
      },
      dispose() { quad.removeFromParent(); },
    };
  },
};
