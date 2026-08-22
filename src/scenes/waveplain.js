// Scene: top-down liquid wave plane (2D-looking flat surface).
import * as THREE from 'three';

export default {
  name: 'Liquid',
  create({ scene, colorAt }) {
    let mesh = null;
    let cols = 0;

    function rebuild(bins) {
      cols = bins;
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
      const geo = new THREE.PlaneGeometry(90, 60, cols - 1, Math.floor(cols * 0.66) - 1);
      geo.rotateX(-Math.PI / 2);
      const colors = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    }
    rebuild(64);

    return {
      rebuild,
      update(dt, audio, params) {
        const pos = mesh.geometry.attributes.position;
        const col = mesh.geometry.attributes.color;
        const t = audio.time;
        for (let i = 0; i < pos.count; i++) {
          const i3row = Math.floor(i / cols), c = i % cols;
          const x = pos.getX(i), z = pos.getZ(i);
          const v = audio.spectrum[Math.floor(c / cols * audio.spectrum.length)] || 0;
          const dist = Math.sqrt(x * x + z * z);
          const ripple = Math.sin(dist * 0.35 - t * (3 + audio.bass * 4 * params.reactBass)) * (0.5 + audio.energy * 3);
          const wave = Math.sin(x * 0.12 + t) * Math.cos(z * 0.14 - t * 0.7) * (1 + audio.mid * 3);
          pos.setY(i, (ripple + wave) * params.liquidAmp + v * 4);
          const rgb = colorAt((dist / 55 + t * 0.02) % 1);
          const br = 0.4 + v * 1.7 + Math.abs(ripple) * 0.4;
          col.setXYZ(i, rgb[0] * br, rgb[1] * br, rgb[2] * br);
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
      },
      dispose() { mesh?.removeFromParent(); },
    };
  },
};
