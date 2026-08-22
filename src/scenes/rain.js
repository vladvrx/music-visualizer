// Scene: digital rain — columns of falling sparks, density per frequency column.
import * as THREE from 'three';

export default {
  name: 'Rain',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let points = null;
    let positions = null, colors = null, drops = null, count = 0, cols = 0;

    function rebuild(p) {
      if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose(); }
      cols = p.barCount;
      count = cols * 14; // drops per column
      positions = new Float32Array(count * 3);
      colors = new Float32Array(count * 3);
      drops = [];
      for (let c = 0; c < cols; c++) {
        for (let j = 0; j < 14; j++) {
          drops.push({ c, y: Math.random() * 60, speed: 12 + Math.random() * 18 });
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(points);
    }
    rebuild({ barCount: 96 });

    return {
      rebuild,
      update(dt, audio, params) {
        const span = Math.min(100, cols * 1.1);
        const fall = 0.5 + params.terrainSpeed / 10;
        for (let i = 0; i < count; i++) {
          const d = drops[i];
          const v = audio.spectrum[d.c] || 0;
          d.y -= d.speed * dt * fall * (1 + v * 2.5 * params.reactBass);
          if (d.y < -30) d.y = 30 + Math.random() * 10;
          const x = (d.c / (cols - 1) - 0.5) * span;
          const z = -((i % 14) / 14) * 24 + 6;
          positions[i * 3] = x; positions[i * 3 + 1] = d.y - 15; positions[i * 3 + 2] = z;
          const rgb = colorAt(d.c / cols);
          // drops in "active" columns glow; heads flare on treble
          const br = (0.12 + v * 1.5 + audio.treble * 0.5 * params.reactTreble + audio.beatIntensity * 0.3) * (0.4 + 0.6 * ((d.y + 30) / 60));
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.color.needsUpdate = true;
        group.rotation.y = Math.sin(audio.time * 0.08) * 0.15;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
