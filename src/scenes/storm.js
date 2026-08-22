// Scene: cube storm — spectrum-lit cubes flying past the camera.
import * as THREE from 'three';

export default {
  name: 'Cube Storm',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let inst = null;
    let count = 0;
    let data = null; // per-cube {x,y,z,rot,speed,band}

    function rebuild(p) {
      if (inst) { group.remove(inst); inst.geometry.dispose(); inst.material.dispose(); }
      count = Math.round(p.particleCount / 40);
      const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const mat = new THREE.MeshBasicMaterial();
      inst = new THREE.InstancedMesh(geo, mat, count);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
      group.add(inst);
      data = [];
      for (let i = 0; i < count; i++) {
        data.push({
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 40,
          z: -Math.random() * 150,
          speed: 8 + Math.random() * 20,
          band: Math.random(),
        });
      }
    }
    rebuild({ particleCount: 4000 });

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const c = new THREE.Color();

    return {
      rebuild,
      update(dt, audio, params) {
        const spread = params.particleSpread;
        for (let i = 0; i < count; i++) {
          const d = data[i];
          d.z += d.speed * dt * (1 + audio.energy * 3 * params.reactBass + audio.beatIntensity);
          if (d.z > 10) {
            d.z = -150 - Math.random() * 40;
            d.x = (Math.random() - 0.5) * spread * 1.5;
            d.y = (Math.random() - 0.5) * spread;
          }
          const v = audio.spectrum[Math.floor(d.band * audio.spectrum.length)] || 0;
          const s = 0.4 + v * 3.2;
          e.set(d.z * 0.03, d.z * 0.02 + d.band * 6, d.band * 3);
          q.setFromEuler(e);
          pos.set(d.x, d.y, d.z);
          scl.set(s, s, s);
          m.compose(pos, q, scl);
          inst.setMatrixAt(i, m);
          const rgb = colorAt(d.band);
          const br = 0.4 + v * 1.4;
          c.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
          inst.setColorAt(i, c);
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor.needsUpdate = true;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
