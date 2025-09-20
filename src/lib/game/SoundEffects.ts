/**
 * SoundEffects - Handles all game sound effects using Web Audio API
 * Generates pleasant tones without requiring external audio files
 */

export class SoundEffects {
	private audioContext: AudioContext | null = null;
	private isEnabled: boolean = true;

	constructor() {
		this.initializeAudioContext();
	}

	/**
	 * Initialize the Web Audio API context
	 */
	private initializeAudioContext(): void {
		if (typeof globalThis.window === 'undefined') {
			// Skip initialization during SSR
			return;
		}

		try {
			// Create audio context with proper browser compatibility
			const AudioContext =
				globalThis.window.AudioContext ||
				(globalThis.window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			this.audioContext = new AudioContext();
		} catch (error) {
			console.warn('[SoundEffects] Web Audio API not supported:', error);
			this.isEnabled = false;
		}
	}

	/**
	 * Resume audio context if it's suspended (required by browser policies)
	 */
	private async resumeAudioContext(): Promise<void> {
		if (this.audioContext && this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume();
			} catch (error) {
				console.warn('[SoundEffects] Failed to resume audio context:', error);
			}
		}
	}

	/**
	 * Generate a pleasant turn notification sound
	 * Uses a combination of frequencies to create a welcoming chime
	 */
	async playTurnNotification(): Promise<void> {
		if (!this.isEnabled || !this.audioContext) {
			return;
		}

		try {
			await this.resumeAudioContext();

			const currentTime = this.audioContext.currentTime;
			const duration = 0.6; // 600ms duration (longer for more pleasant sound)

			// Create a gentle two-tone chime (C5 and E5 - a major third)
			const frequencies = [523.25, 659.25]; // C5 and E5 in Hz
			const gains = [0.05, 0.03]; // Much softer volumes

			frequencies.forEach((frequency, index) => {
				// Create oscillator for the tone
				const oscillator = this.audioContext!.createOscillator();
				const gainNode = this.audioContext!.createGain();

				// Connect oscillator -> gain -> destination
				oscillator.connect(gainNode);
				gainNode.connect(this.audioContext!.destination);

				// Set up the oscillator
				oscillator.type = 'sine'; // Smooth sine wave for pleasant sound
				oscillator.frequency.setValueAtTime(frequency, currentTime);

				// Create envelope for very smooth attack and decay
				gainNode.gain.setValueAtTime(0, currentTime);
				gainNode.gain.linearRampToValueAtTime(gains[index], currentTime + 0.15); // Slower 150ms attack
				gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration); // Smooth decay

				// Start and stop the oscillator with longer delay
				oscillator.start(currentTime + index * 0.15); // Longer delay between tones
				oscillator.stop(currentTime + duration + index * 0.15);
			});
		} catch (error) {
			console.warn('[SoundEffects] Failed to play turn notification:', error);
		}
	}

	/**
	 * Generate a subtle success sound for winning
	 */
	async playVictorySound(): Promise<void> {
		if (!this.isEnabled || !this.audioContext) {
			return;
		}

		try {
			await this.resumeAudioContext();

			const currentTime = this.audioContext.currentTime;

			// Create an ascending major chord progression (C-E-G-C)
			const frequencies = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
			const gains = [0.08, 0.06, 0.05, 0.09]; // Softer volumes

			frequencies.forEach((frequency, index) => {
				const oscillator = this.audioContext!.createOscillator();
				const gainNode = this.audioContext!.createGain();

				oscillator.connect(gainNode);
				gainNode.connect(this.audioContext!.destination);

				oscillator.type = 'sine'; // Even softer sine wave
				oscillator.frequency.setValueAtTime(frequency, currentTime);

				// Staggered timing for ascending effect
				const startTime = currentTime + index * 0.2; // Slower progression
				const noteLength = 0.7; // Longer notes

				gainNode.gain.setValueAtTime(0, startTime);
				gainNode.gain.linearRampToValueAtTime(gains[index], startTime + 0.1); // Slower attack
				gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);

				oscillator.start(startTime);
				oscillator.stop(startTime + noteLength);
			});
		} catch (error) {
			console.warn('[SoundEffects] Failed to play victory sound:', error);
		}
	}

	/**
	 * Enable or disable sound effects
	 */
	setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
	}

	/**
	 * Get current enabled state
	 */
	getEnabled(): boolean {
		return this.isEnabled;
	}

	/**
	 * Clean up audio context
	 */
	dispose(): void {
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
	}
}

// Create a singleton instance for the entire game
export const soundEffects = new SoundEffects();
