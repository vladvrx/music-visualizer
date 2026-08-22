// Scene: DNA double helix with spectrum-lit rungs.
import * as THREE from 'three';

export default {
  name: 'DNA Helix',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let strands = [];
    let rungs = null;

    function rebuild(p) {
      for (const s of strands) group.remove(s);
      if (rungs) { group.remove(rungs); rungs.geometry.dispose(); rungs.material.dispose(); }
      strands = [];
      const rows = Math.round(p.gridRows);
      for (let s = 0; s < 2; s++) {
        const pts = [];
        for (let i = 0; i <= rows; i++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((rows + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
        const line = new THREE.Line(geo, mat);
        line.userData.s = s;
        strands.push(line);
        group.add(line);
      }
      // rungs as line segments between the two strands
      const rpos = new Float32Array(rows * 2 * 3);
      const rcol = new Float32Array(rows * 2 * 3);
      const rgeo = new THREE.BufferGeometry();
      rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
      rgeo.setAttribute('color', new THREE.BufferAttribute(rcol, 3));
      rungs = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
      group.add(rungs);
    }
    rebuild({ gridRows: 60 });

    let t = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        t += dt * (0.5 + params.spin);
        const rows = strands[0].geometry.attributes.position.count - 1;
        const R = 5 + audio.bass * 4 * params.reactBass;
        const H = 50;
        const posA = strands[0].geometry.attributes.position;
        const posB = strands[1].geometry.attributes.position;
        const colA = strands[0].geometry.attributes.color;
        const colB = strands[1].geometry.attributes.color;
        const rp = rungs.geometry.attributes.position;
        const rc = rungs.geometry.attributes.color;
        for (let i = 0; i <= rows; i++) {
          const f = i / rows;
          const v = audio.spectrum[Math.floor(f * audio.spectrum.length)] || 0;
          const y = (f - 0.5) * H;
          const a = f * Math.PI * 6 + t;
          const wob = Math.sin(t * 2 + f * 12) * (0.5 + audio.mid * 3);
          posA.setXYZ(i, Math.cos(a) * R + wob, y, Math.sin(a) * R);
          posB.setXYZ(i, Math.cos(a + Math.PI) * R - wob, y, Math.sin(a + Math.PI) * R);
          const rgbA = colorAt(f);
          const rgbB = colorAt((f + 0.5) % 1);
          const br = 0.5 + v * 1.4;
          colA.setXYZ(i, rgbA[0] * br, rgbA[1] * br, rgbA[2] * br);
          colB.setXYZ(i, rgbB[0] * br, rgbB[1] * br, rgbB[2] * br);
          if (i < rows) {
            rp.setXYZ(i * 2, posA.getX(i), posA.getY(i), posA.getZ(i));
            rp.setXYZ(i * 2 + 1, posB.getX(i), posB.getY(i), posB.getZ(i));
            const rbr = 0.5 + v * 1.6 + audio.beatIntensity * 0.6;
            rc.setXYZ(i * 2, rgbA[0] * rbr, rgbA[1] * rbr, rgbA[2] * rbr);
            rc.setXYZ(i * 2 + 1, rgbB[0] * rbr, rgbB[1] * rbr, rgbB[2] * rbr);
          }
        }
        for (const s of strands) {
          s.geometry.attributes.position.needsUpdate = true;
          s.geometry.attributes.color.needsUpdate = true;
        }
        rp.needsUpdate = true;
        rc.needsUpdate = true;
        group.rotation.y += dt * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
