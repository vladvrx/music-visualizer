// Audio engine: sources (file / URL / mic), transport, playlist.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.gain = null;
    this.mediaDest = null; // for recording
    this.el = null;        // <audio> element source
    this.elSource = null;
    this.micStream = null;
    this.micSource = null;
    this.playlist = [];    // [{name, url|file, isObject}]
    this.index = -1;
    this._volume = 0.8;
    this.onTrackChange = null;
    this.onStateChange = null;
    this.mode = 'none'; // 'file' | 'url' | 'mic'
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this._volume;
      this.mediaDest = this.ctx.createMediaStreamDestination();
      this.analyser.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.gain.connect(this.mediaDest);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get currentTime() {
    return this.el ? this.el.currentTime : 0;
  }
  get duration() {
    return this.el && isFinite(this.el.duration) ? this.el.duration : 0;
  }
  get isPlaying() {
    return this.mode === 'mic' ? true : (this.el && !this.el.paused);
  }

  setVolume(v) {
    this._volume = v;
    if (this.gain) this.gain.gain.value = v;
  }

  setFftSize(n) { if (this.analyser) this.analyser.fftSize = n; }
  setSmoothing(v) { if (this.analyser) this.analyser.smoothingTimeConstant = v; }

  _connectCommon(node) {
    this.ensureCtx();
    node.connect(this.analyser);
  }

  _setupElement() {
    this.ensureCtx();
    this._stopMic();
    if (!this.el) {
      this.el = new Audio();
      this.el.crossOrigin = 'anonymous';
      this.el.addEventListener('ended', () => this.next());
      this.el.addEventListener('loadedmetadata', () => this.onStateChange?.());
      this.el.addEventListener('play', () => this.onStateChange?.());
      this.el.addEventListener('pause', () => this.onStateChange?.());
      this.el.addEventListener('timeupdate', () => this.onStateChange?.());
    }
    if (!this.elSource) {
      this.elSource = this.ctx.createMediaElementSource(this.el);
      this.elSource.connect(this.analyser); // route element audio into the graph (and thus speakers)
    }
  }

  async addFiles(files) {
    for (const f of files) {
      this.playlist.push({ name: f.name, url: URL.createObjectURL(f) });
    }
    if (this.index < 0 || this.mode === 'none') this.playIndex(this.playlist.length - files.length);
    this.onTrackChange?.();
  }

  async loadUrl(url) {
    this.playlist.push({ name: url.split('/').pop().split('?')[0] || url, url });
    this.playIndex(this.playlist.length - 1);
  }

  async playIndex(i) {
    if (i < 0 || i >= this.playlist.length) return;
    this.index = i;
    const track = this.playlist[i];
    this._setupElement();
    this.el.src = track.url;
    this.mode = track.url.startsWith('blob:') ? 'file' : 'url';
    try {
      await this.el.play();
    } catch (e) {
      // autoplay block or CORS failure — surface via track change callback
      console.warn('Playback failed:', e);
    }
    this.onTrackChange?.();
  }

  next() { if (this.playlist.length) this.playIndex((this.index + 1) % this.playlist.length); }
  prev() { if (this.playlist.length) this.playIndex((this.index - 1 + this.playlist.length) % this.playlist.length); }

  async togglePlay() {
    this.ensureCtx();
    if (this.mode === 'mic') return;
    if (!this.el) return;
    if (this.el.paused) await this.el.play(); else this.el.pause();
  }

  seek(frac) {
    if (this.el && isFinite(this.el.duration) && this.el.duration > 0) {
      this.el.currentTime = frac * this.el.duration;
    }
  }

  async startMic() {
    this.ensureCtx();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._stopElement();
    this.micStream = stream;
    this.micSource = this.ctx.createMediaStreamSource(stream);
    // route mic to analyser only (avoid feedback: not to destination)
    this.micSource.disconnect();
    this.micSource.connect(this.analyser);
    this.mode = 'mic';
    this.onTrackChange?.();
  }

  _stopMic() {
    if (this.micSource) { try { this.micSource.disconnect(); } catch {} this.micSource = null; }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
  }

  _stopElement() {
    if (this.el) { this.el.pause(); }
  }

  stopMic() {
    this._stopMic();
    this.mode = this.el && this.el.src ? 'file' : 'none';
    this.onTrackChange?.();
  }
}
