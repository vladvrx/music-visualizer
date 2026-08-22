// Scene: city skyline equalizer with a mirrored "reflection" below.
import * as THREE from 'three';

export default {
  name: 'Skyline',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let inst = null;
    let count = 0;

    function rebuild(p) {
      if (inst) { group.remove(inst); inst.geometry.dispose(); inst.material.dispose(); }
      count = p.barCount;
      const geo = new THREE.BoxGeometry(0.55, 1, 0.55);
      geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshBasicMaterial();
      inst = new THREE.InstancedMesh(geo, mat, count * 2);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 2 * 3), 3);
      group.add(inst);
    }
    rebuild({ barCount: 96 });

    const m = new THREE.Matrix4();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    return {
      rebuild,
      update(dt, audio, params) {
        const span = Math.min(100, count * 1.05);
        const scale = params.barHeight * 0.55;
        for (let i = 0; i < count; i++) {
          const v = audio.spectrum[i] || 0;
          const h = 0.3 + v * scale;
          const x = (i / (count - 1) - 0.5) * span;
          const rgb = colorAt(i / count);
          const br = 0.35 + v * 1.3;
          // building
          m.makeScale(1, h, 1);
          m.setPosition(x, 0, 0);
          inst.setMatrixAt(i, m);
          c.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
          inst.setColorAt(i, c);
          // reflection (dimmer, squashed)
          m.makeScale(1, -h * 0.5, 1);
          m.setPosition(x, 0, 0);
          inst.setMatrixAt(count + i, m);
          c.setRGB(rgb[0] * br * 0.25, rgb[1] * br * 0.25, rgb[2] * br * 0.25);
          inst.setColorAt(count + i, c);
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor.needsUpdate = true;
        group.rotation.y += dt * params.spin * 0.15;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
