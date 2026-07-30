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

    // ============================================================
    // BUILD VISUALIZER
    // ============================================================
    const NUM_BARS = 30;
    for (let i = 0; i < NUM_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = (5 + Math.random() * 15) + 'px';
        visualizer.appendChild(bar);
    }
    const bars = document.querySelectorAll('.bar');

    // ============================================================
    // FIRE PARTICLES SYSTEM (🔥 EPIC FIRE!)
    // ============================================================
    let fireParticles = [];
    const MAX_FIRE_PARTICLES = 200;

    class FireParticle {
        constructor(x, y, intensity) {
            this.x = x || Math.random() * fireCanvas.width;
            this.y = y || fireCanvas.height * (0.6 + Math.random() * 0.4);
            this.size = 3 + Math.random() * 8 * intensity;
            this.speedX = (Math.random() - 0.5) * 2 * intensity;
            this.speedY = -(2 + Math.random() * 5) * intensity;
            this.life = 1;
            this.maxLife = 30 + Math.random() * 60 * intensity;
            this.hue = 20 + Math.random() * 30; // 20-50 (orange-red)
            this.saturation = 100;
            this.lightness = 50 + Math.random() * 30;
            this.opacity = 0.5 + Math.random() * 0.5;
        }

        update() {
            this.x += this.speedX + (Math.random() - 0.5) * 1.5;
            this.y += this.speedY;
            this.speedY -= 0.05 * (1 + this.life / this.maxLife);
            this.life++;
            this.opacity = (1 - this.life / this.maxLife) * 0.8;
            this.size *= 0.98;
            this.lightness = 50 + 30 * (1 - this.life / this.maxLife);
            return this.life < this.maxLife && this.y > -50;
        }

        draw(ctx) {
            const alpha = this.opacity * (1 - this.life / this.maxLife);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha})`;
            ctx.fill();
            
            // Glow
            ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, ${alpha * 0.5})`;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function spawnFire(intensity) {
        const numSparks = Math.floor(10 + 40 * intensity);
        const width = fireCanvas.width;
        const height = fireCanvas.height;
        
        // Spawn from speakers and bottom area
        for (let i = 0; i < numSparks; i++) {
            const side = Math.random() < 0.5 ? 'left' : 'right';
            const x = side === 'left' 
                ? 50 + Math.random() * 80 
                : width - 50 - Math.random() * 80;
            const y = height * (0.7 + Math.random() * 0.3);
            fireParticles.push(new FireParticle(
                x + (Math.random() - 0.5) * 40,
                y,
                intensity
            ));
        }
        
        // Also spawn from bottom randomly
        for (let i = 0; i < numSparks * 0.5; i++) {
            fireParticles.push(new FireParticle(
                Math.random() * width,
                height * (0.8 + Math.random() * 0.2),
                intensity * 0.7
            ));
        }

        // Limit particles
        if (fireParticles.length > MAX_FIRE_PARTICLES) {
            fireParticles = fireParticles.slice(-MAX_FIRE_PARTICLES);
        }
    }

    function updateFire() {
        // Smooth intensity transition
        fireIntensity += (fireTargetIntensity - fireIntensity) * 0.05;
        
        // Clear canvas with fade
        ctxFire.clearRect(0, 0, fireCanvas.width, fireCanvas.height);
        
        if (fireIntensity > 0.01) {
            // Spawn new fire particles
            spawnFire(fireIntensity);
            
            // Update and draw existing particles
            fireParticles = fireParticles.filter(p => p.update());
            fireParticles.forEach(p => p.draw(ctxFire));
            
            // Show fire canvas
            fireCanvas.classList.add('active');
            
            // Make speakers glow
            speakerLeft.classList.add('fire');
            speakerRight.classList.add('fire');
        } else {
            fireCanvas.classList.remove('active');
            speakerLeft.classList.remove('fire');
            speakerRight.classList.remove('fire');
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
            this.size = 1 + Math.random() * 3;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = -0.2 - Math.random() * 0.5;
            this.opacity = 0.2 + Math.random() * 0.4;
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
        for (let i = 0; i < 80; i++) {
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
                const time = minutes * 60 + seconds + centiseconds / 100;
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
            { time: 5, text: 'Honour The Son uhn' },
            { time: 14, text: 'Oseneblanabame…' },
            { time: 16, text: 'Abanabame…' },
            { time: 18, text: 'Abanabame' },
            { time: 20, text: 'Abanabame.' },
            { time: 22, text: 'Oseneblanabame…' },
            { time: 24, text: 'Abanabame…' },
            { time: 26, text: 'Abanabame' },
            { time: 29, text: 'Abanabame.' },
            { time: 31, text: 'Oseneblanabame' },
            { time: 33, text: 'Nobi collect I come collect' },
            { time: 35, text: 'I come shout alleluia' },
            { time: 37, text: 'Aba naba me' },
            { time: 39, text: 'Be ne san re gba ba hion' },
            { time: 41, text: 'Be ne Esan re gbabonelimi' },
            { time: 44, text: 'I come shout alleluia' },
            { time: 46, text: 'To Aba naba me' },
            { time: 49, text: 'Anything You do for us today oh' },
            { time: 53, text: 'Anhan anhan ahan han' },
            { time: 56, text: 'Na bonus ooo' },
            { time: 58, text: 'Anhan anhan ahan han' },
            { time: 63, text: 'Na bonus oo' },
            { time: 65, text: 'Baba me, I know say' },
            { time: 67, text: 'Even though we ask for nothing' },
            { time: 70, text: 'Say You go must do something when!' },
            { time: 72, text: 'Abanabame' },
            { time: 73, text: 'Because when praises go up' },
            { time: 76, text: 'Your blessings must come down' },
            { time: 78, text: 'So we come shout alleluia when!' },
            { time: 80, text: 'Abanabame' },
            { time: 83, text: 'Anything You do for us today oh' },
            { time: 87, text: 'Anhan anhan ahan han' },
            { time: 89, text: 'Na bonus ooo' },
            { time: 92, text: 'Anhan anhan ahan han' },
            { time: 98, text: 'Na bonus oo' },
            { time: 105, text: 'Oseneblanabame…' },
            { time: 107, text: 'Abanabame…' },
            { time: 109, text: 'Abanabame…' },
            { time: 111, text: 'Abanabame…' },
            { time: 113, text: 'Oseneblanabame…' },
            { time: 115, text: 'Abanabame…' },
            { time: 118, text: 'Abanabame…' },
            { time: 120, text: 'Alleluia…' },
            { time: 120.5, text: 'Alleluia…' },
            { time: 124, text: 'Anything You do for us today oh' },
            { time: 128, text: 'Anhan anhan ahan han' },
            { time: 130, text: 'Na bonus ooo' },
            { time: 133, text: 'Anhan anhan ahan han' },
            { time: 139, text: 'Na bonus oo' },
            { time: 141, text: 'Abanabame…' },
            { time: 144, text: 'Abanabame…' },
            { time: 145, text: 'Abanabame…' },
            { time: 148, text: 'Oseneblanabame…' },
            { time: 150, text: 'Abanabame…' },
            { time: 152, text: 'Abanabame…' },
            { time: 154, text: 'Alleluia…' }
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
    // CHECK FOR FIRE TRIGGERS (🔥 "Na bonus" = FIRE!)
    // ============================================================
    function checkFireTriggers(text) {
        const lower = text.toLowerCase();
        // Trigger fire on "Na bonus" and "alleluia"
        if (lower.includes('na bonus') || lower.includes('alleluia')) {
            fireTargetIntensity = 1.0;
        } else if (lower.includes('abanabame') || lower.includes('oseneblanabame')) {
            fireTargetIntensity = 0.4;
        } else {
            fireTargetIntensity = 0.1;
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
            // Check if this lyric triggers fire
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
            if (displayText.toLowerCase().includes('alleluia')) {
                displayText = displayText.replace(/alleluia/gi, '<span class="highlight">alleluia</span>');
            }
            if (displayText.includes('Na bonus')) {
                displayText = displayText.replace(/Na bonus/g, '<span class="highlight">Na bonus</span>');
            }
            displayText = displayText.replace(/(bonus o+)/gi, '<span class="highlight">$1</span>');
            
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
            const value = 15 + 70 * baseIntensity * (0.5 + 0.5 * Math.sin(time * freq + phase));
            bar.style.height = Math.max(5, value) + 'px';
            
            // Fire colors when intensity is high
            const brightness = 50 + 40 * baseIntensity;
            const hue = fireIntensity > 0.5 
                ? 20 + 20 * Math.sin(time * 0.3 + i * 0.1)  // Fire colors
                : 40 + 10 * Math.sin(time * 0.3 + i * 0.1); // Gold colors
            
            bar.style.background = `linear-gradient(to top, 
                hsl(${hue}, 100%, ${brightness - 20}%), 
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
            ? 0.8 + 0.2 * Math.sin(currentTime * 0.5) 
            : 0.3;
        updateVisualizer(currentTime, intensity);

        // Update fire effects
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
            bar.style.height = '10px';
        });
        playBtn.textContent = '▶ PLAY';
        fireCanvas.classList.remove('active');
        speakerLeft.classList.remove('fire');
        speakerRight.classList.remove('fire');
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
    console.log('🔥 FIRE EFFECTS ACTIVE!');
    console.log('📁 Files: index.html + style.css + player.js + abanabame2.lrc + abanabame2.mp3');
    console.log('🎮 SPACE=play/pause, R=reset, F=fullscreen');
    console.log('🔥 "Na bonus" = FIRE EXPLOSION!');
})();