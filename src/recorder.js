// Canvas + audio recording to WebM, and PNG screenshots.

export class Recorder {
  constructor(canvas, getAudioStream) {
    this.canvas = canvas;
    this.getAudioStream = getAudioStream;
    this.rec = null;
    this.chunks = [];
  }

  get recording() { return !!this.rec; }

  start() {
    if (this.rec) return;
    const stream = this.canvas.captureStream(60);
    const audioStream = this.getAudioStream?.();
    if (audioStream) for (const track of audioStream.getAudioTracks()) stream.addTrack(track);
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const d = new Date();
      a.download = `visualizer-${d.toISOString().replace(/[:.]/g, '-')}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    this.rec.start(250);
  }

  stop() {
    if (!this.rec) return;
    this.rec.stop();
    this.rec = null;
  }

  toggle() { this.recording ? this.stop() : this.start(); return this.recording; }
}

export function screenshot(renderer) {
  // render one frame with preserveDrawingBuffer-friendly path: re-render then capture
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `visualizer-${Date.now()}.png`;
  a.click();
}
