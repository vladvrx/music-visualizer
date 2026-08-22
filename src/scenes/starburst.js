// Scene: radial starburst rays from center, length driven by spectrum.
import * as THREE from 'three';

export default {
  name: 'Starburst',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(512 * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(512 * 2 * 3), 3));
    const burst = new THREE.LineSegments(geo, mat);
    group.add(burst);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    group.add(core);

    return {
      update(dt, audio, params) {
        const rays = Math.min(512, Math.round(params.rayCount));
        const pos = geo.attributes.position;
        const col = geo.attributes.color;
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2;
          const v = audio.spectrum[Math.floor(i / rays * audio.spectrum.length)] || 0;
          const len = 2 + v * params.rayLength;
          pos.setXYZ(i * 2, 0, 0, 0);
          pos.setXYZ(i * 2 + 1, Math.cos(a) * len, Math.sin(a) * len, (v - 0.3) * 6);
          const rgb = colorAt(i / rays);
          const br = 0.5 + v * 1.8;
          col.setXYZ(i * 2, rgb[0] * 0.1, rgb[1] * 0.1, rgb[2] * 0.1);
          col.setXYZ(i * 2 + 1, rgb[0] * br, rgb[1] * br, rgb[2] * br);
        }
        geo.setDrawRange(0, rays * 2);
        pos.needsUpdate = true;
        col.needsUpdate = true;
        core.scale.setScalar(1 + audio.bass * 2 * params.reactBass + audio.beatIntensity);
        const crgb = colorAt((audio.time * 0.15) % 1);
        core.material.color.setRGB(crgb[0], crgb[1], crgb[2]);
        core.material.opacity = 0.3 + audio.bass * 0.6;
        group.rotation.z += dt * params.spin * 0.5;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
