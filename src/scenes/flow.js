// Scene: "Currents" — horizontal flow lines bending around a vortex (Tame Impala style).
import * as THREE from 'three';

export default {
  name: 'Currents',
  create({ scene, colorAt }) {
    const group = new THREE.Group();
    scene.add(group);
    let lines = [];
    let cols = 0;

    function rebuild(p) {
      const rowCount = p.flowLines;
      for (const l of lines) group.remove(l);
      lines = [];
      cols = 140;
      for (let i = 0; i < rowCount; i++) {
        const pts = [];
        for (let c = 0; c <= cols; c++) pts.push(new THREE.Vector3());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array((cols + 1) * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
        const line = new THREE.Line(geo, mat);
        lines.push(line);
        group.add(line);
      }
    }
    rebuild(120);

    let t = 0;
    return {
      rebuild,
      update(dt, audio, params) {
        t += dt * params.flowTime;
        const rowCount = lines.length;
        const W = 90, H = 60;
        // vortex position breathes slowly; audio pushes strength
        const vx = params.vortexX + Math.sin(t * 0.23) * 3;
        const vy = params.vortexY + Math.cos(t * 0.17) * 2;
        const strength = params.vortex * (1 + audio.bass * params.reactBass + audio.beatIntensity * 0.6);
        const vortR = params.vortexR;
        const waveAmp = params.flowAmp * (1 + audio.mid * params.reactMid * 2 + audio.beatIntensity * 0.8);
        const freqTilt = audio.treble * params.reactTreble;

        for (let i = 0; i < rowCount; i++) {
          const line = lines[i];
          const pos = line.geometry.attributes.position;
          const col = line.geometry.attributes.color;
          const rowT = i / (rowCount - 1);
          const baseY = (rowT - 0.5) * H;
          for (let c = 0; c <= cols; c++) {
            const x = (c / cols - 0.5) * W;
            // stream-function style dip toward the vortex (lines bend around it)
            const dx = x - vx, dy = baseY - vy;
            const d2 = dx * dx + dy * dy;
            const dip = -strength * Math.exp(-d2 / (vortR * vortR)) * 8;
            // flowing surface waviness
            const w1 = Math.sin(x * 0.08 + t * 1.2 + rowT * 6.0);
            const w2 = Math.sin(x * 0.21 - t * 0.8 + rowT * 11.0);
            const w3 = Math.sin(x * 0.05 + t * 0.5);
            const ripple = Math.exp(-((x + 25) * (x + 25)) / 500) * Math.sin(x * 0.4 - t * 4) * freqTilt * 3;
            const y = baseY + dip + (w1 * 0.7 + w2 * 0.35 + w3 * 0.5) * waveAmp + ripple;
            // slight z bulge around vortex for depth
            const z = strength * Math.exp(-d2 / ((vortR * 1.6) * (vortR * 1.6))) * 4;
            pos.setXYZ(c, x, y, z);
            const rgb = colorAt(rowT * 0.85 + Math.sin(t * 0.1) * 0.1);
            const br = 0.45 + audio.treble * 0.9 + Math.exp(-d2 / (vortR * vortR)) * 0.5;
            col.setXYZ(c, rgb[0] * br, rgb[1] * br, rgb[2] * br);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
        }
      },
      dispose() { group.removeFromParent(); },
    };
  },
};
