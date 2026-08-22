// Scene: stacked oscilloscope waveform lines in 3D space.
import * as THREE from 'three';

export default {
  name: 'Wave Grid',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let rows = [];

    function rebuild(p) {
      const rowCount = p.gridRows, bins = p.barCount;
      for (const r of rows) group.remove(r);
      rows = [];
      for (let i = 0; i < rowCount; i++) {
        const pts = [];
        for (let b = 0; b <= bins; b++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((bins + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
        const line = new THREE.Line(geo, mat);
        rows.push(line);
        group.add(line);
      }
    }
    rebuild(40, 64);

    return {
      rebuild,
      update(dt, audio, params) {
        const wave = audio.wave;
        const n = rows.length;
        for (let i = 0; i < n; i++) {
          const line = rows[i];
          const depth = (i / (n - 1) - 0.5) * 60;
          const delay = Math.floor(i / n * 60); // stagger sampling for trail effect
          const pos = line.geometry.attributes.position;
          const col = line.geometry.attributes.color;
          const bins = pos.count - 1;
          const fade = 1 - Math.abs(i / (n - 1) - 0.5) * 1.4;
          for (let b = 0; b <= bins; b++) {
            const x = (b / bins - 0.5) * 80;
            const w = (wave[(b * 7 + delay * 29) % wave.length] - 128) / 128;
            const v = audio.spectrum[b % audio.spectrum.length] || 0;
            const y = w * (4 + v * 14) + Math.sin(audio.time * 2 + i * 0.4 + b * 0.05) * 0.8;
            pos.setXYZ(b, x, y, depth);
            const rgb = colorAt(b / bins);
            const br = (0.45 + Math.abs(w) * 1.6 + v * 1.5) * Math.max(0.15, fade);
            col.setXYZ(b, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
        }
        group.rotation.y = Math.sin(audio.time * 0.1) * 0.3;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
