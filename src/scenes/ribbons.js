// Scene: flowing 3D light ribbons weaving through space.
import * as THREE from 'three';

export default {
  name: 'Ribbons',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let ribbons = [];

    function rebuild(p) {
      for (const r of ribbons) group.remove(r);
      ribbons = [];
      const n = p.ribbonCount;
      const cols = 160;
      for (let i = 0; i < n; i++) {
        const pts = [];
        for (let c = 0; c <= cols; c++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((cols + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
        const line = new THREE.Line(geo, mat);
        line.userData.i = i;
        ribbons.push(line);
        group.add(line);
      }
    }
    rebuild({ ribbonCount: 14 });

    let t = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        t += dt * (0.4 + audio.energy);
        const cols = ribbons[0].geometry.attributes.position.count - 1;
        for (const line of ribbons) {
          const i = line.userData.i;
          const fi = i / ribbons.length;
          const pos = line.geometry.attributes.position;
          const col = line.geometry.attributes.color;
          const phase = fi * Math.PI * 2;
          const depth = (fi - 0.5) * 30 * params.particleSpread / 40;
          for (let c = 0; c <= cols; c++) {
            const u = c / cols;
            const x = (u - 0.5) * 90;
            const v = audio.spectrum[Math.floor(u * audio.spectrum.length)] || 0;
            const y = Math.sin(u * 6 + t + phase) * (5 + v * 20 * params.reactBass)
              + Math.sin(u * 13 - t * 1.4 + phase * 2) * 3;
            const z = depth + Math.cos(u * 5 + t * 0.8 + phase) * (6 + audio.mid * 14) + v * 8;
            pos.setXYZ(c, x, y, z);
            const rgb = colorAt(fi + u * 0.3);
            const br = 0.55 + v * 1.4 + audio.beatIntensity * 0.4;
            col.setXYZ(c, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
        }
        group.rotation.y = Math.sin(t * 0.1) * 0.4;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
