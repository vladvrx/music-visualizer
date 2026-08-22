// Scene: logarithmic spectrum spiral (galaxy arm style).
import * as THREE from 'three';

export default {
  name: 'Spiral',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const COUNT = 1200;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    group.add(points);

    return {
      update(dt, audio, params) {
        const arms = Math.max(1, Math.round(params.spiralArms));
        for (let i = 0; i < COUNT; i++) {
          const t = i / COUNT;
          const arm = i % arms;
          const band = audio.spectrum[Math.floor(t * audio.spectrum.length)] || 0;
          const angle = t * Math.PI * 12 + (arm / arms) * Math.PI * 2;
          const r = 2 + t * 30 + band * 8 * params.reactBass;
          const y = (Math.sin(angle * 2 + audio.time) * 2 + band * 10 - 4) * (0.3 + t);
          positions[i * 3] = Math.cos(angle) * r;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(angle) * r;
          const rgb = colorAt(t);
          const br = 0.55 + band * 1.8 + audio.beatIntensity * 0.3;
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.5 + audio.energy * 0.6;
        group.rotation.y += dt * params.spin * 0.4;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
