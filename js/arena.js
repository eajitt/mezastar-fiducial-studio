// MezaTag Battle Arena: Mezastar Arcade Simulator
const MezaArena = (function() {
  let canvas = null;
  let ctx = null;

  // Boss state
  let boss = {
    name: 'Boss Mewtwo (Legend 6★)',
    maxHp: 2000,
    currentHp: 2000,
    color: '#9333EA',
    avatar: '🔮'
  };

  // Active Player Slots (up to 3 Pokémon tags)
  let activeSlots = {}; // keyed by marker id
  let lastPositions = {}; // for detecting slide velocity

  // Visual effects (particles, floating damage, screen shake)
  let particles = [];
  let damageFloats = [];
  let screenShake = 0;
  let victoryState = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resetBoss();
    requestAnimationFrame(renderLoop);
  }

  function resetBoss() {
    boss.currentHp = boss.maxHp;
    victoryState = false;
    particles = [];
    damageFloats = [];
  }

  // Update arena with detected markers from camera or simulated tags
  function updateMarkers(markers) {
    const currentIds = new Set();

    markers.forEach(m => {
      currentIds.add(m.id);
      const prev = lastPositions[m.id];
      const nowPos = { x: m.center.x, y: m.center.y, time: performance.now() };

      // Initialize slot if new
      if (!activeSlots[m.id]) {
        activeSlots[m.id] = {
          marker: m,
          pokemon: m.pokemon,
          state: 'standby', // 'standby', 'attacking', 'recovering'
          lastAttackTime: 0,
          animY: 0
        };
      } else {
        activeSlots[m.id].marker = m;
      }

      // Check for "SLIDE TO ATTACK" gesture
      // Condition: Movement upwards (y decreases) across the attack line or fast upward velocity
      if (prev) {
        const dy = nowPos.y - prev.y;
        const dt = (nowPos.time - prev.time) / 1000;
        const velocityY = dt > 0 ? dy / dt : 0;

        // Attack trigger condition:
        // Tag is pushed forward (velocityY < -150 px/s or y crosses top 45% threshold)
        const isPushForward = velocityY < -180 || (nowPos.y < canvas.height * 0.48 && prev.y >= canvas.height * 0.48);

        const slot = activeSlots[m.id];
        const canAttack = (nowPos.time - slot.lastAttackTime) > 1200; // 1.2s cooldown

        if (isPushForward && canAttack && !victoryState) {
          triggerAttack(slot);
        }
      }

      lastPositions[m.id] = nowPos;
    });

    // Cleanup markers that left view
    Object.keys(activeSlots).forEach(id => {
      if (!currentIds.has(Number(id))) {
        delete activeSlots[id];
        delete lastPositions[id];
      }
    });
  }

  // Trigger Slide-to-Attack
  function triggerAttack(slot) {
    slot.lastAttackTime = performance.now();
    slot.state = 'attacking';

    const p = slot.pokemon;
    const baseDmg = Math.round((p.attack * 1.5) + Math.random() * 80);
    const isCritical = Math.random() > 0.4;
    const finalDmg = isCritical ? Math.round(baseDmg * 1.5) : baseDmg;

    // Audio SFX
    MezaAudio.playSlide();
    setTimeout(() => {
      MezaAudio.playAttack();
      if (isCritical) MezaAudio.playCritical();
    }, 150);

    // Screen Shake
    screenShake = isCritical ? 16 : 8;

    // Apply Damage to Boss
    boss.currentHp = Math.max(0, boss.currentHp - finalDmg);

    // Spawn Damage Float
    damageFloats.push({
      x: canvas.width / 2 + (Math.random() * 120 - 60),
      y: 120,
      text: `${finalDmg} DMG!`,
      subText: isCritical ? '★ CRITICAL HIT! ★' : p.move,
      color: isCritical ? '#FACC15' : '#EF4444',
      alpha: 1,
      vy: -1.8
    });

    // Spawn Particles
    for (let i = 0; i < (isCritical ? 35 : 20); i++) {
      particles.push({
        x: canvas.width / 2,
        y: 140,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        size: Math.random() * 6 + 3,
        color: p.color || '#FACC15',
        life: 1
      });
    }

    if (boss.currentHp <= 0) {
      victoryState = true;
      setTimeout(() => MezaAudio.playCritical(), 400);
    }

    setTimeout(() => {
      if (slot) slot.state = 'standby';
    }, 600);
  }

  // Animation and Render Loop
  function renderLoop() {
    if (canvas && ctx) {
      drawArena();
    }
    requestAnimationFrame(renderLoop);
  }

  function drawArena() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // Screen Shake Offset
    if (screenShake > 0) {
      const offsetX = (Math.random() - 0.5) * screenShake;
      const offsetY = (Math.random() - 0.5) * screenShake;
      ctx.translate(offsetX, offsetY);
      screenShake *= 0.88;
      if (screenShake < 0.5) screenShake = 0;
    }

    // 1. Cyber Arcade Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090D16');
    bgGrad.addColorStop(0.5, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Hexagonal Grid Lines
    drawArcadeGrid(ctx, w, h);

    // 2. Boss Arena (Top 40%)
    drawBossSection(ctx, w, h);

    // 3. Middle Boundary / Attack Trigger Line
    drawAttackLine(ctx, w, h);

    // 4. Standby Play Area (Bottom 55%)
    drawPlayerStandbyArea(ctx, w, h);

    // 5. Active Summoned Pokémon Overlays
    drawSummonedPokemon(ctx, w, h);

    // 6. Particle Systems & Damage Floats
    updateAndDrawParticles(ctx);
    updateAndDrawDamage(ctx);

    // 7. Victory Screen
    if (victoryState) {
      drawVictoryBanner(ctx, w, h);
    }

    ctx.restore();
  }

  function drawArcadeGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBossSection(ctx, w, h) {
    const bossAreaH = h * 0.42;

    // Boss Platform Glow
    const platGlow = ctx.createRadialGradient(w / 2, 140, 30, w / 2, 140, 180);
    platGlow.addColorStop(0, 'rgba(147, 51, 234, 0.35)');
    platGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = platGlow;
    ctx.beginPath();
    ctx.ellipse(w / 2, 160, 160, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boss Monster Avatar
    ctx.font = '68px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boss.avatar, w / 2, 130);

    // Boss Name & HP Bar
    const barW = Math.min(420, w - 80);
    const barH = 22;
    const barX = (w - barW) / 2;
    const barY = 30;

    // Boss Title
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`TARGET: ${boss.name.toUpperCase()}`, barX, barY - 8);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#C084FC';
    ctx.fillText(`${boss.currentHp} / ${boss.maxHp} HP`, barX + barW, barY - 8);

    // HP Bar Container
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 2;
    ctx.stroke();

    // HP Bar Fill
    const hpRatio = boss.currentHp / boss.maxHp;
    const fillW = Math.max(0, barW * hpRatio);
    const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    hpGrad.addColorStop(0, '#EF4444');
    hpGrad.addColorStop(0.5, '#F59E0B');
    hpGrad.addColorStop(1, '#A855F7');

    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, fillW - 4, barH - 4, 4);
    ctx.fill();
  }

  function drawAttackLine(ctx, w, h) {
    const lineY = h * 0.46;

    ctx.save();
    // Glowing Laser Divider
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(30, lineY);
    ctx.lineTo(w - 30, lineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // "SLIDE FORWARD TO ATTACK" Banner
    const bannerW = 280;
    const bannerX = (w - bannerW) / 2;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.roundRect(bannerX, lineY - 14, bannerW, 28, 14);
    ctx.fill();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('▲ GESER MAJU UNTUK MENYERANG! ▲', w / 2, lineY + 4);
    ctx.restore();
  }

  function drawPlayerStandbyArea(ctx, w, h) {
    // 3 Placement Slots in the bottom region
    const slots = [
      { x: w * 0.22, y: h * 0.72, label: 'SLOT 1' },
      { x: w * 0.50, y: h * 0.72, label: 'SLOT 2 (LEADER)' },
      { x: w * 0.78, y: h * 0.72, label: 'SLOT 3' }
    ];

    slots.forEach(slot => {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(slot.x, slot.y, 75, 42, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(slot.label, slot.x, slot.y + 5);
      ctx.fillText('LETAKKAN TAG', slot.x, slot.y + 20);
      ctx.restore();
    });
  }

  function drawSummonedPokemon(ctx, w, h) {
    const slots = Object.values(activeSlots);

    slots.forEach(slot => {
      const p = slot.pokemon;
      const m = slot.marker;
      const tier = slot.marker.tier || MezaDB.STAR_TIERS[5];

      // Use marker center if inside arena bounds, or map cleanly
      const px = Math.min(Math.max(60, m.center.x), w - 60);
      const py = Math.min(Math.max(h * 0.48, m.center.y), h - 60);

      ctx.save();

      // Summoning Circle
      ctx.beginPath();
      ctx.ellipse(px, py + 25, 60, 25, 0, 0, Math.PI * 2);
      ctx.fillStyle = tier.aura;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = tier.color;
      ctx.stroke();

      // Pokemon Sprite Card
      const cardW = 120;
      const cardH = 80;
      const cardX = px - cardW / 2;
      const cardY = py - cardH + 15;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = tier.borderColor;
      ctx.stroke();

      // Element Icon + Name
      const typeInfo = MezaDB.TYPES[p.type] || MezaDB.TYPES.Normal;
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${typeInfo.icon} ${p.name}`, px, cardY + 22);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.stars, px, cardY + 38);

      // Stat ATK
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`ATK: ${p.attack} | SPD: ${p.speed}`, px, cardY + 54);

      // State label
      ctx.fillStyle = slot.state === 'attacking' ? '#EF4444' : '#22C55E';
      ctx.fillText(slot.state === 'attacking' ? '⚡ ATTACKING!' : '● READY', px, cardY + 70);

      ctx.restore();
    });
  }

  function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 0.03;

      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.life;
      ctx.fill();
      ctx.restore();
    }
  }

  function updateAndDrawDamage(ctx) {
    for (let i = damageFloats.length - 1; i >= 0; i--) {
      const df = damageFloats[i];
      df.y += df.vy;
      df.alpha -= 0.018;

      if (df.alpha <= 0) {
        damageFloats.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = df.alpha;
      ctx.font = '900 28px "Arial Black", sans-serif';
      ctx.fillStyle = df.color;
      ctx.textAlign = 'center';
      ctx.fillText(df.text, df.x, df.y);

      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(df.subText, df.x, df.y + 20);
      ctx.restore();
    }
  }

  function drawVictoryBanner(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    const boxW = Math.min(480, w - 40);
    const boxH = 220;
    const bx = (w - boxW) / 2;
    const by = (h - boxH) / 2;

    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 16);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FACC15';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 36px "Arial Black", sans-serif';
    ctx.fillStyle = '#FACC15';
    ctx.fillText('🏆 VICTORY! 🏆', w / 2, by + 60);

    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('BOSS DIKALAHKAN!', w / 2, by + 100);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Waktunya Melempar Bola / Get Chance!', w / 2, by + 130);

    // Reset button prompt
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('[ Klik "Reset Arena" untuk Main Lagi ]', w / 2, by + 180);

    ctx.restore();
  }

  return {
    init,
    updateMarkers,
    resetBoss,
    triggerManualAttack: (id) => {
      if (activeSlots[id]) triggerAttack(activeSlots[id]);
    }
  };
})();
