// Scene: warp starfield — stars streaking at the camera, speed punches on beats.
import * as THREE from 'three';

export default {
  name: 'Warp',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let points = null;
    let positions = null, colors = null, count = 0;
    const star = []; // per-star x,y,z,band

    function rebuild(p) {
      if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose(); }
      count = p.particleCount;
      positions = new Float32Array(count * 3);
      colors = new Float32Array(count * 3);
      star.length = 0;
      for (let i = 0; i < count; i++) {
        star.push({ x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 40, z: -Math.random() * 200, band: Math.random() });
        colors[i * 3 + 2] = 1;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(points);
    }
    rebuild({ particleCount: 4000 });

    let speed = 40;
    return {
      rebuild,
      update(dt, audio, params) {
        const target = 30 + audio.energy * 90 * params.reactBass + audio.beatIntensity * 160;
        speed += (target - speed) * Math.min(1, dt * 4);
        for (let i = 0; i < count; i++) {
          const s = star[i];
          s.z += speed * dt;
          if (s.z > 8) {
            s.z = -200 - Math.random() * 50;
            s.x = (Math.random() - 0.5) * params.particleSpread * 1.4;
            s.y = (Math.random() - 0.5) * params.particleSpread;
          }
          positions[i * 3] = s.x; positions[i * 3 + 1] = s.y; positions[i * 3 + 2] = s.z;
          const v = audio.spectrum[Math.floor(s.band * audio.spectrum.length)] || 0;
          const near = Math.max(0, 1 - -s.z / 120); // brighter as it approaches
          const rgb = colorAt(s.band);
          const br = (0.25 + near * 1.1 + v * 0.9) * (1 + audio.beatIntensity * 0.5);
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.color.needsUpdate = true;
        points.material.size = 0.3 + audio.beatIntensity * 0.5;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
