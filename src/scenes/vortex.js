// Scene: top-down galaxy vortex — spiral arms of particles spinning inward.
import * as THREE from 'three';

export default {
  name: 'Vortex',
  create({ scene, colorAt }) {
    const COUNT = 5000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const r0 = new Float32Array(COUNT);
    const a0 = new Float32Array(COUNT);
    const arm = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      r0[i] = 3 + Math.pow(Math.random(), 0.7) * 34;
      a0[i] = Math.random() * Math.PI * 2;
      arm[i] = Math.floor(Math.random() * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const group = new THREE.Group();
    group.add(new THREE.Points(geo, mat));
    group.rotation.x = -Math.PI / 2 + 0.25; // mostly top-down with a tilt
    scene.add(group);

    let t = 0;
    return {
      update(dt, audio, params) {
        t += dt;
        const spinRate = 0.25 + audio.energy * 1.2 * params.reactBass;
        for (let i = 0; i < COUNT; i++) {
          // spiral inflow: radius shrinks, angle advances faster when closer
          r0[i] -= dt * (1.5 + audio.bass * 6 * params.reactBass) * (1 - r0[i] / 44);
          if (r0[i] < 1.5) { r0[i] = 34 + Math.random() * 3; a0[i] = Math.random() * Math.PI * 2; }
          const a = a0[i] + t * spinRate * (16 / r0[i]) + arm[i] * (Math.PI * 2 / 3);
          const v = audio.spectrum[Math.floor((r0[i] / 37) * audio.spectrum.length)] || 0;
          const r = r0[i] * (1 + v * 0.18);
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4 + v * 2 + audio.beatIntensity * 1.2;
          positions[i * 3 + 2] = Math.sin(a) * r;
          const rgb = colorAt((r0[i] / 37 + t * 0.02) % 1);
          const br = (0.3 + v * 1.5) * (1.15 - r0[i] / 44) + audio.beatIntensity * 0.25;
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.25 + audio.treble * 0.35 * params.reactTreble;
        group.rotation.z += dt * params.spin * 0.1;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
