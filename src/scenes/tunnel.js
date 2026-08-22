// Scene: spectrum rings forming a tunnel flying toward the camera.
import * as THREE from 'three';

export default {
  name: 'Tunnel',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const RINGS = 48;
    let rings = [];
    let ringCount = 0;

    function rebuild(p) {
      const bins = p.barCount;
      ringCount = bins;
      for (const r of rings) { r.clear(); group.remove(r); }
      rings = [];
      for (let i = 0; i < RINGS; i++) {
        const pts = [];
        for (let b = 0; b <= bins; b++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geo, mat);
        const colors = new Float32Array((bins + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        rings.push(line);
        group.add(line);
      }
    }
    rebuild(64);

    return {
      rebuild,
      update(dt, audio, params) {
        const depth = 100;
        for (let i = 0; i < rings.length; i++) {
          const line = rings[i];
          // move toward camera; wrap
          line.userData.z = ((line.userData.z ?? (i / rings.length) * depth) - dt * params.tunnelSpeed) % depth;
          if (line.userData.z < 0) line.userData.z += depth;
          const z = line.userData.z - depth * 0.2;
          const fade = 1 - Math.abs(z) / depth;
          const pos = line.geometry.attributes.position;
          const col = line.geometry.attributes.color;
          const bins = ringCount;
          for (let b = 0; b <= bins; b++) {
            const a = (b / bins) * Math.PI * 2;
            const v = audio.spectrum[b % bins] || 0;
            const r = params.tunnelRadius + v * 10 + Math.sin(audio.time * 2 + i * 0.3) * 0.5;
            pos.setXYZ(b, Math.cos(a) * r, Math.sin(a) * r, z);
            const rgb = colorAt(b / bins);
            const br = (0.4 + v * 1.8) * fade;
            col.setXYZ(b, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
          line.material.opacity = fade;
        }
        group.rotation.z += dt * params.spin * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
