// Scene: fullscreen shader nebula/cloud (fbm noise) reacting to bass/mid.
import * as THREE from 'three';

const FRAG = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform float uDensity;
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= 1.6;
  float t = uTime * 0.08;
  float bassWarp = uBass * 0.9 + uBeat * 0.4;
  vec2 q = vec2(fbm(uv * 2.0 + t), fbm(uv * 2.0 - t * 1.3));
  vec2 r = vec2(fbm(uv * (2.5 + bassWarp * 2.0) + q * (1.5 + uMid * 2.0) + vec2(1.7, 9.2) + t * 0.6),
                fbm(uv * (2.5 + bassWarp * 2.0) + q * (1.5 + uMid * 2.0) + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(uv * (2.0 + uDensity) + r * (2.0 + bassWarp * 3.0));
  f = pow(f, 1.4);
  vec3 col = mix(vec3(0.01, 0.01, 0.03), uColA, clamp(f * f * 2.2, 0.0, 1.0));
  col = mix(col, uColB, clamp(length(q) * 0.7 * (0.4 + uMid), 0.0, 1.0));
  col = mix(col, uColC, clamp(r.x * r.x * (0.5 + uTreble * 1.5), 0.0, 1.0));
  col += uColC * uBeat * 0.25;
  float vig = 1.0 - dot(uv * 0.55, uv * 0.55);
  gl_FragColor = vec4(col * vig, 1.0);
}`;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`;

export default {
  name: 'Nebula',
  create({ scene, colorAt }) {
    const uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 },
      uBeat: { value: 0 },
      uDensity: { value: 1 },
      uColA: { value: new THREE.Color() },
      uColB: { value: new THREE.Color() },
      uColC: { value: new THREE.Color() },
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
        uniforms.uDensity.value = params.nebulaDensity;
        const a = colorAt(0.15), b = colorAt(0.55), c = colorAt(0.9);
        uniforms.uColA.value.setRGB(a[0], a[1], a[2]);
        uniforms.uColB.value.setRGB(b[0], b[1], b[2]);
        uniforms.uColC.value.setRGB(c[0], c[1], c[2]);
      },
      dispose() { quad.removeFromParent(); },
    };
  },
};
