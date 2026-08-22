// Scene: polar rose "flower" whose petals bloom with the spectrum.
import * as THREE from 'three';

export default {
  name: 'Flower',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let layers = [];

    function rebuild(p) {
      for (const l of layers) group.remove(l);
      layers = [];
      const L = 3;
      for (let l = 0; l < L; l++) {
        const pts = [];
        const seg = 512;
        for (let c = 0; c <= seg; c++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((seg + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
        const line = new THREE.Line(geo, mat);
        line.userData.l = l;
        layers.push(line);
        group.add(line);
      }
    }
    rebuild({});

    let t = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        t += dt * (0.3 + audio.mid * 0.8);
        const petals = Math.max(2, Math.round(params.petals));
        for (const line of layers) {
          const l = line.userData.l;
          const pos = line.geometry.attributes.position;
          const col = line.geometry.attributes.color;
          const seg = pos.count - 1;
          const lr = 1 + l * 0.45;
          for (let c = 0; c <= seg; c++) {
            const th = (c / seg) * Math.PI * 2;
            const si = Math.floor((c / seg) * audio.spectrum.length);
            const v = audio.spectrum[si] || 0;
            const rose = Math.cos(petals * th + t + l * 0.5);
            const r = (6 + v * 16 * params.reactBass) * (0.55 + 0.45 * rose) * lr + audio.beatIntensity * 4;
            const y = Math.sin(th * 3 + t * 2 + l) * (1 + v * 6);
            pos.setXYZ(c, Math.cos(th) * r, y, Math.sin(th) * r);
            const rgb = colorAt((c / seg + l / 3 + t * 0.05) % 1);
            const br = 0.5 + v * 1.5;
            col.setXYZ(c, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
        }
        group.rotation.y += dt * params.spin * 0.5;
        group.rotation.x = Math.sin(t * 0.2) * 0.3;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
