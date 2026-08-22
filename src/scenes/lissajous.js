// Scene: 3D Lissajous oscilloscope traced by the waveform, with a glowing trail.
import * as THREE from 'three';

export default {
  name: 'Lissajous',
  create({ scene, colorAt }) {
    const TRAIL = 600;
    const positions = new Float32Array(TRAIL * 3);
    const colors = new Float32Array(TRAIL * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);

    let head = 0;
    let filled = 0;
    let t = 0;

    return {
      update(dt, audio, params) {
        t += dt * (1.5 + params.flowTime * 2 + audio.mid * 2);
        const wave = audio.wave;
        const amp = 8 + audio.energy * 18;
        // frequencies drift with bass so the figure morphs
        const fa = 3 + Math.floor(audio.bass * 3);
        const fb = 4;
        const fc = 2 + Math.floor(audio.treble * 4);
        const u = t;
        const x = Math.sin(fa * u + Math.sin(t * 0.7) * 2) * amp * (0.7 + audio.bass * params.reactBass);
        const y = Math.sin(fb * u + wave[Math.floor(u * 37) % wave.length] / 128 * 3) * amp * 0.8;
        const z = Math.sin(fc * u * 0.7 + t * 0.5) * amp * 0.9;
        positions[head * 3] = x; positions[head * 3 + 1] = y; positions[head * 3 + 2] = z;
        const rgb = colorAt((t * 0.03) % 1);
        const br = 0.6 + audio.energy * 1.2 + audio.beatIntensity * 0.6;
        colors[head * 3] = rgb[0] * br; colors[head * 3 + 1] = rgb[1] * br; colors[head * 3 + 2] = rgb[2] * br;
        head = (head + 1) % TRAIL;
        filled = Math.min(filled + 1, TRAIL);
        // trail slowly fades so old paths dim away
        for (let i = 0; i < TRAIL; i++) {
          colors[i * 3] *= 0.995; colors[i * 3 + 1] *= 0.995; colors[i * 3 + 2] *= 0.995;
        }
        geo.setDrawRange(0, filled);
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.35 + audio.beatIntensity * 0.4;
        group.rotation.y += dt * params.spin * 0.4;
        group.rotation.x = Math.sin(t * 0.1) * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
