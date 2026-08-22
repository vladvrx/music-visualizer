// Scene: scrolling 3D spectrogram terrain.
import * as THREE from 'three';

export default {
  name: 'Terrain',
  create({ scene, colorAt }) {
    const ROWS = 90;
    let mesh = null;
    let cols = 0;
    const history = []; // rows of spectrum snapshots

    function rebuild(p) {
      const bins = p.barCount;
      cols = bins;
      history.length = 0;
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
      const geo = new THREE.PlaneGeometry(100, 120, cols - 1, ROWS - 1);
      geo.rotateX(-Math.PI / 2);
      const colors = new Float32Array(cols * ROWS * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    }
    rebuild(64);

    let accum = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        // push a new row at intervals scaled by scroll speed
        accum += dt * params.terrainSpeed * 0.5;
        while (accum >= 1) {
          accum -= 1;
          history.unshift([...audio.spectrum]);
          if (history.length > ROWS) history.pop();
        }
        const pos = mesh.geometry.attributes.position;
        const col = mesh.geometry.attributes.color;
        for (let r = 0; r < ROWS; r++) {
          const row = history[Math.min(r, history.length - 1)] || [];
          const z = (r / (ROWS - 1) - 0.5) * 120;
          for (let c = 0; c < cols; c++) {
            const v = row[c] ?? 0;
            pos.setZ(r * cols + c, z);
            pos.setY(r * cols + c, v * params.terrainHeight);
            const rgb = colorAt(c / cols);
            const br = 0.35 + v * 1.8;
            col.setXYZ(r * cols + c, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
      },
      dispose() { mesh?.removeFromParent(); },
    };
  },
};
