// Scene: GPU-ish particle field reacting to bass/mid/treble.
import * as THREE from 'three';

export default {
  name: 'Particles',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let points = null;
    let velocities = null;
    let positions = null;
    let count = 0;
    let colors = null;

    function rebuild(p) {
      const n = p.particleCount;
      if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose(); }
      count = n;
      positions = new Float32Array(n * 3);
      velocities = new Float32Array(n * 3);
      colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      const mat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      points = new THREE.Points(geo, mat);
      group.add(points);
    }
    rebuild(4000);

    const c = new THREE.Color();
    return {
      rebuild,
      update(dt, audio, params) {
        const spread = params.particleSpread;
        const boost = 1 + audio.bass * 6 * params.reactBass + audio.beatIntensity * 4;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const band = (i / count);
          const b = band < 0.33 ? audio.bass : band < 0.66 ? audio.mid : audio.treble;
          const f = (0.2 + b * 8) * dt;
          positions[i3] += velocities[i3] * f * boost;
          positions[i3 + 1] += velocities[i3 + 1] * f * boost;
          positions[i3 + 2] += velocities[i3 + 2] * f * boost;
          // wrap within spread cube
          for (let a = 0; a < 3; a++) {
            const lim = spread * (1 + audio.bass * 0.3);
            if (positions[i3 + a] > lim) positions[i3 + a] = -lim;
            if (positions[i3 + a] < -lim) positions[i3 + a] = lim;
          }
          const rgb = colorAt(band);
          const br = 0.7 + b * 1.8 + audio.beatIntensity * 0.5;
          colors[i3] = rgb[0] * br; colors[i3 + 1] = rgb[1] * br; colors[i3 + 2] = rgb[2] * br;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.color.needsUpdate = true;
        points.material.size = 0.3 + audio.energy * 0.5 + audio.beatIntensity * 0.3;
        group.rotation.y += dt * params.spin * 0.3;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
