// Spectrum analysis: bands, normalization, and beat detection.

export class Analyzer {
  constructor(analyserGetter) {
    this.getAnalyser = analyserGetter;
    this.freq = new Uint8Array(1024);
    this.wave = new Uint8Array(2048);

    // Derived data
    this.spectrum = [];      // normalized 0..1, mapped bins
    this.bass = 0; this.mid = 0; this.treble = 0; this.energy = 0;
    this.bassAvg = 0; this.midAvg = 0; this.trebleAvg = 0;

    // Beat detection (energy history on bass band)
    this.history = [];
    this.beat = false;
    this.beatIntensity = 0; // decaying pulse 0..1
    this.lastBeatTime = 0;
    this.beatTimes = [];
    this.bpm = 0;
    this.time = 0;
    this.onBeat = null;
  }

  update(dt, params) {
    const analyser = this.getAnalyser();
    this.time += dt;
    if (!analyser) return;

    const n = analyser.frequencyBinCount;
    if (this.freq.length !== n) { this.freq = new Uint8Array(n); this.wave = new Uint8Array(n * 2); }
    analyser.getByteFrequencyData(this.freq);
    analyser.getByteTimeDomainData(this.wave);

    // Map FFT bins to display bands with log or linear scaling
    const count = params.barCount;
    const nyquist = (analyser.context.sampleRate / 2);
    const minF = 20, maxF = Math.min(20000, nyquist);
    if (this.spectrum.length !== count) this.spectrum = new Array(count).fill(0);
    for (let i = 0; i < count; i++) {
      let v;
      if (params.freqMapping === 'log') {
        const f0 = minF * Math.pow(maxF / minF, i / count);
        const f1 = minF * Math.pow(maxF / minF, (i + 1) / count);
        let b0 = Math.floor(f0 / nyquist * n), b1 = Math.max(b0 + 1, Math.ceil(f1 / nyquist * n));
        b1 = Math.min(b1, n);
        let sum = 0; for (let b = b0; b < b1; b++) sum += this.freq[b];
        v = sum / (b1 - b0) / 255;
      } else {
        const idx = Math.floor(i / count * n * 0.8); // linear over 80% of spectrum (usable range)
        v = this.freq[idx] / 255;
      }
      v = Math.pow(v, params.sensitivity);
      this.spectrum[i] = v;
    }

    // Bands (fraction ranges of spectrum array)
    this.bass = avgRange(this.spectrum, 0, 0.15);
    this.mid = avgRange(this.spectrum, 0.15, 0.5);
    this.treble = avgRange(this.spectrum, 0.5, 1);
    this.energy = (this.bass + this.mid + this.treble) / 3;

    // Smoothed averages for relative energy
    const k = 1 - Math.exp(-dt * 2);
    this.bassAvg += (this.bass - this.bassAvg) * k;
    this.midAvg += (this.mid - this.midAvg) * k;
    this.trebleAvg += (this.treble - this.trebleAvg) * k;

    // --- Beat detection: instant bass energy vs moving average + threshold ---
    this.history.push(this.bass);
    if (this.history.length > 60) this.history.shift(); // ~1s at 60fps
    this.beat = false;
    if (this.history.length > 20) {
      const hAvg = this.history.reduce((a, b) => a + b, 0) / this.history.length;
      const now = this.time;
      if (this.bass > hAvg * params.beatSensitivity && this.bass > 0.12 && now - this.lastBeatTime > 60 / 240) {
        this.beat = true;
        this.beatIntensity = 1;
        const interval = now - this.lastBeatTime;
        this.lastBeatTime = now;
        if (interval > 0.25 && interval < 2) {
          this.beatTimes.push(interval);
          if (this.beatTimes.length > 16) this.beatTimes.shift();
          const median = [...this.beatTimes].sort((a, b) => a - b)[Math.floor(this.beatTimes.length / 2)];
          this.bpm = Math.round(60 / median);
        }
        this.onBeat?.(this.beatIntensity);
      }
    }
    this.beatIntensity *= Math.exp(-dt * params.beatDecay);
  }
}

function avgRange(arr, a, b) {
  const i0 = Math.floor(a * arr.length), i1 = Math.max(i0 + 1, Math.floor(b * arr.length));
  let s = 0; for (let i = i0; i < i1; i++) s += arr[i];
  return s / (i1 - i0);
}
