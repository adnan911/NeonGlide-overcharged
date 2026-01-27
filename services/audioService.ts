
class AudioService {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number) {
    if (!this.enabled || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playJump() {
    this.playTone(440, 'sine', 0.1);
  }

  playDeath() {
    this.playTone(100, 'sawtooth', 0.3);
  }

  playScore() {
    this.playTone(880, 'square', 0.05);
  }
}

export const audioService = new AudioService();
