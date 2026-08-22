// Scene: gyroscope — nested spinning torus rings, each driven by a frequency band.
import * as THREE from 'three';

export default {
  name: 'Gyroscope',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const RINGS = 5;
    const rings = [];
    for (let i = 0; i < RINGS; i++) {
      const r = 4 + i * 2.6;
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.16, 10, 96),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      mesh.userData.i = i;
      rings.push(mesh);
      group.add(mesh);
    }
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.2, 2),
      new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.85 })
    );
    group.add(core);

    return {
      update(dt, audio, params) {
        const bands = [audio.bass, audio.bass * 0.5 + audio.mid * 0.5, audio.mid, audio.mid * 0.5 + audio.treble * 0.5, audio.treble];
        for (const ring of rings) {
          const i = ring.userData.i;
          const v = bands[i];
          ring.rotation.x += dt * (0.3 + i * 0.17 + v * 1.5) * (i % 2 ? -1 : 1);
          ring.rotation.y += dt * (0.4 + i * 0.11 + audio.energy);
          ring.scale.setScalar(1 + v * 0.35 * params.reactBass + audio.beatIntensity * 0.12);
          const rgb = colorAt(i / RINGS);
          const br = 0.45 + v * 1.3;
          ring.material.color.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
        }
        core.rotation.x += dt * 0.7;
        core.rotation.y += dt * 0.5;
        const cr = 1 + audio.bass * 0.8 * params.reactBass + audio.beatIntensity * 0.5;
        core.scale.setScalar(cr);
        const crgb = colorAt((audio.time * 0.1) % 1);
        core.material.color.setRGB(crgb[0], crgb[1], crgb[2]);
        group.rotation.y += dt * params.spin * 0.3;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
