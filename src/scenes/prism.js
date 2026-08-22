// Scene: Prism — nested rotating wireframe polyhedra, edges singing with the spectrum.
import * as THREE from 'three';

const SHAPES = [
  { geo: () => new THREE.IcosahedronGeometry(6, 0), axis: 'x' },
  { geo: () => new THREE.OctahedronGeometry(9, 0), axis: 'y' },
  { geo: () => new THREE.BoxGeometry(14, 14, 14, 2, 2, 2), axis: 'z' },
  { geo: () => new THREE.TetrahedronGeometry(16, 0), axis: 'xy' },
];

export default {
  name: 'Prism',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const meshes = [];
    for (const s of SHAPES) {
      const edges = new THREE.EdgesGeometry(s.geo(), 12);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
      line.userData = s;
      meshes.push(line);
      group.add(line);
    }
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.4, 1),
      new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.9 })
    );
    group.add(core);

    return {
      update(dt, audio, params) {
        const bands = [audio.bass, audio.mid, audio.treble, audio.energy];
        meshes.forEach((line, idx) => {
          const v = bands[idx];
          const s = 1 + v * 0.4 * params.reactBass + audio.beatIntensity * 0.15;
          const ax = line.userData.axis;
          if (ax === 'x') line.rotation.x += dt * (0.4 + v * 2);
          else if (ax === 'y') line.rotation.y += dt * (0.4 + v * 2);
          else if (ax === 'z') line.rotation.z += dt * (0.4 + v * 2);
          else { line.rotation.x += dt * 0.3; line.rotation.y -= dt * (0.3 + v); }
          line.scale.setScalar(s);
          const rgb = colorAt(idx / SHAPES.length + audio.time * 0.02);
          const br = 0.45 + v * 1.4;
          line.material.color.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
        });
        core.rotation.x += dt * 0.9;
        core.rotation.y += dt * 0.6;
        core.scale.setScalar(1 + audio.bass * 1.1 * params.reactBass + audio.beatIntensity * 0.7);
        const crgb = colorAt((audio.time * 0.12) % 1);
        core.material.color.setRGB(crgb[0], crgb[1], crgb[2]);
        group.rotation.y += dt * params.spin * 0.25;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
