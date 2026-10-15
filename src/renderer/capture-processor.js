class SongCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super(); this.active = false; this.buffer = new Int16Array(4096); this.used = 0; this.frames = 0; this.stopFrame = Infinity;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'start') { this.active = true; this.firstFrame = null; }
      if (data.type === 'stop') this.stopFrame = data.frame ?? currentFrame;
    };
  }
  flush() {
    if (!this.used) return;
    const samples = this.buffer.slice(0, this.used);
    this.port.postMessage({ type: 'samples', samples }, [samples.buffer]); this.used = 0;
  }
  process(inputs, outputs) {
    if (!this.active) return true;
    if (this.firstFrame === null) { this.firstFrame = currentFrame; this.port.postMessage({ type: 'started', frame: currentFrame }); }
    const channel = inputs[0]?.[0], length = outputs[0][0].length;
    for (let i = 0; i < length; i++) {
      if (currentFrame + i >= this.stopFrame || this.frames >= sampleRate * 3610) {
        this.flush(); this.active = false; this.port.postMessage({ type: 'stopped' }); return true;
      }
      const value = Math.max(-1, Math.min(1, channel?.[i] || 0));
      this.buffer[this.used++] = Math.round(value * (value < 0 ? 32768 : 32767)); this.frames++;
      if (this.used === this.buffer.length) this.flush();
    }
    return true;
  }
}
registerProcessor('song-capture', SongCaptureProcessor);
