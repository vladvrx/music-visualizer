// Scene: rising smoke plumes — soft sprites born on beats, buoyant and swirling.
import * as THREE from 'three';

function makeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export default {
  name: 'Smoke',
  create({ scene, colorAt }) {
    const MAX = 320;
    const tex = makeSprite();
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const sizes = new Float32Array(MAX);
    const vel = new Float32Array(MAX * 3);
    const life = new Float32Array(MAX);
    const grow = new Float32Array(MAX);
    const base = new Float32Array(MAX * 3);
    let cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({ size: 6, map: tex, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const group = new THREE.Group();
    group.add(new THREE.Points(geo, mat));
    scene.add(group);

    function puff(x, z, power, paletteT) {
      const n = 3 + Math.floor(power * 6);
      for (let j = 0; j < n; j++) {
        const i = cursor; cursor = (cursor + 1) % MAX;
        positions[i * 3] = x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = -14 + Math.random() * 2;
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * 2;
        vel[i * 3] = (Math.random() - 0.5) * 2;
        vel[i * 3 + 1] = 3.5 + Math.random() * 4 * power;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 2;
        life[i] = 1;
        grow[i] = 2.2 + Math.random() * 2.5;
        sizes[i] = 3 + Math.random() * 3;
        const c = colorAt(paletteT + Math.random() * 0.12);
        base[i * 3] = c[0]; base[i * 3 + 1] = c[1]; base[i * 3 + 2] = c[2];
      }
    }

    let t = 0;
    return {
      update(dt, audio, params) {
        t += dt;
        if (audio.beat) puff((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, 0.7 + audio.bass * params.reactBass, Math.random());
        if (audio.mid > 0.15 && Math.random() < audio.mid * 0.5 * params.reactMid) puff((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 40, 0.35, Math.random());
        if (Math.random() < dt * 1.4) puff((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 35, 0.4, Math.random());

        for (let i = 0; i < MAX; i++) {
          if (life[i] <= 0) { colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0; sizes[i] = 0; continue; }
          life[i] -= dt * 0.28;
          // buoyancy slows, sideways curl drifts
          vel[i * 3 + 1] *= Math.exp(-dt * 0.35);
          vel[i * 3] += Math.sin(t * 0.6 + i) * dt * 1.5;
          vel[i * 3 + 2] += Math.cos(t * 0.5 + i * 1.3) * dt * 1.5;
          positions[i * 3] += vel[i * 3] * dt;
          positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
          positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
          sizes[i] += grow[i] * dt;
          const L = Math.max(0, life[i]);
          const br = L * L * (0.5 + audio.energy * 0.6);
          colors[i * 3] = base[i * 3] * br;
          colors[i * 3 + 1] = base[i * 3 + 1] * br;
          colors[i * 3 + 2] = base[i * 3 + 2] * br;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        geo.attributes.size.needsUpdate = true;
      },
      dispose() { group.removeFromParent(); tex.dispose(); },
    };
  },
};
