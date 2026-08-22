// Scene: cube matrix — grid of pulsing cubes (spectrum in 2D grid).
import * as THREE from 'three';

export default {
  name: 'Cube Matrix',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let inst = null;
    let size = 0;

    function rebuild(p) {
      const gridSize = p.matrixSize;
      if (inst) { group.remove(inst); inst.geometry.dispose(); inst.material.dispose(); }
      size = gridSize;
      const geo = new THREE.BoxGeometry(0.7, 1, 0.7);
      geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshBasicMaterial(); // colors come from instanceColor
      inst = new THREE.InstancedMesh(geo, mat, size * size);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(size * size * 3), 3);
      group.add(inst);
    }
    rebuild(16);

    const m = new THREE.Matrix4();
    const c = new THREE.Color();

    return {
      rebuild,
      update(dt, audio, params) {
        const span = 40;
        let i = 0;
        for (let r = 0; r < size; r++) {
          for (let cIdx = 0; cIdx < size; cIdx++, i++) {
            const x = (cIdx / (size - 1) - 0.5) * span;
            const z = (r / (size - 1) - 0.5) * span;
            const specIdx = Math.floor((cIdx / size) * audio.spectrum.length);
            const v = audio.spectrum[specIdx] || 0;
            const rowFall = 1 - r / size * 0.7;
            const h = 0.2 + v * 10 * rowFall + audio.beatIntensity * 0.5;
            m.identity();
            m.makeScale(1, h, 1);
            m.setPosition(x, -5, z);
            inst.setMatrixAt(i, m);
            const rgb = colorAt((cIdx / size + r / size * 0.25) % 1);
            const br = 0.45 + v * 1.7;
            c.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
            inst.setColorAt(i, c);
          }
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor.needsUpdate = true;
        group.rotation.y += dt * params.spin * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
