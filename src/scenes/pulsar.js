// Scene: pulsar/black hole — spinning accretion disk spiraling into a glowing core.
import * as THREE from 'three';

export default {
  name: 'Pulsar',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const COUNT = 3000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    // fixed orbit parameters per particle
    const radii = new Float32Array(COUNT);
    const angs = new Float32Array(COUNT);
    const yOff = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      radii[i] = 2 + Math.pow(Math.random(), 0.6) * 30;
      angs[i] = Math.random() * Math.PI * 2;
      yOff[i] = (Math.random() - 0.5) * (1.5 - radii[i] / 40) * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.Points(geo, mat));

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    group.add(core);

    let t = 0;
    return {
      update(dt, audio, params) {
        t += dt;
        const pull = 1 + audio.bass * 2.5 * params.reactBass;
        for (let i = 0; i < COUNT; i++) {
          const r0 = radii[i];
          // inner particles orbit faster (keplerian-ish) and spiral slowly inward, recycling outward
          let r = r0 - t * 0.8 * pull * (1 - r0 / 40);
          if (r < 1.8) { r = 32; radii[i] = 32 + Math.random() * 4; angs[i] = Math.random() * Math.PI * 2; continue; }
          const speed = (14 / r) * (1 + audio.energy * 1.5);
          const a = angs[i] + t * speed;
          const v = audio.spectrum[Math.floor((r0 / 34) * audio.spectrum.length)] || 0;
          const y = yOff[i] * (1 + v * 3) + Math.sin(a * 3 + t * 2) * 0.3;
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(a) * r;
          const rgb = colorAt(1 - r0 / 36);
          const br = (0.35 + v * 1.5) * (1.2 - r0 / 44) + audio.beatIntensity * 0.3;
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.25 + audio.treble * 0.3 * params.reactTreble;
        core.scale.setScalar(1 + audio.bass * 1.6 * params.reactBass + audio.beatIntensity * 0.8);
        const crgb = colorAt((t * 0.1) % 1);
        core.material.color.setRGB(crgb[0], crgb[1], crgb[2]);
        core.material.opacity = 0.4 + audio.bass * 0.5;
        group.rotation.x = 0.35 + Math.sin(t * 0.13) * 0.1;
        group.rotation.y += dt * params.spin * 0.15;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
