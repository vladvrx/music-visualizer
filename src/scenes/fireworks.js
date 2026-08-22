// Scene: fireworks — bursts explode on detected beats and strong treble.
import * as THREE from 'three';

export default {
  name: 'Fireworks',
  create({ scene, colorAt }) {
    const MAX = 2600;
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const vel = new Float32Array(MAX * 3);
    const life = new Float32Array(MAX); // 1 → 0
    const drag = new Float32Array(MAX);
    const base = new Float32Array(MAX * 3); // base color
    let cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const group = new THREE.Group();
    group.add(new THREE.Points(geo, mat));
    scene.add(group);

    function burst(cx, cy, cz, power, paletteT) {
      const n = 90 + Math.floor(power * 130);
        const c = colorAt(paletteT + Math.random() * 0.06);
        const c2 = Math.random() < 0.3 ? colorAt(paletteT + 0.5) : c;
        for (let j = 0; j < n; j++) {
          const i = cursor; cursor = (cursor + 1) % MAX;
          // random direction on a sphere
          const u = Math.random() * 2 - 1;
          const a = Math.random() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          const sp = (5 + Math.random() * 11) * power;
          vel[i * 3] = Math.cos(a) * s * sp;
          vel[i * 3 + 1] = u * sp + 3; // slight upward bias
          vel[i * 3 + 2] = Math.sin(a) * s * sp;
          positions[i * 3] = cx; positions[i * 3 + 1] = cy; positions[i * 3 + 2] = cz;
          life[i] = 1;
          drag[i] = 0.4 + Math.random() * 0.5;
          const cc = Math.random() < 0.5 ? c : c2;
          base[i * 3] = cc[0]; base[i * 3 + 1] = cc[1]; base[i * 3 + 2] = cc[2];
        }
    }

    let t = 0;
    return {
      update(dt, audio, params) {
        t += dt;
        if (audio.beat) burst((Math.random() - 0.5) * 50, 2 + Math.random() * 20, (Math.random() - 0.5) * 40, 0.7 + audio.bass * params.reactBass, Math.random());
        if (audio.treble > 0.3 && Math.random() < audio.treble * 0.25 * params.reactTreble) burst((Math.random() - 0.5) * 60, Math.random() * 25, (Math.random() - 0.5) * 50, 0.35, Math.random());
        if (Math.random() < dt * 0.15) burst((Math.random() - 0.5) * 50, 5 + Math.random() * 15, (Math.random() - 0.5) * 40, 0.5, Math.random()); // ambient

        const g = 9.8;
        for (let i = 0; i < MAX; i++) {
          if (life[i] <= 0) { colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0; continue; }
          life[i] -= dt * 0.55;
          const d = Math.exp(-dt * drag[i] * 3);
          vel[i * 3] *= d; vel[i * 3 + 2] *= d;
          vel[i * 3 + 1] = vel[i * 3 + 1] * d - g * dt;
          positions[i * 3] += vel[i * 3] * dt;
          positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
          positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
          const L = Math.max(0, life[i]);
          const flick = 0.75 + 0.25 * Math.sin(t * 30 + i);
          colors[i * 3] = base[i * 3] * L * flick;
          colors[i * 3 + 1] = base[i * 3 + 1] * L * flick;
          colors[i * 3 + 2] = base[i * 3 + 2] * L * flick;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.4 + audio.beatIntensity * 0.35;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
