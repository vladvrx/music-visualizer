// Scene: circular frequency bars with mirrored reflection.
import * as THREE from 'three';

export default {
  name: 'Bars',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let bars = [];
    const mat = new THREE.MeshBasicMaterial(); // colors come from instanceColor

    function rebuild(p) {
      const count = p.barCount, mirror = p.mirror;
      group.clear();
      bars = [];
      const total = mirror ? count * 2 : count;
      const geo = new THREE.BoxGeometry(0.2, 1, 0.2);
      geo.translate(0, 0.5, 0); // pivot at base
      const inst = new THREE.InstancedMesh(geo, mat, total);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
      group.add(inst);
      bars.push({ inst, count, mirror });
    }

    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const sv = new THREE.Vector3();

    return {
      rebuild,
      update(dt, audio, params) {
        const { inst, count, mirror } = bars[0];
        const total = inst.count;
        const R = 8 + audio.bass * 3;
        for (let i = 0; i < total; i++) {
          let idx = i;
          let a;
          if (mirror) {
            const half = Math.floor(i / 2);
            a = (half / count) * Math.PI * 2 + (i % 2 ? Math.PI : 0);
            idx = half;
          } else {
            a = (i / count) * Math.PI * 2;
          }
          const v = audio.spectrum[idx % count] || 0;
          const h = 0.1 + v * params.barHeight;
          m.makeRotationY(a);
          m.setPosition(Math.sin(a) * R, -params.barHeight / 2, Math.cos(a) * R);
          m.scale(sv.set(1, h, 1));
          inst.setMatrixAt(i, m);
          const rgb = colorAt(idx / count);
          c.setRGB(rgb[0], rgb[1], rgb[2]);
          inst.setColorAt(i, c);
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor.needsUpdate = true;
        group.rotation.y += dt * params.spin * (0.5 + audio.mid);
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
