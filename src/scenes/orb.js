// Scene: pulsing icosahedron orb with frequency-band vertex displacement.
import * as THREE from 'three';

export default {
  name: 'Orb',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    const geo = new THREE.IcosahedronGeometry(6, 32);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    // inner glow sphere
    const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), glowMat);
    group.add(glow);

    const base = geo.attributes.position.array.slice();
    const c = new THREE.Color();

    return {
      update(dt, audio, params) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const i3 = i * 3;
          const x = base[i3], y = base[i3 + 1], z = base[i3 + 2];
          // spherical direction band
          const theta = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
          const band = theta < 0.33 ? audio.bass : theta < 0.66 ? audio.mid : audio.treble;
          const v = base[i3 + 1] / 6; // -1..1
          const b2 = v < 0 ? audio.bass : audio.treble;
          const disp = 1
            + band * 0.6 * params.orbDisplace * params.reactBass
            + b2 * 0.4 * params.orbDisplace
            + audio.beatIntensity * 0.5 * params.orbDisplace;
          pos.setXYZ(i, x * disp, y * disp, z * disp);
          const rgb = colorAt(theta);
          const br = 0.5 + band * 1.6;
          c.setRGB(rgb[0] * br, rgb[1] * br, rgb[2] * br);
          colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
        }
        pos.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        const gr = 2.5 + audio.bass * 1.5 * params.reactBass + audio.beatIntensity;
        glow.scale.setScalar(gr / 3);
        const grgb = colorAt((audio.time * 0.1) % 1);
        glowMat.color.setRGB(grgb[0], grgb[1], grgb[2]);
        glowMat.opacity = 0.15 + audio.bass * 0.3;
        group.rotation.y += dt * params.spin * 0.5;
        group.rotation.x += dt * params.spin * 0.2;
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
