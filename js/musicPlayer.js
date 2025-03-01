export class MusicPlayer {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.originalBuffer = null; // 正向缓冲
    this.reversedBuffer = null; // 反向缓冲
    this.currentSource = null;  // 当前正在播放的 AudioBufferSourceNode
    this.currentType = null;    // "forward" 或 "reverse"
    this.playbackRate = 1.0;
    this.playbackStartTime = 0; // AudioContext.currentTime
    this.offset = 0;            // 当前播放起始偏移（秒）
  }

  startSource(type, rate, offset) {
    const buffer = (type === "forward") ? this.originalBuffer : this.reversedBuffer;
    if (!buffer) return;
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    source.playbackRate.value = rate;
    source.connect(this.audioCtx.destination);
    source.start(0, offset);
    this.currentSource = source;
    this.currentType = type;
    this.playbackRate = rate;
    this.playbackStartTime = this.audioCtx.currentTime;
    this.offset = offset;
  }

  stopSource() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }

  getCurrentPlaybackTime() {
    if (!this.currentSource) return 0;
    const elapsed = (this.audioCtx.currentTime - this.playbackStartTime) * this.playbackRate;
    const duration = (this.currentType === "forward") ? this.originalBuffer.duration : this.reversedBuffer.duration;
    let currentTime = (this.offset + elapsed) % duration;
    if (this.currentType === "reverse") {
      currentTime = duration - currentTime;
    }
    return currentTime;
  }

  update(desiredType, desiredRate) {
    if (!this.currentSource) {
      this.startSource(desiredType, desiredRate, 0);
      return;
    }
    if (this.currentType !== desiredType) {
      const currentTime = this.getCurrentPlaybackTime();
      this.stopSource();
      const newOffset = (desiredType === "forward") ? currentTime : (this.originalBuffer.duration - currentTime);
      this.startSource(desiredType, desiredRate, newOffset);
    } else {
      if (Math.abs(this.playbackRate - desiredRate) > 0.1) {
        const currentTime = this.getCurrentPlaybackTime();
        this.stopSource();
        const newOffset = (this.currentType === "forward") ? currentTime : (this.originalBuffer.duration - currentTime);
        this.startSource(desiredType, desiredRate, newOffset);
      } else {
        this.currentSource.playbackRate.value = desiredRate;
        this.playbackRate = desiredRate;
      }
    }
  }
}
