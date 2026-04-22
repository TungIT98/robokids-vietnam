/**
 * Text-to-Speech service using Web Speech API
 * Provides Vietnamese language support for RoboBuddy AI tutor
 */

interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class TTSService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded: boolean = false;
  private muted: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();

    // Voices may load asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    this.isLoaded = this.voices.length > 0;
  }

  /**
   * Get the best Vietnamese voice available
   */
  private getVietnameseVoice(): SpeechSynthesisVoice | null {
    // Prefer Vietnamese voices
    const vi = this.voices.find(v => v.lang.startsWith('vi'));
    if (vi) return vi;

    // Fall back to any Vietnamese-compatible voice
    const viLike = this.voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viLike) return viLike;

    // Default to any Vietnamese-adjacent Asian voice
    const asian = this.voices.find(v => v.lang.startsWith('zh') || v.lang.startsWith('ja') || v.lang.startsWith('ko'));
    if (asian) return asian;

    // Last resort: any available voice
    return this.voices[0] || null;
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return this.isLoaded && !this.synth.paused && !this.muted;
  }

  /**
   * Speak text aloud
   */
  speak(text: string, options: TTSOptions = {}): void {
    if (this.muted) return;

    this.stop(); // Stop any ongoing speech

    const {
      lang = 'vi-VN',
      rate = 0.95,
      pitch = 1.0,
      volume = 1.0
    } = options;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const vietnameseVoice = this.getVietnameseVoice();
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }

    this.synth.speak(utterance);
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Mute TTS output
   */
  mute(): void {
    this.muted = true;
    this.stop();
  }

  /**
   * Unmute TTS output
   */
  unmute(): void {
    this.muted = false;
  }

  /**
   * Check if currently muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;