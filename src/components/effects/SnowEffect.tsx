import React, { useEffect, useRef } from 'react';

const SnowEffect: React.FC<{ className?: string }> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Float32Array; // x, y, size, speed, sway, opacity
        const PARTICLE_COUNT = 150;
        const DATA_PER_PARTICLE = 6;

        let width = 0;
        let height = 0;
        let time = 0;

        // Pre-render snowflake to offscreen canvas for performance
        const flakeCanvas = document.createElement('canvas');
        flakeCanvas.width = 32;
        flakeCanvas.height = 32;
        const flakeCtx = flakeCanvas.getContext('2d');
        if (flakeCtx) {
            const grad = flakeCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            flakeCtx.fillStyle = grad;
            flakeCtx.beginPath();
            flakeCtx.arc(16, 16, 16, 0, Math.PI * 2);
            flakeCtx.fill();
        }

        const initParticles = () => {
            particles = new Float32Array(PARTICLE_COUNT * DATA_PER_PARTICLE);
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                resetParticle(i, true);
            }
        };

        const resetParticle = (i: number, randomY = false) => {
            const idx = i * DATA_PER_PARTICLE;

            // Premium Distribution: More small, few large
            const sizeRandom = Math.pow(Math.random(), 3); // Bias towards smaller
            const size = 1 + sizeRandom * 5; // Size 1 to 6

            particles[idx] = Math.random() * width; // x
            particles[idx + 1] = randomY ? Math.random() * height : -20; // y
            particles[idx + 2] = size; // size
            particles[idx + 3] = 0.5 + sizeRandom * 1.5; // speed (larger = faster)
            particles[idx + 4] = Math.random() * Math.PI * 2; // sway offset
            particles[idx + 5] = 0.1 + Math.random() * 0.4; // opacity
        };

        const updateSize = () => {
            if (canvas) {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
            }
        };

        updateSize();
        initParticles();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            time += 0.01;
            const globalWind = Math.sin(time * 0.5) * 0.5;

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const idx = i * DATA_PER_PARTICLE;

                let x = particles[idx];
                let y = particles[idx + 1];
                const size = particles[idx + 2];
                const speed = particles[idx + 3];
                const swayOffset = particles[idx + 4];
                const opacity = particles[idx + 5];

                // Update gravity
                y += speed;

                // Update sway & wind
                x += Math.sin(time + swayOffset) * 0.5 + globalWind;

                // Reset boundaries
                if (y > height + 20) {
                    resetParticle(i, false);
                    y = -20; // Ensure it starts from top immediately
                    particles[idx + 1] = y;
                }

                // Wrap horizontal
                if (x > width + 20) x = -20;
                else if (x < -20) x = width + 20;

                // Store updated position
                particles[idx] = x;
                particles[idx + 1] = y;

                // Draw using pre-rendered flake
                // To apply opacity, we can use globalAlpha, but switching it 150 times is okay-ish?
                // Better: Batch draw? No, simpler to just use globalAlpha for now, it's hardware accelerated.
                ctx.globalAlpha = opacity;
                ctx.drawImage(flakeCanvas, x - size, y - size, size * 2, size * 2);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            updateSize();
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate normalized mouse X position (-1 to 1)
            const mouseX = (e.clientX / width) * 2 - 1;
            // Add to global time to shift wind phase, or just influence the wind variable directly
            // A simple approach: target wind follows mouse
            // But 'time' drives the sine wave. Let's just create a target wind offset.
            // For simplicity in this tight loop, we can't easily inject a new variable without state or ref.
            // We'll skip complex mouse wind for now to keep performance ABSOLUTELY pristine as requested.
            // The user emphasized "Performance" over complex interactivity. 
            // "Improve its performance very much to be non-impactful" -> Adding event listeners and calculations might go against this if not careful.
            // I will stick to the automated wind which is smoother and less erratic.
        };

        window.addEventListener('resize', handleResize);
        // window.addEventListener('mousemove', handleMouseMove);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            // window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-[9999] opacity-80 ${className || ''}`}
            style={{
                // Force GPU acceleration
                transform: 'translateZ(0)',
                willChange: 'transform'
            }}
        />
    );
};

export default SnowEffect;
