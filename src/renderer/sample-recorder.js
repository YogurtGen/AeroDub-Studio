class SongSampleRecorder {
  static async create(context, stream) {
    await context.audioWorklet.addModule('capture-processor.js');
    return new SongSampleRecorder(context, stream);
  }
  constructor(context, stream) {
    this.context = context; this.state = 'inactive'; this.chunks = []; this.length = 0;
    this.source = context.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(context, 'song-capture', { channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1] });
    this.source.connect(this.node); this.node.connect(context.destination);
    this.node.onprocessorerror = () => this.onerror?.(new Error('micError'));
    this.node.port.onmessage = ({ data }) => {
      if (data.type === 'started') this.started?.(data.frame / context.sampleRate);
      if (data.type === 'samples') { this.chunks.push(data.samples); this.length += data.samples.length; }
      if (data.type === 'stopped') { this.state = 'inactive'; this.onstop?.(); }
    };
  }
  start() {
    this.state = 'recording';
    return new Promise(resolve => { this.started = resolve; this.node.port.postMessage({ type: 'start' }); });
  }
  stop(at = this.context.currentTime) {
    if (this.state !== 'recording') return;
    this.node.port.postMessage({ type: 'stop', frame: Math.ceil(at * this.context.sampleRate) });
  }
  bytes() {
    const bytes = new Uint8Array(44 + this.length * 2), view = new DataView(bytes.buffer);
    const text = (at, value) => [...value].forEach((letter, i) => view.setUint8(at + i, letter.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, this.context.sampleRate, true); view.setUint32(28, this.context.sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, bytes.length - 44, true);
    let offset = 44;
    for (const chunk of this.chunks) { bytes.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset); offset += chunk.byteLength; }
    return bytes;
  }
  close() { this.started?.(null); this.source.disconnect(); this.node.disconnect(); this.node.port.close(); this.chunks = []; }
}
window.SongSampleRecorder = SongSampleRecorder;
