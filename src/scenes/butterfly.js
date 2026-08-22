// Scene: Temple Fay butterfly curve, wings flapping with the music.
import * as THREE from 'three';

export default {
  name: 'Butterfly',
  create({ scene, colorAt }) {
    const N = 2400;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const group = new THREE.Group();
    group.add(new THREE.Points(geo, mat));
    scene.add(group);

    let t = 0;
    return {
      update(dt, audio, params) {
        t += dt * (0.4 + audio.energy * 0.8);
        const scale = 8 + audio.energy * 8;
        const k = 2 + Math.sin(t * 0.7) * 1.2 + audio.mid * 2 * params.reactMid; // wing shape morph
        const flap = Math.sin(t * (1.5 + audio.bass * 3 * params.reactBass));
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 12;
          const v = audio.spectrum[Math.floor((i / N) * audio.spectrum.length)] || 0;
          const r = (Math.exp(Math.sin(th)) - k * Math.cos(4 * th) + Math.pow(Math.sin((2 * th - Math.PI) / 24), 5)) * scale * (0.9 + v * 0.5);
          const x = r * Math.sin(th);
          const y = -r * Math.cos(th) + scale * 1.1;
          const z = flap * (1.5 + v * 5) * Math.sin(th);
          positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
          const rgb = colorAt((i / N + t * 0.02) % 1);
          const br = 0.45 + v * 1.4 + audio.beatIntensity * 0.3;
          colors[i * 3] = rgb[0] * br; colors[i * 3 + 1] = rgb[1] * br; colors[i * 3 + 2] = rgb[2] * br;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.size = 0.3 + audio.energy * 0.3;
        group.rotation.y = Math.sin(t * 0.3) * 0.25 + dt * 0; // gentle sway
        group.rotation.y += dt * params.spin * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
