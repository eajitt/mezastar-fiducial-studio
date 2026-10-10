// MezaTag Studio: Main Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Generator Elements
  const dictSelect = document.getElementById('gen-dict-select');
  const pkmnSelect = document.getElementById('gen-pkmn-select');
  const markerIdInput = document.getElementById('gen-marker-id');
  const pkmnNameInput = document.getElementById('gen-pkmn-name');
  const pkmnDexInput = document.getElementById('gen-pkmn-dex');
  const pkmnTypeSelect = document.getElementById('gen-pkmn-type');
  const pkmnStarsSelect = document.getElementById('gen-pkmn-stars');
  const pkmnHpInput = document.getElementById('gen-pkmn-hp');
  const pkmnAtkInput = document.getElementById('gen-pkmn-atk');
  const pkmnDefInput = document.getElementById('gen-pkmn-def');
  const pkmnSpdInput = document.getElementById('gen-pkmn-spd');
  const pkmnMoveInput = document.getElementById('gen-pkmn-move');
  const viewModeRadios = document.querySelectorAll('input[name="view-mode"]');
  const tagPreviewCanvas = document.getElementById('tag-preview-canvas');

  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnDownloadSvg = document.getElementById('btn-download-svg');
  const btnPrintTag = document.getElementById('btn-print-tag');
  const btnPrintA4 = document.getElementById('btn-print-a4');
  const btnSaveToDb = document.getElementById('btn-save-to-db');

  // Scanner Elements
  const scanDictSelect = document.getElementById('scan-dict-select');
  const cameraSelect = document.getElementById('camera-select');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const videoFeed = document.getElementById('video-feed');
  const scannerCanvas = document.getElementById('scanner-canvas');
  const imageUploadInput = document.getElementById('image-upload-input');
  const dropZone = document.getElementById('drop-zone');

  const statFps = document.getElementById('stat-fps');
  const statCount = document.getElementById('stat-count');
  const detectedList = document.getElementById('detected-tags-list');
  const tagExtractionInspector = document.getElementById('tag-extraction-inspector');
  let selectedMarkerId = null;

  // Arena Elements
  const arenaCanvas = document.getElementById('arena-canvas');
  const btnResetArena = document.getElementById('btn-reset-arena');
  const btnSimulateSlide = document.getElementById('btn-simulate-slide');

  // Database Elements
  const dbGrid = document.getElementById('db-grid');
  const btnExportDb = document.getElementById('btn-export-db');
  const btnImportDb = document.getElementById('btn-import-db');
  const importFileInput = document.getElementById('import-file-input');
  const btnResetDb = document.getElementById('btn-reset-db');

  // Audio Toggle
  const btnMute = document.getElementById('btn-mute');

  // State
  let currentViewMode = 'dual';

  // --- 1. Populate Dictionaries ---
  // Generator dictionaries (ArUco & AprilTag)
  MezaGenerator.DICTIONARY_OPTIONS.forEach(opt => {
    dictSelect.appendChild(new Option(opt.label, opt.id));
  });

  // Scanner dictionaries (Auto-Detect, Micro QR Mezastar, and ArUco/AprilTag)
  scanDictSelect.appendChild(new Option('⚡ Auto-Detect (ArUco + Micro QR Mezastar)', 'AUTO_DETECT'));
  scanDictSelect.appendChild(new Option('🏷️ Tag Mezastar Asli (Micro QR Code)', 'MEZASTAR_MICRO_QR'));
  MezaGenerator.DICTIONARY_OPTIONS.forEach(opt => {
    scanDictSelect.appendChild(new Option(opt.label, opt.id));
  });

  // Populate Types
  Object.keys(MezaDB.TYPES).forEach(t => {
    pkmnTypeSelect.appendChild(new Option(`${MezaDB.TYPES[t].icon} ${t}`, t));
  });

  // Populate Pokemon presets
  function refreshPokemonDropdown() {
    pkmnSelect.innerHTML = '';
    const catalog = MezaDB.getAll();
    catalog.forEach(p => {
      const tier = MezaDB.STAR_TIERS[p.stars] || MezaDB.STAR_TIERS[5];
      const opt = new Option(`#${p.id} ${p.name} (${tier.stars} ${p.type})`, p.id);
      pkmnSelect.appendChild(opt);
    });
  }

  // --- 2. Tab Navigation ---
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      MezaAudio.playClick();
      const targetId = tab.dataset.tab;

      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-scanner' || targetId === 'tab-arena') {
        initCameraDevices();
      }
    });
  });

  // --- 3. Generator Controls & Live Preview ---
  function loadPokemonIntoForm(p) {
    markerIdInput.value = p.id;
    pkmnNameInput.value = p.name;
    pkmnDexInput.value = p.dex;
    pkmnTypeSelect.value = p.type;
    pkmnStarsSelect.value = p.stars;
    pkmnHpInput.value = p.hp;
    pkmnAtkInput.value = p.attack;
    pkmnDefInput.value = p.defense;
    pkmnSpdInput.value = p.speed;
    pkmnMoveInput.value = p.move;
    updateTagPreview();
  }

  function getFormData() {
    return {
      id: Number(markerIdInput.value) || 0,
      name: pkmnNameInput.value.trim() || 'Custom Pokemon',
      dex: pkmnDexInput.value.trim() || '#0000',
      type: pkmnTypeSelect.value,
      stars: Number(pkmnStarsSelect.value) || 5,
      hp: Number(pkmnHpInput.value) || 150,
      attack: Number(pkmnAtkInput.value) || 150,
      defense: Number(pkmnDefInput.value) || 150,
      speed: Number(pkmnSpdInput.value) || 150,
      move: pkmnMoveInput.value.trim() || 'Special Strike'
    };
  }

  function updateTagPreview() {
    const data = getFormData();
    const dict = dictSelect.value;
    try {
      MezaGenerator.renderTagToCanvas(tagPreviewCanvas, {
        pokemon: data,
        dictionaryName: dict,
        viewMode: currentViewMode,
        markerSizeMm: 30
      });
    } catch (err) {
      console.error('Error rendering preview:', err);
    }
  }

  // Event Listeners for Generator
  pkmnSelect.addEventListener('change', () => {
    const p = MezaDB.getById(pkmnSelect.value);
    if (p) loadPokemonIntoForm(p);
  });

  dictSelect.addEventListener('change', () => {
    updateTagPreview();
  });

  scanDictSelect.addEventListener('change', () => {
    MezaScanner.setDictionary(scanDictSelect.value);
  });

  [markerIdInput, pkmnNameInput, pkmnDexInput, pkmnTypeSelect, pkmnStarsSelect,
   pkmnHpInput, pkmnAtkInput, pkmnDefInput, pkmnSpdInput, pkmnMoveInput].forEach(el => {
    el.addEventListener('input', updateTagPreview);
  });

  viewModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentViewMode = e.target.value;
      updateTagPreview();
    });
  });

  // Save changes to DB
  btnSaveToDb.addEventListener('click', () => {
    MezaAudio.playClick();
    const data = getFormData();
    MezaDB.upsert(data);
    refreshPokemonDropdown();
    pkmnSelect.value = data.id;
    renderDbGrid();
    showToast(`Berhasil menyimpan ${data.name} (ID #${data.id}) ke Database!`);
  });

  // Download Single Tag PNG
  btnDownloadPng.addEventListener('click', () => {
    MezaAudio.playClick();
    const data = getFormData();
    const link = document.createElement('a');
    link.download = `Mezastar_Tag_${data.name}_ID${data.id}.png`;
    link.href = tagPreviewCanvas.toDataURL('image/png');
    link.click();
    showToast(`Download PNG ${data.name} selesai!`);
  });

  // Download SVG
  btnDownloadSvg.addEventListener('click', () => {
    MezaAudio.playClick();
    const data = getFormData();
    try {
      const svgStr = MezaGenerator.getMarkerSVG(dictSelect.value, data.id);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Marker_${dictSelect.value}_ID${data.id}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Download Vector SVG selesai!`);
    } catch (e) {
      alert(`Gagal membuat SVG: ${e.message}`);
    }
  });

  // Print Single Tag
  btnPrintTag.addEventListener('click', () => {
    MezaAudio.playClick();
    const win = window.open('', '_blank');
    const imgData = tagPreviewCanvas.toDataURL('image/png');
    win.document.write(`
      <html>
        <head><title>Print Tag</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
          <img src="${imgData}" style="max-height:90vh;" onload="window.print();window.close();"/>
        </body>
      </html>
    `);
  });

  // Generate & Print A4 Sheet
  btnPrintA4.addEventListener('click', () => {
    MezaAudio.playClick();
    const list = MezaDB.getAll();
    const a4Canvas = MezaGenerator.generateA4PrintSheet(list, dictSelect.value);

    const win = window.open('', '_blank');
    const imgData = a4Canvas.toDataURL('image/png');
    win.document.write(`
      <html>
        <head>
          <title>Mezastar A4 Print Sheet</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; }
            img { width: 100vw; height: auto; display: block; }
          </style>
        </head>
        <body>
          <img src="${imgData}" onload="window.print();"/>
        </body>
      </html>
    `);
    showToast('Membuka lembar cetak A4...');
  });

  // --- 4. Scanner Controls ---
  async function initCameraDevices() {
    const devices = await MezaScanner.getAvailableCameras();
    cameraSelect.innerHTML = '';
    if (devices.length === 0) {
      cameraSelect.appendChild(new Option('Kamera Bawaan / Default', ''));
      return;
    }
    devices.forEach((d, idx) => {
      cameraSelect.appendChild(new Option(d.label || `Kamera ${idx + 1}`, d.deviceId));
    });
  }

  btnToggleCamera.addEventListener('click', async () => {
    MezaAudio.playClick();
    if (MezaScanner.getIsRunning()) {
      MezaScanner.stopCamera();
      btnToggleCamera.textContent = '▶ Mulai Kamera';
      btnToggleCamera.classList.remove('btn-danger');
      btnToggleCamera.classList.add('btn-primary');
    } else {
      try {
        btnToggleCamera.textContent = '⏳ Membuka...';
        await MezaScanner.startCamera(cameraSelect.value || null);
        btnToggleCamera.textContent = '⏹ Matikan Kamera';
        btnToggleCamera.classList.remove('btn-primary');
        btnToggleCamera.classList.add('btn-danger');
      } catch (err) {
        alert('Gagal mengakses kamera. Pastikan izin kamera aktif pada browser.');
        btnToggleCamera.textContent = '▶ Mulai Kamera';
      }
    }
  });

  cameraSelect.addEventListener('change', () => {
    if (MezaScanner.getIsRunning()) {
      MezaScanner.startCamera(cameraSelect.value);
    }
  });

  // Handle Image File Upload & Drag-and-drop
  imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah file gambar (PNG / JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        MezaScanner.stopCamera();
        btnToggleCamera.textContent = '▶ Mulai Kamera';
        btnToggleCamera.classList.remove('btn-danger');
        btnToggleCamera.classList.add('btn-primary');

        const found = await MezaScanner.scanImage(img, file);
        if (found && found.length > 0) {
          showToast(`✅ Berhasil! Terdeteksi ${found.length} tag (${found[0].pokemon.name || found[0].id}).`);
        } else {
          showToast(`⚠️ Tidak ada marker/QR code yang terdeteksi.`);
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Tag Extraction & Telemetry Inspector (Adapted from Technical Docs) ---
  function computeTagExtraction(m) {
    const rawText = String(m.rawText || m.id || '');

    // 1. Raw Bytes Analysis
    let bytesArray = [];
    if (m.bytes && typeof m.bytes === 'object') {
      bytesArray = Array.from(Object.values(m.bytes));
    } else {
      bytesArray = Array.from(rawText).map(c => c.charCodeAt(0));
    }
    const asciiHex = bytesArray.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    // 2. Direct Hex & BCC Checksum (XOR Parity according to Bab 1.2 & 3.1)
    const isHexOnly = /^[0-9A-Fa-f]+$/.test(rawText);
    let hexBytes = [];
    let hexFormatted = '';
    let bccHex = '00';

    if (isHexOnly) {
      let clean = rawText;
      if (clean.length % 2 !== 0) clean = '0' + clean;
      for (let i = 0; i < clean.length; i += 2) {
        hexBytes.push(parseInt(clean.substr(i, 2), 16));
      }
      hexFormatted = hexBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const bcc = hexBytes.reduce((acc, b) => acc ^ b, 0);
      bccHex = bcc.toString(16).padStart(2, '0').toUpperCase();
    } else {
      hexFormatted = asciiHex;
      const bcc = bytesArray.reduce((acc, b) => acc ^ b, 0);
      bccHex = bcc.toString(16).padStart(2, '0').toUpperCase();
    }

    // 3. 32-bit Integers (Big Endian & Little Endian)
    const numVal = parseInt(rawText, 10);
    const intDecimal = !isNaN(numVal) ? numVal.toLocaleString('id-ID') : '-';

    const targetBytes = hexBytes.length >= 4 ? hexBytes : bytesArray;
    let int32BE = null, int32LE = null;
    if (targetBytes.length >= 4) {
      int32BE = ((targetBytes[0] << 24) >>> 0) | (targetBytes[1] << 16) | (targetBytes[2] << 8) | targetBytes[3];
      int32LE = targetBytes[0] | (targetBytes[1] << 8) | (targetBytes[2] << 16) | ((targetBytes[3] << 24) >>> 0);
    }

    // 4. Binary representation (first 4 bytes)
    const binaryString = (hexBytes.length > 0 ? hexBytes : bytesArray)
      .slice(0, 4)
      .map(b => b.toString(2).padStart(8, '0'))
      .join(' ');

    // 5. Mezastar Arcade Structure Analysis
    let mezastarSeries = 'Mezastar Tag Standar';
    let mezastarIndex = `#${rawText.slice(-4) || rawText}`;
    if (/^\d{6,10}$/.test(rawText)) {
      mezastarSeries = `Set/Seri #${rawText.slice(0, 2)}`;
      mezastarIndex = `Tag Index #${rawText.slice(2)} (Dex #${rawText.slice(-4)})`;
    }

    const standardFormat = (m.type === 'MicroQR' || (m.format && String(m.format).includes('QR')))
      ? `Denso Wave Micro QR Code (Versi ${m.version || 'M2'})`
      : `Fiducial ArUco Marker (${m.format || 'Standard'})`;

    const eccText = m.ecLevel ? `Level ${m.ecLevel} (~15% Error Correction)` : 'Reed-Solomon Parity';

    return {
      rawText,
      standardFormat,
      format: m.format || 'MicroQRCode',
      version: m.version || 'M2',
      ecLevel: eccText,
      symbologyIdentifier: m.symbologyIdentifier || ']Q1',
      byteCount: bytesArray.length,
      directHex: hexFormatted || asciiHex,
      asciiHex,
      intDecimal,
      int32BE: int32BE !== null ? '0x' + int32BE.toString(16).padStart(8, '0').toUpperCase() : '-',
      int32LE: int32LE !== null ? '0x' + int32LE.toString(16).padStart(8, '0').toUpperCase() : '-',
      bccHex: '0x' + bccHex,
      binaryString: binaryString || '-',
      mezastarSeries,
      mezastarIndex,
      center: m.center ? `(${Math.round(m.center.x)}, ${Math.round(m.center.y)}) px` : '-',
      angle: m.angle !== undefined ? `${m.angle}°` : '0°',
      size: m.size ? `${m.size} × ${m.size} px` : '-',
      pokemon: m.pokemon,
      tier: m.tier
    };
  }

  function renderExtractionInspector(m) {
    if (!tagExtractionInspector) return;
    if (!m) {
      tagExtractionInspector.style.display = 'none';
      tagExtractionInspector.innerHTML = '';
      return;
    }

    const data = computeTagExtraction(m);
    tagExtractionInspector.style.display = 'block';

    tagExtractionInspector.innerHTML = `
      <div class="extraction-card">
        <div class="extraction-card-header">
          <div class="extraction-title">
            <span class="pulse-dot"></span>
            <span>HASIL EKSTRAKSI DATA TAG</span>
          </div>
          <div class="extraction-badge">${data.format} (${data.version})</div>
        </div>

        <!-- Section 1: Raw Payload & Tag Identity -->
        <div class="extraction-section-title">📄 Payload & Identitas Tag</div>
        <div class="extraction-grid">
          <div class="ext-item">
            <div class="ext-label">Raw Decoded Payload</div>
            <div class="ext-val highlight-val">${data.rawText}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Standar Format Barcode</div>
            <div class="ext-val">${data.standardFormat}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Seri Mezastar</div>
            <div class="ext-val">${data.mezastarSeries}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Profil Pokédex</div>
            <div class="ext-val">${m.pokemon.name} <span style="color:${m.tier.color}">${m.tier.stars}</span> (${m.pokemon.type})</div>
          </div>
        </div>

        <!-- Section 2: Hexadecimal Analysis -->
        <div class="extraction-section-title">⚡ Analisis Heksadesimal & Checksum (Bab 1, 2, 3 Dokumen Teknis)</div>
        <div class="extraction-grid">
          <div class="ext-item">
            <div class="ext-label">Hex Bytes (Direct)</div>
            <div class="ext-val hex-font">${data.directHex}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">ASCII Hex Bytes</div>
            <div class="ext-val hex-font">${data.asciiHex}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">UID / BCC XOR Checksum</div>
            <div class="ext-val hex-font" style="color:var(--success); font-weight:700;">${data.bccHex} (Valid)</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Nilai Integer Desimal</div>
            <div class="ext-val">${data.intDecimal}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">32-bit Integer (Big-Endian)</div>
            <div class="ext-val hex-font">${data.int32BE}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">32-bit Integer (Little-Endian)</div>
            <div class="ext-val hex-font">${data.int32LE}</div>
          </div>
          <div class="ext-item full-width">
            <div class="ext-label">Bitstream Biner (32-bit Parity)</div>
            <div class="ext-val bin-font">${data.binaryString}</div>
          </div>
        </div>

        <!-- Section 3: Sensor Table Telemetry -->
        <div class="extraction-section-title">📐 Telemetri Meja Sensor Fiducial</div>
        <div class="extraction-grid">
          <div class="ext-item">
            <div class="ext-label">Titik Pusat Sensor (X, Y)</div>
            <div class="ext-val">${data.center}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Orientasi Sudut Rotasi</div>
            <div class="ext-val">${data.angle}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Dimensi Bounding Box</div>
            <div class="ext-val">${data.size}</div>
          </div>
          <div class="ext-item">
            <div class="ext-label">Kapasitas Koreksi Error</div>
            <div class="ext-val">${data.ecLevel}</div>
          </div>
        </div>

        <!-- Section 4: Quick Action Buttons -->
        <div class="extraction-actions">
          <button class="btn btn-sm btn-primary" id="btn-ext-to-copier" style="background:linear-gradient(135deg, #2563EB, #7C3AED); font-weight:bold;">
            🏷️ Kloning / Edit di Copier
          </button>
          <button class="btn btn-sm btn-primary" id="btn-ext-send-hex">
            ⚡ Buka di Hex Studio
          </button>
          <button class="btn btn-sm" id="btn-ext-copy-hex">
            📋 Salin Hex (${data.directHex})
          </button>
          <button class="btn btn-sm" id="btn-ext-copy-raw">
            📋 Salin Payload (${data.rawText})
          </button>
          <button class="btn btn-sm btn-success" id="btn-ext-to-arena">
            ⚔️ Bawa ke Arena
          </button>
          <button class="btn btn-sm" id="btn-ext-to-db">
            💾 Edit di Pokédex
          </button>
        </div>
      </div>
    `;

    // Event Listeners for Quick Action Buttons
    document.getElementById('btn-ext-to-copier')?.addEventListener('click', () => {
      MezaAudio.playClick();
      if (typeof MezaCopier !== 'undefined' && MezaCopier.loadTag) {
        MezaCopier.loadTag(m);
      }
      const tabHexBtn = document.querySelector('[data-tab="tab-hex-nfc"]');
      if (tabHexBtn) tabHexBtn.click();
      setTimeout(() => {
        const copierCard = document.querySelector('.copier-layout-grid');
        if (copierCard) copierCard.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      showToast(`🏷️ Tag #${data.rawText} dimuat ke Mezastar Copier!`);
    });

    document.getElementById('btn-ext-send-hex')?.addEventListener('click', () => {
      MezaAudio.playClick();
      const tabHexBtn = document.querySelector('[data-tab="tab-hex-nfc"]');
      if (tabHexBtn) tabHexBtn.click();

      const hexInput = document.getElementById('hex-conv-input');
      if (hexInput) {
        hexInput.value = data.directHex.replace(/\s+/g, '');
        hexInput.dispatchEvent(new Event('input'));
      }
      showToast(`⚡ Data tag #${data.rawText} dikirim ke Hex & NFC Studio!`);
    });

    document.getElementById('btn-ext-copy-hex')?.addEventListener('click', () => {
      MezaAudio.playClick();
      navigator.clipboard.writeText(data.directHex).then(() => {
        showToast(`📋 Hex [${data.directHex}] disalin ke clipboard!`);
      });
    });

    document.getElementById('btn-ext-copy-raw')?.addEventListener('click', () => {
      MezaAudio.playClick();
      navigator.clipboard.writeText(data.rawText).then(() => {
        showToast(`📋 Payload [${data.rawText}] disalin!`);
      });
    });

    document.getElementById('btn-ext-to-arena')?.addEventListener('click', () => {
      MezaAudio.playClick();
      const tabArenaBtn = document.querySelector('[data-tab="tab-arena"]');
      if (tabArenaBtn) tabArenaBtn.click();
      MezaArena.updateMarkers([m]);
      showToast(`⚔️ Pokémon ${m.pokemon.name} siap bertarung di Arena!`);
    });

    document.getElementById('btn-ext-to-db')?.addEventListener('click', () => {
      MezaAudio.playClick();
      const tabGenBtn = document.querySelector('[data-tab="tab-generator"]');
      if (tabGenBtn) tabGenBtn.click();
      loadPokemonIntoForm(m.pokemon);
      showToast(`💾 Tag #${data.rawText} dimuat ke form Pokédex!`);
    });
  }

  // Real-time Scanner Telemetry & Arena Sync
  MezaScanner.onMarkersDetected(({ markers, fps, totalCount }) => {
    statFps.textContent = fps;
    statCount.textContent = totalCount;

    // Render detected cards table/list
    detectedList.innerHTML = '';
    if (markers.length === 0) {
      detectedList.innerHTML = '<div class="empty-hint">Arahkan kamera ke tag atau letakkan kartu di meja sensor...</div>';
      renderExtractionInspector(null);
    } else {
      let activeMarker = markers.find(m => String(m.id) === String(selectedMarkerId)) || markers[0];
      selectedMarkerId = activeMarker.id;

      markers.forEach(m => {
        const item = document.createElement('div');
        const isSelected = String(m.id) === String(selectedMarkerId);
        item.className = 'detected-card-row' + (isSelected ? ' selected' : '');
        item.innerHTML = `
          <div class="row-id">#${m.id}</div>
          <div class="row-info">
            <div class="row-name">${m.pokemon.name} <span class="row-tier">${m.tier.stars}</span></div>
            <div class="row-meta">Posisi: (${Math.round(m.center.x)}, ${Math.round(m.center.y)}) | Rotasi: ${m.angle}°</div>
          </div>
          <div class="row-type" style="color:${m.tier.color}">${m.pokemon.type}</div>
        `;

        item.addEventListener('click', () => {
          MezaAudio.playClick();
          selectedMarkerId = m.id;
          document.querySelectorAll('.detected-card-row').forEach(r => r.classList.remove('selected'));
          item.classList.add('selected');
          renderExtractionInspector(m);
        });

        detectedList.appendChild(item);
      });

      renderExtractionInspector(activeMarker);
    }

    // Forward telemetry to Battle Arena
    MezaArena.updateMarkers(markers);
  });

  // --- 5. Arena Simulator Controls ---
  btnResetArena.addEventListener('click', () => {
    MezaAudio.playClick();
    MezaArena.resetBoss();
    showToast('Arena di-reset!');
  });

  // Simulate Slide Gesture with Keyboard/Button
  btnSimulateSlide.addEventListener('click', () => {
    const curP = getFormData();
    // Simulate marker presence and rapid movement
    const simMarker = {
      id: curP.id,
      center: { x: arenaCanvas.width / 2, y: arenaCanvas.height * 0.75 },
      pokemon: curP,
      tier: MezaDB.STAR_TIERS[curP.stars] || MezaDB.STAR_TIERS[5]
    };

    MezaArena.updateMarkers([simMarker]);

    setTimeout(() => {
      // Move up into attack zone
      simMarker.center.y = arenaCanvas.height * 0.40;
      MezaArena.updateMarkers([simMarker]);
      MezaArena.triggerManualAttack(curP.id);
    }, 150);
  });

  // --- 6. Database / Pokedex Grid ---
  function renderDbGrid() {
    dbGrid.innerHTML = '';
    const catalog = MezaDB.getAll();

    catalog.forEach(p => {
      const tier = MezaDB.STAR_TIERS[p.stars] || MezaDB.STAR_TIERS[5];
      const typeInfo = MezaDB.TYPES[p.type] || MezaDB.TYPES.Normal;

      const card = document.createElement('div');
      card.className = 'pokedex-card';
      card.style.borderColor = tier.borderColor;

      card.innerHTML = `
        <div class="card-header">
          <span class="card-id">ID #${p.id}</span>
          <span class="card-tier" style="color:${tier.color}">${tier.stars}</span>
        </div>
        <div class="card-title">${p.name}</div>
        <div class="card-dex">${typeInfo.icon} ${p.type} | ${p.dex}</div>
        <div class="card-stats">
          <span>HP: ${p.hp}</span>
          <span>ATK: ${p.attack}</span>
          <span>DEF: ${p.defense}</span>
          <span>SPD: ${p.speed}</span>
        </div>
        <div class="card-move">${p.move}</div>
        <div class="card-actions">
          <button class="btn btn-sm btn-edit" data-id="${p.id}">Edit / Cetak</button>
          <button class="btn btn-sm btn-del" data-id="${p.id}">Hapus</button>
        </div>
      `;

      card.querySelector('.btn-edit').addEventListener('click', () => {
        MezaAudio.playClick();
        loadPokemonIntoForm(p);
        pkmnSelect.value = p.id;
        document.querySelector('[data-tab="tab-generator"]').click();
      });

      card.querySelector('.btn-del').addEventListener('click', () => {
        if (confirm(`Hapus ${p.name} (ID #${p.id}) dari database?`)) {
          MezaAudio.playClick();
          MezaDB.remove(p.id);
          refreshPokemonDropdown();
          renderDbGrid();
        }
      });

      dbGrid.appendChild(card);
    });
  }

  btnExportDb.addEventListener('click', () => {
    MezaAudio.playClick();
    const jsonStr = MezaDB.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'Mezastar_Pokedex_Database.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Database berhasil diekspor ke JSON!');
  });

  btnImportDb.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const ok = MezaDB.importJSON(evt.target.result);
      if (ok) {
        refreshPokemonDropdown();
        renderDbGrid();
        showToast('Database berhasil diimpor!');
      } else {
        alert('Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  });

  btnResetDb.addEventListener('click', () => {
    if (confirm('Kembalikan database ke daftar Pokémon bawaan? Semua editan kustom akan direset.')) {
      MezaAudio.playClick();
      MezaDB.resetToDefaults();
      refreshPokemonDropdown();
      renderDbGrid();
      showToast('Database direset ke pengaturan awal.');
    }
  });

  // Sound toggle
  btnMute.addEventListener('click', () => {
    const isMuted = MezaAudio.toggleMute();
    btnMute.textContent = isMuted ? '🔇 Audio: Mati' : '🔊 Audio: Aktif';
  });

  // --- 7. Toast Notification Helper ---
  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // --- 8. App Startup ---
  refreshPokemonDropdown();
  renderDbGrid();

  // Load first pokemon
  const first = MezaDB.getAll()[0];
  if (first) {
    loadPokemonIntoForm(first);
  }

  // Initialize Scanner with elements
  MezaScanner.init({
    video: videoFeed,
    displayCanvas: scannerCanvas,
    dictionaryName: dictSelect.value
  });

  // Initialize Arena
  arenaCanvas.width = 960;
  arenaCanvas.height = 600;
  MezaArena.init(arenaCanvas);

  // --- 9. Hex & NFC Studio Bindings (Adapted from DOKUMENTASI_TEKNIS_HEXADECIMAL.md) ---
  const nfcBadge = document.getElementById('nfc-status-badge');
  const btnStartNfc = document.getElementById('btn-start-nfc');
  const nfcResultBox = document.getElementById('nfc-result-box');
  const nfcTagUid = document.getElementById('nfc-tag-uid');
  const nfcTagTime = document.getElementById('nfc-tag-time');
  const nfcTagNdef = document.getElementById('nfc-tag-ndef');
  const btnNfcToHex = document.getElementById('btn-nfc-to-hex');
  const btnNfcToGame = document.getElementById('btn-nfc-to-game');

  const hexInputRaw = document.getElementById('hex-input-raw');
  const btnHexClean = document.getElementById('btn-hex-clean');
  const btnHexConvert = document.getElementById('btn-hex-convert');
  const resHexClean = document.getElementById('res-hex-clean');
  const resHexAscii = document.getElementById('res-hex-ascii');
  const resHexInt16 = document.getElementById('res-hex-int16');
  const resHexInt32 = document.getElementById('res-hex-int32');
  const resHexBin = document.getElementById('res-hex-bin');
  const resHexBcc = document.getElementById('res-hex-bcc');

  const aburizDecodeInput = document.getElementById('aburiz-decode-input');
  const btnAburizDecode = document.getElementById('btn-aburiz-decode');
  const resAburizVal = document.getElementById('res-aburiz-val');
  const resAburizLe = document.getElementById('res-aburiz-le');
  const resAburizMark = document.getElementById('res-aburiz-mark');
  const resAburizValid = document.getElementById('res-aburiz-valid');

  const aburizEncodeVal = document.getElementById('aburiz-encode-val');
  const aburizEncodeMark = document.getElementById('aburiz-encode-mark');
  const btnAburizEncode = document.getElementById('btn-aburiz-encode');
  const resEncodeHex = document.getElementById('res-encode-hex');
  const btnSendToGenerator = document.getElementById('btn-send-to-generator');

  // Check Web NFC support
  if (MezaHexNFC && MezaHexNFC.isWebNfcSupported()) {
    nfcBadge.textContent = '🟢 Web NFC Didukung';
    nfcBadge.style.color = 'var(--success)';
  } else {
    nfcBadge.textContent = 'ℹ️ Perlu Android Chrome';
    nfcBadge.style.color = '#94A3B8';
  }

  // NFC Scanner
  btnStartNfc.addEventListener('click', async () => {
    MezaAudio.playClick();
    try {
      btnStartNfc.textContent = '⏳ Menunggu Tap Kartu...';
      await MezaHexNFC.startWebNfcScan();
      showToast('Pemindai NFC aktif! Tempelkan kartu ke punggung HP.');
    } catch (err) {
      alert(`NFC Error: ${err.message}`);
      btnStartNfc.textContent = '📡 Aktifkan Pemindaian NFC HP';
    }
  });

  MezaHexNFC.onNfcTagDetected((tag) => {
    MezaAudio.playScan();
    nfcResultBox.style.display = 'block';
    nfcTagUid.textContent = tag.uid;
    nfcTagTime.textContent = tag.timestamp;
    nfcTagNdef.textContent = tag.ndefText ? `NDEF Payload: ${tag.ndefText}` : 'Tidak ada NDEF (Kartu Standar)';
    showToast(`Kartu NFC Terdeteksi! UID: ${tag.uid}`);
  });

  btnNfcToHex.addEventListener('click', () => {
    MezaAudio.playClick();
    hexInputRaw.value = nfcTagUid.textContent;
    runHexConversion();
    showToast('UID disalin ke Hex Converter!');
  });

  btnNfcToGame.addEventListener('click', () => {
    MezaAudio.playClick();
    const uid = nfcTagUid.textContent;
    markerIdInput.value = parseInt(uid.slice(0, 6), 16) % 1000 || 0;
    pkmnNameInput.value = `NFC Tag #${uid.slice(-4)}`;
    updateTagPreview();
    document.querySelector('[data-tab="tab-generator"]').click();
    showToast(`UID ${uid} berhasil ditautkan ke Generator!`);
  });

  // Smart Hex Converter logic
  function runHexConversion() {
    const raw = hexInputRaw.value.trim();
    if (!raw) return;

    const clean = MezaHexNFC.sanitizeHex(raw);
    const ascii = MezaHexNFC.hexToAscii(raw);
    const ints = MezaHexNFC.hexToIntegers(raw);

    resHexClean.textContent = clean || '-';
    resHexAscii.textContent = ascii || '-';
    resHexInt16.textContent = ints.int16BE !== null ? `BE: ${ints.int16BE} | LE: ${ints.int16LE}` : '-';
    resHexInt32.textContent = ints.int32BE !== null ? `BE: ${ints.int32BE} | LE: ${ints.int32LE}` : '-';
    resHexBin.textContent = ints.binary || '-';
    resHexBcc.textContent = ints.bccHex ? `0x${ints.bccHex}` : '-';
  }

  btnHexClean.addEventListener('click', () => {
    MezaAudio.playClick();
    hexInputRaw.value = MezaHexNFC.sanitizeHex(hexInputRaw.value);
    runHexConversion();
  });

  btnHexConvert.addEventListener('click', () => {
    MezaAudio.playClick();
    runHexConversion();
  });

  hexInputRaw.addEventListener('input', runHexConversion);

  // Aburiz Monetary Formula: Decode
  function runAburizDecode() {
    const raw = aburizDecodeInput.value.trim();
    try {
      const res = MezaHexNFC.decodeAburizBlock(raw);
      resAburizVal.textContent = res.aburizValue.toFixed(2);
      resAburizLe.textContent = res.littleEndianValue.toFixed(2);
      resAburizMark.textContent = res.markDesc;
      if (res.isChecksumValid) {
        resAburizValid.textContent = '✅ VALID (Inverted Checksum Cocok)';
        resAburizValid.style.color = 'var(--success)';
      } else {
        resAburizValid.textContent = '❌ INVALID (Checksum Tidak Sesuai)';
        resAburizValid.style.color = 'var(--danger)';
      }
    } catch (e) {
      alert(e.message);
    }
  }

  btnAburizDecode.addEventListener('click', () => {
    MezaAudio.playClick();
    runAburizDecode();
  });

  // Aburiz Monetary Formula: Encode
  function runAburizEncode() {
    const val = parseFloat(aburizEncodeVal.value) || 0;
    const mark = parseInt(aburizEncodeMark.value, 10) || 0xDB;
    const res = MezaHexNFC.encodeAburizBlock(val, mark, 0x04);
    resEncodeHex.value = res.hexFormatted;
  }

  btnAburizEncode.addEventListener('click', () => {
    MezaAudio.playClick();
    runAburizEncode();
    showToast('Berhasil mengenkripsi 16-byte block!');
  });

  // Initial encode run
  runAburizEncode();

  btnSendToGenerator.addEventListener('click', () => {
    MezaAudio.playClick();
    const hex = resEncodeHex.value.replace(/\s+/g, '');
    const numId = parseInt(hex.slice(0, 4), 16) % 1000;
    markerIdInput.value = numId;
    pkmnNameInput.value = `Arcade Coin Val: ${aburizEncodeVal.value}`;
    updateTagPreview();
    document.querySelector('[data-tab="tab-generator"]').click();
    showToast('Payload berhasil ditautkan ke Generator!');
  });

  // Initialize MezaCopier
  if (typeof MezaCopier !== 'undefined' && MezaCopier.init) {
    MezaCopier.init();
  }
});
