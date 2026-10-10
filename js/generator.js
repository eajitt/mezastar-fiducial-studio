// MezaTag Generator: Fiducial Marker and Mezastar Tag Designer
const MezaGenerator = (function() {
  const DICTIONARY_OPTIONS = [
    { id: 'MEZASTAR_MICRO_QR', label: '🏷️ Micro QR Code Mezastar (Tag Asli Arcade M2)', maxId: 99999999 },
    { id: 'ARUCO_4X4_1000', label: 'ArUco 4x4 (1000 IDs) [Rekomendasi]', maxId: 999 },
    { id: 'ARUCO_5X5_1000', label: 'ArUco 5x5 (1000 IDs)', maxId: 999 },
    { id: 'ARUCO_6X6_1000', label: 'ArUco 6x6 (1000 IDs)', maxId: 999 },
    { id: 'ARUCO', label: 'ArUco Original 5x5 (1024 IDs)', maxId: 1023 },
    { id: 'ARUCO_MIP_36h12', label: 'ArUco MIP 36h12 (250 IDs - Sangat Kuat)', maxId: 249 },
    { id: 'APRILTAG_36h11', label: 'AprilTag 36h11 (587 IDs - Standar Robotika)', maxId: 586 },
    { id: 'APRILTAG_25h9', label: 'AprilTag 25h9 (35 IDs)', maxId: 34 },
    { id: 'APRILTAG_16h5', label: 'AprilTag 16h5 (30 IDs)', maxId: 29 }
  ];

  // Cache dictionary instances
  const dictCache = {};

  function getDictionary(name) {
    if (!dictCache[name]) {
      if (typeof AR === 'undefined' || !AR.Dictionary) {
        throw new Error('AR library is not loaded');
      }
      dictCache[name] = new AR.Dictionary(name);
    }
    return dictCache[name];
  }

  // Generate SVG string for given marker
  function getMarkerSVG(dictionaryName, id) {
    const dict = getDictionary(dictionaryName);
    return dict.generateSVG(Number(id));
  }

  // Draw Marker onto an existing 2D Canvas context at (x, y, size)
  function drawMarkerToCanvas(ctx, dictionaryName, id, x, y, size) {
    if (dictionaryName === 'MEZASTAR_MICRO_QR' || (String(id).length >= 6 && /^\d+$/.test(String(id)))) {
      const sym = (typeof MezaCopier !== 'undefined') ? MezaCopier.getSymbol(String(id)) : null;
      if (sym) {
        const quietZone = 2;
        const totalCols = sym.width + quietZone * 2;
        const cellSize = size / totalCols;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#000000';
        for (let r = 0; r < sym.height; r++) {
          for (let c = 0; c < sym.width; c++) {
            if (sym.data[r * sym.width + c] === 0) {
              ctx.fillRect(
                Math.round(x + (c + quietZone) * cellSize),
                Math.round(y + (r + quietZone) * cellSize),
                Math.ceil(cellSize),
                Math.ceil(cellSize)
              );
            }
          }
        }
        return;
      }
    }

    const dict = getDictionary(dictionaryName);
    const code = dict.codeList[id];
    if (!code) throw new Error(`Invalid marker ID ${id} for ${dictionaryName}`);

    const markSize = dict.markSize; // total cells including black border
    const innerSize = markSize - 2;
    const quietZone = 1; // 1 cell white border
    const totalCells = markSize + quietZone * 2;
    const cellSize = size / totalCells;

    // 1. White quiet zone background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, size, size);

    // 2. Black outer border
    const borderX = x + quietZone * cellSize;
    const borderY = y + quietZone * cellSize;
    const borderWidth = markSize * cellSize;
    ctx.fillStyle = '#000000';
    ctx.fillRect(borderX, borderY, borderWidth, borderWidth);

    // 3. Inner grid cells (white bits)
    ctx.fillStyle = '#FFFFFF';
    for (let row = 0; row < innerSize; row++) {
      for (let col = 0; col < innerSize; col++) {
        const bit = code[row * innerSize + col];
        if (bit === '1') {
          const cx = borderX + (col + 1) * cellSize;
          const cy = borderY + (row + 1) * cellSize;
          ctx.fillRect(cx, cy, cellSize, cellSize);
        }
      }
    }
  }

  // Helper: Draw rounded pill / capsule shape
  function drawCapsulePath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // Procedural Pokemon silhouette / icon drawing if no image available
  function drawPokemonGraphic(ctx, cx, cy, radius, pokemon) {
    const typeInfo = MezaDB.TYPES[pokemon.type] || MezaDB.TYPES.Normal;
    const pColor = pokemon.color || typeInfo.color;

    // Outer glow aura
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.1);
    glow.addColorStop(0, typeInfo.bg || 'rgba(255,255,255,0.4)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Pokéball / Mascot Core Graphic
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = '#18181B';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = pColor;
    ctx.stroke();

    // Top half colored
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, Math.PI, 0, false);
    ctx.fillStyle = pColor;
    ctx.fill();

    // Horizontal divider
    ctx.fillStyle = '#09090B';
    ctx.fillRect(cx - radius * 0.85, cy - 4, radius * 1.7, 8);

    // Center button
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pColor;
    ctx.stroke();

    // Emoji / Type Icon overlay
    ctx.font = `${Math.floor(radius * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeInfo.icon || '⚡', cx, cy - radius * 0.45);
    ctx.restore();
  }

  // Render Full Mezastar Tag to Canvas
  // width: 380px, height: 640px (10:17 aspect ratio, standard Mezastar proportion)
  function renderTagToCanvas(canvas, options) {
    const {
      pokemon,
      dictionaryName,
      viewMode = 'dual', // 'front', 'back', 'dual', 'marker_only'
      markerSizeMm = 30
    } = options;

    const ctx = canvas.getContext('2d');
    const tier = MezaDB.STAR_TIERS[pokemon.stars] || MezaDB.STAR_TIERS[5];
    const typeInfo = MezaDB.TYPES[pokemon.type] || MezaDB.TYPES.Normal;

    // Dimensions
    const tagW = 380;
    const tagH = 640;
    const cornerR = 48;

    if (viewMode === 'marker_only') {
      canvas.width = 440;
      canvas.height = 500;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Frame
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 400, 460);

      // Header
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FIDUCIAL MARKER #${pokemon.id}`, 220, 50);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText(`${dictionaryName} | ${pokemon.name}`, 220, 72);

      // Draw Marker
      drawMarkerToCanvas(ctx, dictionaryName, pokemon.id, 60, 90, 320);

      // Scale info
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText(`▲ FORWARD / SENSOR TOP ▲`, 220, 435);

      ctx.fillStyle = '#64748B';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillText(`Print Size: ~${markerSizeMm}mm x ${markerSizeMm}mm`, 220, 455);
      return;
    }

    if (viewMode === 'dual') {
      canvas.width = tagW * 2 + 60;
      canvas.height = tagH + 60;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background canvas
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Front Tag at x=20
      drawSingleTag(ctx, 20, 30, tagW, tagH, cornerR, pokemon, tier, typeInfo, dictionaryName, 'front');

      // Fold Guide Line in Middle
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tagW + 30, 20);
      ctx.lineTo(tagW + 30, tagH + 40);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GARIS LIPAT / CUT LINE', tagW + 30, tagH + 52);
      ctx.restore();

      // Draw Back Tag at x=tagW+40
      drawSingleTag(ctx, tagW + 40, 30, tagW, tagH, cornerR, pokemon, tier, typeInfo, dictionaryName, 'back');
      return;
    }

    // Single Tag view (either 'front' or 'back')
    canvas.width = tagW + 40;
    canvas.height = tagH + 60;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSingleTag(ctx, 20, 30, tagW, tagH, cornerR, pokemon, tier, typeInfo, dictionaryName, viewMode);
  }

  // Draw one tag capsule (either front or back)
  function drawSingleTag(ctx, x, y, w, h, r, pokemon, tier, typeInfo, dictionaryName, side) {
    ctx.save();

    // 1. Shadow
    ctx.shadowColor = tier.aura;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    // 2. Base Plastic Capsule
    drawCapsulePath(ctx, x, y, w, h, r);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // 3. Metallic Outer Bezel
    ctx.lineWidth = 6;
    const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    borderGrad.addColorStop(0, tier.borderColor);
    borderGrad.addColorStop(0.5, '#FFFFFF');
    borderGrad.addColorStop(1, tier.borderColor);
    ctx.strokeStyle = borderGrad;
    ctx.stroke();

    // 4. Inner Plastic Bezel Inset
    drawCapsulePath(ctx, x + 8, y + 8, w - 16, h - 16, r - 6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // 5. Top Keychain / Sensor Notch
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 18, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#030712';
    ctx.fill();
    ctx.strokeStyle = tier.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (side === 'front') {
      renderFrontDetails(ctx, x, y, w, h, pokemon, tier, typeInfo);
    } else {
      renderBackDetails(ctx, x, y, w, h, pokemon, tier, typeInfo, dictionaryName);
    }

    ctx.restore();
  }

  // Render Sisi Depan Mezastar
  function renderFrontDetails(ctx, x, y, w, h, pokemon, tier, typeInfo) {
    // Top Star Rating Badge
    const badgeW = w - 60;
    const badgeH = 34;
    const badgeX = x + 30;
    const badgeY = y + 36;

    // Badge Background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
    const starBg = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
    starBg.addColorStop(0, tier.borderColor);
    starBg.addColorStop(1, '#09090B');
    ctx.fillStyle = starBg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tier.color;
    ctx.stroke();

    // Star text & Tier Name
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`${tier.stars} ${tier.name.toUpperCase()}`, badgeX + 12, badgeY + 22);

    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = tier.color;
    ctx.fillText(`ID #${pokemon.id}`, badgeX + badgeW - 12, badgeY + 22);
    ctx.restore();

    // Central Mascot Illustration Area
    const mascotCy = y + 210;
    const mascotR = 100;
    drawPokemonGraphic(ctx, x + w / 2, mascotCy, mascotR, pokemon);

    // Pokemon Name & Element Row
    const nameY = y + 340;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 28px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pokemon.name.toUpperCase(), x + w / 2, nameY);

    // Dex No & Type Badge
    const typeBadgeY = nameY + 12;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, typeBadgeY, 160, 24, 12);
    ctx.fillStyle = typeInfo.bg || 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = typeInfo.color;
    ctx.stroke();

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = typeInfo.color;
    ctx.fillText(`${typeInfo.icon} ${pokemon.type.toUpperCase()}  |  ${pokemon.dex}`, x + w / 2, typeBadgeY + 16);
    ctx.restore();

    // Stats Grid Box
    const statsBoxY = y + 410;
    const statsBoxW = w - 60;
    const statsBoxH = 110;
    const statsBoxX = x + 30;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(statsBoxX, statsBoxY, statsBoxW, statsBoxH, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Stat bars
    const stats = [
      { label: 'HP', val: pokemon.hp, max: 300, color: '#22C55E' },
      { label: 'ATK', val: pokemon.attack, max: 300, color: '#EF4444' },
      { label: 'DEF', val: pokemon.defense, max: 300, color: '#3B82F6' },
      { label: 'SPD', val: pokemon.speed, max: 300, color: '#EAB308' }
    ];

    stats.forEach((st, idx) => {
      const sy = statsBoxY + 18 + idx * 22;
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.fillText(st.label, statsBoxX + 12, sy);

      // Bar bg
      const barX = statsBoxX + 44;
      const barW = statsBoxW - 105;
      const barH = 7;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(barX, sy - 7, barW, barH);

      // Bar fill
      const fillW = Math.min(barW, (st.val / st.max) * barW);
      ctx.fillStyle = st.color;
      ctx.fillRect(barX, sy - 7, fillW, barH);

      // Val text
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(st.val, statsBoxX + statsBoxW - 12, sy);
    });
    ctx.restore();

    // Signature Move Banner at Bottom
    const moveY = y + 540;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(statsBoxX, moveY, statsBoxW, 44, 8);
    const moveGrad = ctx.createLinearGradient(statsBoxX, moveY, statsBoxX + statsBoxW, moveY);
    moveGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    moveGrad.addColorStop(1, 'rgba(147, 51, 234, 0.3)');
    ctx.fillStyle = moveGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tier.borderColor;
    ctx.stroke();

    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.fillStyle = tier.color;
    ctx.textAlign = 'center';
    ctx.fillText('★ SIGNATURE MOVE ★', x + w / 2, moveY + 16);

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(pokemon.move || 'Special Strike', x + w / 2, moveY + 34);
    ctx.restore();

    // Mezastar Bottom Brand Tag
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEZASTAR CUSTOM EDITION • TAKARA TOMY STYLE', x + w / 2, y + h - 18);
  }

  // Render Sisi Belakang (Marker Fiducial Sensor)
  function renderBackDetails(ctx, x, y, w, h, pokemon, tier, typeInfo, dictionaryName) {
    // Top Info Header
    ctx.save();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲ SENSOR ORIENTASI ATAS ▲', x + w / 2, y + 54);

    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.fillText('HADAPKAN PANAH KE ARAH LAYAR', x + w / 2, y + 72);
    ctx.restore();

    // Directional Arrow Indicator
    ctx.save();
    ctx.fillStyle = tier.borderColor;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 84);
    ctx.lineTo(x + w / 2 - 14, y + 104);
    ctx.lineTo(x + w / 2 + 14, y + 104);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Center Fiducial Marker Placement
    const markerBoxSize = 250;
    const markerX = x + (w - markerBoxSize) / 2;
    const markerY = y + 125;

    // Optical Alignment Border Frame
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(markerX - 10, markerY - 10, markerBoxSize + 20, markerBoxSize + 20);

    // Corner targeting reticles
    const reticleLen = 14;
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 2.5;

    // Top-left reticle
    ctx.beginPath();
    ctx.moveTo(markerX - 10, markerY - 10 + reticleLen);
    ctx.lineTo(markerX - 10, markerY - 10);
    ctx.lineTo(markerX - 10 + reticleLen, markerY - 10);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(markerX + markerBoxSize + 10 - reticleLen, markerY - 10);
    ctx.lineTo(markerX + markerBoxSize + 10, markerY - 10);
    ctx.lineTo(markerX + markerBoxSize + 10, markerY - 10 + reticleLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(markerX - 10, markerY + markerBoxSize + 10 - reticleLen);
    ctx.lineTo(markerX - 10, markerY + markerBoxSize + 10);
    ctx.lineTo(markerX - 10 + reticleLen, markerY + markerBoxSize + 10);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(markerX + markerBoxSize + 10 - reticleLen, markerY + markerBoxSize + 10);
    ctx.lineTo(markerX + markerBoxSize + 10, markerY + markerBoxSize + 10);
    ctx.lineTo(markerX + markerBoxSize + 10, markerY + markerBoxSize + 10 - reticleLen);
    ctx.stroke();
    ctx.restore();

    // Draw the actual Fiducial Marker
    drawMarkerToCanvas(ctx, dictionaryName, pokemon.id, markerX, markerY, markerBoxSize);

    // Bottom Metadata Panel
    const metaBoxY = y + 415;
    const metaBoxW = w - 60;
    const metaBoxX = x + 30;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(metaBoxX, metaBoxY, metaBoxW, 115, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.textAlign = 'center';

    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${pokemon.name.toUpperCase()} (ID: #${pokemon.id})`, x + w / 2, metaBoxY + 30);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = tier.color;
    ctx.fillText(`DICT: ${dictionaryName}`, x + w / 2, metaBoxY + 54);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${typeInfo.icon} ${pokemon.type}  •  ${tier.name} (${tier.stars})`, x + w / 2, metaBoxY + 76);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`INFRARED / OPTICAL MEZASTAR COMPATIBLE`, x + w / 2, metaBoxY + 98);
    ctx.restore();

    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLACE TAG ON ACRYLIC BOARD • DETECT VIA OPENCV/CAMERA', x + w / 2, y + h - 18);
  }

  // Generate Printable A4 Sheet (2480 x 3508 px at 300 DPI)
  // Renders 6 to 8 tags arranged in rows ready for printing and cutting!
  function generateA4PrintSheet(pokemonList, dictionaryName) {
    const a4 = document.createElement('canvas');
    a4.width = 2480;
    a4.height = 3508;
    const ctx = a4.getContext('2d');

    // Clean white A4 paper
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, a4.width, a4.height);

    // Title & Instructions at top
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 50px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('POKÉMON MEZASTAR FIDUCIAL TAG SHEET', 100, 110);

    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Kamus Marker: ${dictionaryName} | Cetak pada skala 100% (A4) | Potong mengikuti garis putus-putus`, 100, 160);

    // Grid layout: 2 columns x 3 rows of Dual Tags (Front + Back)
    // Scale tag down to fit accurately
    const scale = 0.85;
    const tagW = 380 * scale;
    const tagH = 640 * scale;
    const pairW = tagW * 2 + 10;

    const startX = 140;
    const startY = 220;
    const gapX = 120;
    const gapY = 80;

    const listToPrint = pokemonList.slice(0, 6);

    listToPrint.forEach((pkmn, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      const px = startX + col * (pairW + gapX);
      const py = startY + row * (tagH + gapY);

      // Scissor Cut Border Guide
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - 15, py - 15, pairW + 30, tagH + 30);

      // Cut icon indicator
      ctx.fillStyle = '#94A3B8';
      ctx.font = '24px sans-serif';
      ctx.fillText('✂️', px - 28, py + 20);
      ctx.restore();

      // Render Front Tag
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      const tier = MezaDB.STAR_TIERS[pkmn.stars] || MezaDB.STAR_TIERS[5];
      const typeInfo = MezaDB.TYPES[pkmn.type] || MezaDB.TYPES.Normal;
      drawSingleTag(ctx, 0, 0, 380, 640, 48, pkmn, tier, typeInfo, dictionaryName, 'front');
      ctx.restore();

      // Fold separator line
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + tagW + 5, py);
      ctx.lineTo(px + tagW + 5, py + tagH);
      ctx.stroke();
      ctx.restore();

      // Render Back Tag
      ctx.save();
      ctx.translate(px + tagW + 10, py);
      ctx.scale(scale, scale);
      drawSingleTag(ctx, 0, 0, 380, 640, 48, pkmn, tier, typeInfo, dictionaryName, 'back');
      ctx.restore();
    });

    return a4;
  }

  return {
    DICTIONARY_OPTIONS,
    getDictionary,
    getMarkerSVG,
    drawMarkerToCanvas,
    renderTagToCanvas,
    generateA4PrintSheet
  };
})();
