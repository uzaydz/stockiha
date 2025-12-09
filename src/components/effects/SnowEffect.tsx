import React, { useEffect, useRef } from 'react';

const SnowEffect: React.FC<{ className?: string }> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Float32Array; // x, y, z(depth), swayOffset, localWind
        const PARTICLE_COUNT = 100; // Optimized count
        const DATA_PER_PARTICLE = 5;

        // Pile Logic - Optimized & Beautified
        let snowPile: Float32Array;
        const SNOW_PILE_RESOLUTION = 6; // Sharper resolution for better shape
        const MAX_ACCUMULATION = 80; // Higher capacity as requested
        const ACCUMULATION_SPEED = 0.5; // Faster build-up
        const SMOOTHING_FACTOR = 0.6; // Higher smoothing for "perfect" drifts

        let width = 0;
        let height = 0;
        let time = 0;
        let globalWind = 0;

        const initParticles = () => {
            particles = new Float32Array(PARTICLE_COUNT * DATA_PER_PARTICLE);
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                resetParticle(i, true);
            }
        };

        const resetParticle = (i: number, randomY = false) => {
            const idx = i * DATA_PER_PARTICLE;
            const depth = Math.random();

            particles[idx] = Math.random() * width; // x
            particles[idx + 1] = randomY ? Math.random() * height : -10; // y
            particles[idx + 2] = depth; // z (depth)
            particles[idx + 3] = Math.random() * Math.PI * 2; // sway offset
            particles[idx + 4] = (Math.random() - 0.5) * 0.2; // local wind variance
        };

        const updateSize = () => {
            if (canvas) {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;

                // Re-init pile
                const pileSize = Math.ceil(width / SNOW_PILE_RESOLUTION) + 2;
                snowPile = new Float32Array(pileSize);
            }
        };

        updateSize();
        initParticles();

        const animate = () => {
            // Optimization: Use clearRect instead of resetting width/height
            ctx.clearRect(0, 0, width, height);

            time += 0.005;
            globalWind = Math.sin(time * 0.5) * 0.2; // Gentler wind

            // --- 1. Draw Snow Pile (Premium & Soft) ---
            let hasSnow = false;
            ctx.beginPath();

            // Start from bottom-left
            ctx.moveTo(0, height);

            // Draw curve

            for (let x = 0; x < snowPile.length; x++) {
                const h = snowPile[x];
                if (h > 0.5) hasSnow = true; // Threshold check

                const realX = x * SNOW_PILE_RESOLUTION;

                if (x === 0) {
                    ctx.lineTo(realX, height - h);
                } else {
                    // Smooth curve using cubic interpolation basics (midpoint)
                    const prevH = snowPile[x - 1];
                    const prevX = (x - 1) * SNOW_PILE_RESOLUTION;
                    const midX = (prevX + realX) / 2;
                    const midY = height - (prevH + h) / 2;

                    ctx.quadraticCurveTo(prevX, height - prevH, midX, midY);

                    if (x === snowPile.length - 1) {
                        ctx.lineTo(realX, height - h);
                    }
                }
            }

            if (hasSnow) {
                ctx.lineTo(width, height);
                ctx.closePath();

                // Premium Icy Gradient
                const gradient = ctx.createLinearGradient(0, height - MAX_ACCUMULATION, 0, height);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
                gradient.addColorStop(0.3, 'rgba(240, 248, 255, 0.6)'); // Soft icy top
                gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.85)'); // Solid middle
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)'); // Solid base

                ctx.fillStyle = gradient;

                // Add a soft glow to the top of the pile
                ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
                ctx.shadowBlur = 15;
                ctx.shadowOffsetY = 0;

                ctx.fill();

                // Reset shadow for particles
                ctx.shadowBlur = 0;
                ctx.shadowColor = "transparent";
            }

            // --- 2. Update & Draw Particles ---
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Base color

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const idx = i * DATA_PER_PARTICLE;
                let x = particles[idx];
                let y = particles[idx + 1];
                const depth = particles[idx + 2];
                const swayOffset = particles[idx + 3];

                // 🌟 IMPROVED PHYSICS 🌟
                // Slower = Classier
                const speed = 0.2 + depth * 0.4; // Significantly slower
                const radius = 0.5 + depth * 1.5; // Varied sizes (0.5px to 2px)
                const opacity = 0.1 + depth * 0.5; // Transparency varies

                // Position Update
                y += speed;
                const sway = Math.sin(time + swayOffset) * (0.3 + depth * 0.3);
                x += sway + globalWind;

                // --- Collision with Pile ---
                let pileIdx = Math.floor(x / SNOW_PILE_RESOLUTION);
                if (pileIdx < 0) pileIdx = 0;
                if (pileIdx >= snowPile.length) pileIdx = snowPile.length - 1;

                const pileHeight = snowPile[pileIdx];

                if (y >= height - pileHeight) {
                    // Accumulate?
                    if (pileHeight < MAX_ACCUMULATION) {
                        const amt = ACCUMULATION_SPEED * depth;
                        snowPile[pileIdx] += amt;

                        // Enhanced Diffusion for "Perfect" Shapes
                        // Spread mostly to lower neighbors to simulate gravity/slides
                        const left = pileIdx > 0 ? pileIdx - 1 : pileIdx;
                        const right = pileIdx < snowPile.length - 1 ? pileIdx + 1 : pileIdx;

                        // Simple 3-pass smoothing window
                        if (pileIdx > 0) snowPile[left] += amt * SMOOTHING_FACTOR;
                        if (pileIdx < snowPile.length - 1) snowPile[right] += amt * SMOOTHING_FACTOR;
                    }
                    resetParticle(i, false);
                } else if (x > width + 5 || x < -5) {
                    if (x > width + 5) particles[idx] = -5;
                    else particles[idx] = width + 5;
                } else {
                    particles[idx] = x;
                    particles[idx + 1] = y;

                    // Draw
                    ctx.beginPath();
                    // Optimization: Smaller radius is cheaper
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    // Inline alpha for performance avoid regex parsing if possible, 
                    // but template string is fast enough here
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.fill();
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            updateSize();
            initParticles();
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-[9999] bg-transparent ${className || ''}`}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        />
    );
};

export default SnowEffect;
