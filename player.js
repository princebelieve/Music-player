(function() {
    'use strict';

    // ============================================================
    // DOM REFS
    // ============================================================
    const lyricDisplay = document.getElementById('lyricDisplay');
    const statusText = document.getElementById('statusText');
    const timestampEl = document.getElementById('timestamp');
    const playBtn = document.getElementById('playBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const container = document.getElementById('videoContainer');
    const visualizer = document.getElementById('visualizer');
    const particleCanvas = document.getElementById('particleCanvas');
    const fireCanvas = document.getElementById('fireCanvas');
    const fireBlast = document.getElementById('fireBlast');
    const ctxParticle = particleCanvas.getContext('2d');
    const ctxFire = fireCanvas.getContext('2d');
    const speakerLeft = document.getElementById('speakerLeft');
    const speakerRight = document.getElementById('speakerRight');

    // ============================================================
    // STATE
    // ============================================================
    let lyrics = [];
    let isPlaying = false;
    let currentLyricIndex = -1;
    let animationId = null;
    let audioLoaded = false;
    let currentTime = 0;
    let lastLyricText = '';
    let fireIntensity = 0;
    let fireTargetIntensity = 0;
    let fireExplosionActive = false;

    // ============================================================
    // BUILD VISUALIZER
    // ============================================================
    const NUM_BARS = 25;
    for (let i = 0; i < NUM_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = (3 + Math.random() * 10) + 'px';
        visualizer.appendChild(bar);
    }
    const bars = document.querySelectorAll('.bar');

    // ============================================================
    // FIRE PARTICLES - BIGGER EXPLOSION! 🔥
    // ============================================================
    let fireParticles = [];
    const MAX_FIRE_PARTICLES = 500;

    class FireParticle {
        constructor(x, y, intensity, isExplosion = false) {
            const power = isExplosion ? intensity * 2.5 : intensity;
            this.x = x || Math.random() * fireCanvas.width;
            this.y = y || fireCanvas.height * (0.5 + Math.random() * 0.5);
            this.size = 3 + Math.random() * 12 * power;
            const spread = isExplosion ? 4 : 1.5;
            this.speedX = (Math.random() - 0.5) * 6 * power * spread;
            this.speedY = -(2 + Math.random() * 8) * power;
            this.life = 1;
            this.maxLife = (20 + Math.random() * 80) * power;
            this.hue = 10 + Math.random() * 40;
            this.saturation = 100;
            this.lightness = 50 + Math.random() * 40;
            this.opacity = 0.6 + Math.random() * 0.4;
            this.isExplosion = isExplosion;
            this.gravity = isExplosion ? -0.08 : -0.03;
        }

        update() {
            this.x += this.speedX + (Math.random() - 0.5) * 2;
            this.y += this.speedY;
            this.speedY += this.gravity;
            this.speedX *= 0.99;
            this.life++;
            this.opacity = (1 - this.life / this.maxLife) * 0.9;
            this.size *= 0.99;
            this.lightness = 50 + 40 * (1 - this.life / this.maxLife);
            this.hue += 0.5;
            return this.life < this.maxLife && this.y > -50 && this.y < fireCanvas.height + 50;
        }

        draw(ctx) {
            const alpha = this.opacity * (1 - this.life / this.maxLife);
            const size = this.size * (1 + 0.5 * (1 - this.life / this.maxLife));
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha})`;
            ctx.fill();
            
            // GLOW
            if (this.isExplosion) {
                ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, ${alpha * 0.8})`;
                ctx.shadowBlur = 40;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    function spawnFire(intensity, isExplosion = false) {
        const numSparks = isExplosion 
            ? Math.floor(80 + 120 * intensity)  // BIG EXPLOSION!
            : Math.floor(15 + 40 * intensity);
        
        const width = fireCanvas.width;
        const height = fireCanvas.height;
        
        // Spawn from speakers with BIG blast
        const speakerPositions = [
            { x: 60, y: height * 0.65 },
            { x: width - 60, y: height * 0.65 }
        ];
        
        for (let pos of speakerPositions) {
            for (let i = 0; i < numSparks * 0.5; i++) {
                const offsetX = (Math.random() - 0.5) * (isExplosion ? 80 : 40);
                const offsetY = (Math.random() - 0.5) * (isExplosion ? 60 : 30);
                fireParticles.push(new FireParticle(
                    pos.x + offsetX,
                    pos.y + offsetY,
                    intensity,
                    isExplosion
                ));
            }
        }
        
        // Extra explosion particles spread wider
        if (isExplosion) {
            for (let i = 0; i < numSparks * 0.3; i++) {
                fireParticles.push(new FireParticle(
                    Math.random() * width,
                    height * (0.5 + Math.random() * 0.4),
                    intensity * 1.2,
                    true
                ));
            }
        }
        
        // Bottom fire
        for (let i = 0; i < numSparks * 0.3; i++) {
            fireParticles.push(new FireParticle(
                Math.random() * width,
                height * (0.85 + Math.random() * 0.15),
                intensity * 0.7,
                false
            ));
        }

        // Limit particles
        if (fireParticles.length > MAX_FIRE_PARTICLES) {
            fireParticles = fireParticles.slice(-MAX_FIRE_PARTICLES);
        }
    }

    function updateFire() {
        // Smooth intensity
        fireIntensity += (fireTargetIntensity - fireIntensity) * 0.08;
        
        ctxFire.clearRect(0, 0, fireCanvas.width, fireCanvas.height);
        
        if (fireIntensity > 0.01) {
            const isExplosion = fireIntensity > 0.7;
            spawnFire(fireIntensity, isExplosion);
            
            fireParticles = fireParticles.filter(p => p.update());
            fireParticles.forEach(p => p.draw(ctxFire));
            
            fireCanvas.classList.add('active');
            speakerLeft.classList.add('fire');
            speakerRight.classList.add('fire');
            
            // Fire blast overlay
            if (isExplosion) {
                fireBlast.classList.add('active');
            } else {
                fireBlast.classList.remove('active');
            }
        } else {
            fireCanvas.classList.remove('active');
            speakerLeft.classList.remove('fire');
            speakerRight.classList.remove('fire');
            fireBlast.classList.remove('active');
            fireParticles = [];
        }
    }

    // ============================================================
    // PARTICLES (Background)
    // ============================================================
    let particles = [];

    function resizeCanvases() {
        const rect = container.getBoundingClientRect();
        particleCanvas.width = rect.width;
        particleCanvas.height = rect.height;
        fireCanvas.width = rect.width;
        fireCanvas.height = rect.height;
    }

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
            this.size = 1 + Math.random() * 2.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = -0.1 - Math.random() * 0.3;
            this.opacity = 0.1 + Math.random() * 0.2;
            this.color = `hsla(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%, ${this.opacity})`;
            this.life = 0;
            this.maxLife = 150 + Math.random() * 200;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life++;
            if (this.life > this.maxLife || this.y < -20) {
                this.reset();
                this.y = particleCanvas.height + 20;
            }
        }
        draw() {
            ctxParticle.beginPath();
            ctxParticle.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctxParticle.fillStyle = this.color;
            ctxParticle.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 60; i++) {
            const p = new Particle();
            p.y = Math.random() * particleCanvas.height;
            particles.push(p);
        }
    }

    function animateParticles() {
        ctxParticle.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }

    resizeCanvases();
    initParticles();
    animateParticles();
    window.addEventListener('resize', resizeCanvases);

    // ============================================================
    // LOAD LRC
    // ============================================================
    function loadLRC(filePath) {
        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error('LRC not found');
                return response.text();
            })
            .then(text => {
                parseLRC(text);
                lyricDisplay.innerHTML = '🎵 <span class="highlight">Honour The Son uhn</span>';
                lyricDisplay.classList.add('show');
                console.log(`✅ LRC loaded: ${lyrics.length} lyrics`);
            })
            .catch(() => {
                useFallbackLyrics();
            });
    }

    function parseLRC(text) {
        const lines = text.split('\n');
        const result = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
        
        for (let line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const centiseconds = parseInt(match[3]);
                let time = minutes * 60 + seconds + centiseconds / 100;
                // REDUCE TIMESTAMP BY 1 SECOND
                time = time - 1.0;
                if (time < 0) time = 0;
                const textContent = line.replace(timeRegex, '').trim();
                if (textContent) {
                    result.push({ time, text: textContent });
                }
            }
        }
        
        if (result.length === 0) throw new Error('No lyrics found');
        lyrics = result;
    }

    function useFallbackLyrics() {
        const fallback = [
            { time: 4, text: 'Honour The Son uhn' },
            { time: 13, text: 'Oseneblanabame…' },
            { time: 15, text: 'Abanabame…' },
            { time: 17, text: 'Abanabame' },
            { time: 19, text: 'Abanabame.' },
            { time: 21, text: 'Oseneblanabame…' },
            { time: 23, text: 'Abanabame…' },
            { time: 25, text: 'Abanabame' },
            { time: 28, text: 'Abanabame.' },
            { time: 30, text: 'Oseneblanabame' },
            { time: 32, text: 'Nobi collect I come collect' },
            { time: 34, text: 'I come shout alleluia' },
            { time: 36, text: 'Aba naba me' },
            { time: 38, text: 'Be ne san re gba ba hion' },
            { time: 40, text: 'Be ne Esan re gbabonelimi' },
            { time: 43, text: 'I come shout alleluia' },
            { time: 45, text: 'To Aba naba me' },
            { time: 48, text: 'Anything You do for us today oh' },
            { time: 52, text: 'Anhan anhan ahan han' },
            { time: 55, text: 'Na bonus ooo' },
            { time: 57, text: 'Anhan anhan ahan han' },
            { time: 62, text: 'Na bonus oo' },
            { time: 64, text: 'Baba me, I know say' },
            { time: 66, text: 'Even though we ask for nothing' },
            { time: 69, text: 'Say You go must do something when!' },
            { time: 71, text: 'Abanabame' },
            { time: 72, text: 'Because when praises go up' },
            { time: 75, text: 'Your blessings must come down' },
            { time: 77, text: 'So we come shout alleluia when!' },
            { time: 79, text: 'Abanabame' },
            { time: 82, text: 'Anything You do for us today oh' },
            { time: 86, text: 'Anhan anhan ahan han' },
            { time: 88, text: 'Na bonus ooo' },
            { time: 91, text: 'Anhan anhan ahan han' },
            { time: 97, text: 'Na bonus oo' },
            { time: 104, text: 'Oseneblanabame…' },
            { time: 106, text: 'Abanabame…' },
            { time: 108, text: 'Abanabame…' },
            { time: 110, text: 'Abanabame…' },
            { time: 112, text: 'Oseneblanabame…' },
            { time: 114, text: 'Abanabame…' },
            { time: 117, text: 'Abanabame…' },
            { time: 119, text: 'Alleluia…' },
            { time: 119.5, text: 'Alleluia…' },
            { time: 123, text: 'Anything You do for us today oh' },
            { time: 127, text: 'Anhan anhan ahan han' },
            { time: 129, text: 'Na bonus ooo' },
            { time: 132, text: 'Anhan anhan ahan han' },
            { time: 138, text: 'Na bonus oo' },
            { time: 140, text: 'Abanabame…' },
            { time: 143, text: 'Abanabame…' },
            { time: 144, text: 'Abanabame…' },
            { time: 147, text: 'Oseneblanabame…' },
            { time: 149, text: 'Abanabame…' },
            { time: 151, text: 'Abanabame…' },
            { time: 153, text: 'Alleluia…' }
        ];
        lyrics = fallback;
        lyricDisplay.innerHTML = '🎵 <span class="highlight">Honour The Son uhn</span>';
        lyricDisplay.classList.add('show');
    }

    // ============================================================
    // LOAD AUDIO
    // ============================================================
    function loadAudio(filePath) {
        audioPlayer.src = filePath;
        audioPlayer.load();
        audioLoaded = true;
        audioPlayer.addEventListener('error', () => {
            statusText.textContent = '⚠️ Audio not found';
        });
    }

    // ============================================================
    // CHECK FOR FIRE TRIGGERS - BIGGER EXPLOSION!
    // ============================================================
    function checkFireTriggers(text) {
        const lower = text.toLowerCase();
        if (lower.includes('na bonus')) {
            fireTargetIntensity = 1.0;  // FULL FIRE EXPLOSION!
            fireExplosionActive = true;
        } else if (lower.includes('alleluia')) {
            fireTargetIntensity = 0.9;
            fireExplosionActive = true;
        } else if (lower.includes('abanabame')) {
            fireTargetIntensity = 0.5;
            fireExplosionActive = false;
        } else if (lower.includes('oseneblanabame')) {
            fireTargetIntensity = 0.4;
            fireExplosionActive = false;
        } else {
            fireTargetIntensity = 0.05;
            fireExplosionActive = false;
        }
    }

    // ============================================================
    // UPDATE LYRIC
    // ============================================================
    function updateLyric(time) {
        if (lyrics.length === 0) return;
        
        let foundIndex = -1;
        for (let i = lyrics.length - 1; i >= 0; i--) {
            if (time >= lyrics[i].time) {
                foundIndex = i;
                break;
            }
        }

        if (foundIndex === -1) {
            if (time < lyrics[0]?.time && lyricDisplay.textContent !== lyrics[0]?.text) {
                setLyric(lyrics[0], 0);
            }
            return;
        }

        if (foundIndex !== currentLyricIndex) {
            currentLyricIndex = foundIndex;
            const lyric = lyrics[foundIndex];
            setLyric(lyric, foundIndex);
            checkFireTriggers(lyric.text);
        }
    }

    function setLyric(lyric, index) {
        const newText = lyric.text;
        if (newText === lastLyricText) return;
        
        lastLyricText = newText;
        
        lyricDisplay.classList.remove('show', 'anim-in');
        lyricDisplay.classList.add('anim-out');
        
        setTimeout(() => {
            let displayText = newText;
            // HIGHLIGHT all important words
            displayText = displayText.replace(/alleluia/gi, '<span class="highlight">alleluia</span>');
            displayText = displayText.replace(/Na bonus/g, '<span class="highlight">Na bonus</span>');
            displayText = displayText.replace(/(bonus o+)/gi, '<span class="highlight">$1</span>');
            displayText = displayText.replace(/Abanabame/g, '<span class="highlight">Abanabame</span>');
            displayText = displayText.replace(/Oseneblanabame/g, '<span class="highlight">Oseneblanabame</span>');
            
            lyricDisplay.innerHTML = displayText;
            lyricDisplay.classList.remove('anim-out');
            lyricDisplay.classList.add('show', 'anim-in');
        }, 250);
    }

    // ============================================================
    // UPDATE VISUALIZER
    // ============================================================
    function updateVisualizer(time, intensity) {
        const baseIntensity = intensity || 0.5;
        bars.forEach((bar, i) => {
            const freq = 0.8 + (i / NUM_BARS) * 1.5;
            const phase = (i / NUM_BARS) * Math.PI * 2;
            const value = 5 + 50 * baseIntensity * (0.5 + 0.5 * Math.sin(time * freq + phase));
            bar.style.height = Math.max(3, value) + 'px';
            
            const brightness = 40 + 50 * baseIntensity;
            const hue = fireIntensity > 0.5 
                ? 15 + 25 * Math.sin(time * 0.3 + i * 0.1)
                : 40 + 15 * Math.sin(time * 0.3 + i * 0.1);
            
            bar.style.background = `linear-gradient(to top, 
                hsl(${hue}, 100%, ${brightness - 15}%), 
                hsl(${hue + 10}, 100%, ${brightness + 10}%))`;
        });
    }

    // ============================================================
    // MAIN RENDER LOOP
    // ============================================================
    function render() {
        if (!isPlaying) return;

        if (audioLoaded && !audioPlayer.paused && audioPlayer.currentTime > 0) {
            currentTime = audioPlayer.currentTime;
        } else {
            currentTime += 0.016;
        }

        updateLyric(currentTime);

        const mins = Math.floor(currentTime / 60);
        const secs = Math.floor(currentTime % 60);
        timestampEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const intensity = audioLoaded && !audioPlayer.paused 
            ? 0.7 + 0.3 * Math.sin(currentTime * 0.5) 
            : 0.2;
        updateVisualizer(currentTime, intensity);

        // UPDATE FIRE
        updateFire();

        if (audioLoaded && !audioPlayer.paused) {
            statusText.textContent = `▶ ${mins}:${String(secs).padStart(2, '0')}`;
        }

        const lastTime = lyrics.length > 0 ? lyrics[lyrics.length - 1].time : 0;
        if (currentTime > lastTime + 3 && lastTime > 0) {
            pausePlayback();
            statusText.textContent = '✅ FINISHED';
            lyricDisplay.innerHTML = '🎶 <span class="highlight">Amen! 🙌</span>';
            lyricDisplay.classList.add('show');
            fireTargetIntensity = 0;
            return;
        }

        animationId = requestAnimationFrame(render);
    }

    // ============================================================
    // CONTROLS
    // ============================================================
    function startPlayback() {
        if (isPlaying) return;

        const lastTime = lyrics.length > 0 ? lyrics[lyrics.length - 1].time : 0;
        if (currentTime > lastTime + 2 && lastTime > 0) {
            currentTime = 0;
            if (audioLoaded) audioPlayer.currentTime = 0;
            lastLyricText = '';
            currentLyricIndex = -1;
            lyricDisplay.classList.remove('show', 'anim-in', 'anim-out');
            lyricDisplay.innerHTML = '🎵 <span class="highlight">Honour The Son uhn</span>';
            setTimeout(() => {
                lyricDisplay.classList.add('show');
            }, 100);
        }

        isPlaying = true;
        playBtn.textContent = '⏸ PAUSE';
        statusText.textContent = '▶ playing...';

        if (audioLoaded && audioPlayer.src) {
            audioPlayer.play().catch(() => {
                statusText.textContent = '⚠️ Audio error';
            });
        }

        render();
    }

    function pausePlayback() {
        if (!isPlaying) return;
        isPlaying = false;
        playBtn.textContent = '▶ PLAY';
        statusText.textContent = '⏸ paused';
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (audioLoaded) audioPlayer.pause();
        fireTargetIntensity = 0;
    }

    function resetPlayback() {
        pausePlayback();
        currentTime = 0;
        currentLyricIndex = -1;
        lastLyricText = '';
        fireTargetIntensity = 0;
        fireIntensity = 0;
        fireParticles = [];
        if (audioLoaded) {
            audioPlayer.currentTime = 0;
            audioPlayer.pause();
        }
        timestampEl.textContent = '00:00';
        statusText.textContent = '⟳ reset • press PLAY';
        lyricDisplay.classList.remove('show', 'anim-in', 'anim-out');
        lyricDisplay.innerHTML = '🎵 <span class="highlight">Honour The Son uhn</span>';
        setTimeout(() => {
            lyricDisplay.classList.add('show');
        }, 100);
        bars.forEach(bar => {
            bar.style.height = '5px';
        });
        playBtn.textContent = '▶ PLAY';
        fireCanvas.classList.remove('active');
        speakerLeft.classList.remove('fire');
        speakerRight.classList.remove('fire');
        fireBlast.classList.remove('active');
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    playBtn.addEventListener('click', () => {
        if (isPlaying) pausePlayback();
        else startPlayback();
    });

    resetBtn.addEventListener('click', resetPlayback);
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Space') {
            e.preventDefault();
            if (isPlaying) pausePlayback();
            else startPlayback();
        }
        if (e.key === 'r' || e.key === 'R') resetPlayback();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    });

    container.addEventListener('click', (e) => {
        if (e.target.closest('.controls')) return;
        if (isPlaying) pausePlayback();
        else startPlayback();
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.currentTime > 0) {
            currentTime = audioPlayer.currentTime;
        }
    });

    audioPlayer.addEventListener('ended', () => {
        pausePlayback();
        statusText.textContent = '✅ FINISHED';
        lyricDisplay.innerHTML = '🎶 <span class="highlight">Amen! 🙌</span>';
        lyricDisplay.classList.add('show');
        fireTargetIntensity = 0;
    });

    // ============================================================
    // INIT
    // ============================================================
    loadLRC('abanabame2.lrc');
    loadAudio('abanabame2.mp3');
    statusText.textContent = '⏹ PRESS PLAY or SPACE';
    
    console.log('🔥 ABANABAME - Silas Ibhadode');
    console.log('🔥 BIG FIRE EXPLOSION READY!');
    console.log('📱 PORTRAIT MODE OPTIMIZED');
    console.log('⏱ Timestamps reduced by 1 second');
    console.log('🎮 SPACE=play/pause, R=reset, F=fullscreen');
    console.log('🔥 "Na bonus" = HUGE FIRE EXPLOSION from speakers!');
})();