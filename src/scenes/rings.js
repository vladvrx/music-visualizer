// Scene: concentric radial spectrum rings (circular equalizer).
import * as THREE from 'three';

export default {
  name: 'Rings',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let rings = [];

    function rebuild(p) {
      const ringCount = p.ringCount, bins = p.barCount;
      for (const r of rings) group.remove(r);
      rings = [];
      for (let i = 0; i < ringCount; i++) {
        const pts = [];
        for (let b = 0; b <= bins; b++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((bins + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
        const ring = new THREE.Line(geo, mat);
        ring.userData.i = i;
        rings.push(ring);
        group.add(ring);
      }
    }
    rebuild(5, 96);

    let phase = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        phase += dt * params.spin * 0.4;
        const n = rings.length;
        const bins = rings[0].geometry.attributes.position.count - 1;
        for (const ring of rings) {
          const i = ring.userData.i;
          const pos = ring.geometry.attributes.position;
          const col = ring.geometry.attributes.color;
          const baseR = 4 + i * params.ringGap;
          // each ring samples the spectrum at a rotated offset (spokes)
          for (let b = 0; b <= bins; b++) {
            const a = (b / bins) * Math.PI * 2 + phase + i * (Math.PI * 2 / n);
            const specIdx = Math.floor(((b / bins) + (i / n)) % 1 * audio.spectrum.length);
            const v = audio.spectrum[specIdx] || 0;
            const r = baseR + v * 10;
            pos.setXYZ(b, Math.cos(a) * r, Math.sin(a) * r, v * 4);
            const rgb = colorAt((i / n + b / bins * 0.3) % 1);
            const br = 0.5 + v * 1.7;
            col.setXYZ(b, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
          ring.scale.setScalar(1 + audio.beatIntensity * 0.06 * i);
        }
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
