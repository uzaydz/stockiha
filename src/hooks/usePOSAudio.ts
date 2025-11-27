import { useCallback, useRef, useEffect } from 'react';

export const usePOSAudio = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on first user interaction or mount
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        }
    }, []);

    const playTone = useCallback((frequency: number, type: OscillatorType, duration: number) => {
        if (!audioContextRef.current) return;

        // Resume context if suspended (browser policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

        gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + duration);
    }, []);

    const playSuccess = useCallback(() => {
        playTone(800, 'sine', 0.1);
        setTimeout(() => playTone(1200, 'sine', 0.2), 100);
    }, [playTone]);

    const playError = useCallback(() => {
        playTone(300, 'sawtooth', 0.3);
    }, [playTone]);

    const playClick = useCallback(() => {
        playTone(600, 'sine', 0.05);
    }, [playTone]);

    const playAddToCart = useCallback(() => {
        playTone(1000, 'sine', 0.1);
    }, [playTone]);

    return {
        playSuccess,
        playError,
        playClick,
        playAddToCart
    };
};
