// MezaTag Scanner: Camera Feed, Image Upload, and Real-Time Fiducial & Micro QR Tracking
const MezaScanner = (function() {
  let videoEl = null;
  let displayCanvas = null;
  let hiddenCanvas = null;
  let hiddenCtx = null;
  let displayCtx = null;

  let stream = null;
  let isRunning = false;
  let animationFrameId = null;
  let isDetecting = false;

  let detector = null;
  let currentDictionary = 'AUTO_DETECT'; // Default: auto-detect both ArUco and Mezastar Micro QR!

  // Tracking state
  let lastSeenIds = new Set();
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let currentFps = 0;

  // Listeners
  let onMarkersDetectedCallback = null;

  function init(options) {
    videoEl = options.video;
    displayCanvas = options.displayCanvas;
    displayCtx = displayCanvas.getContext('2d');

    hiddenCanvas = document.createElement('canvas');
    hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

    if (typeof ZXingWASM !== 'undefined' && ZXingWASM.prepareZXingModule) {
      try {
        ZXingWASM.prepareZXingModule({
          overrides: {
            locateFile: (p) => {
              if (p && p.endsWith('.wasm')) return 'js/vendor/' + p;
              return p;
            }
          }
        });
      } catch (e) {
        console.warn('ZXing locateFile init:', e);
      }
    }

    setDictionary(options.dictionaryName || currentDictionary);
  }

  function setDictionary(dictName) {
    currentDictionary = dictName;
    if (dictName !== 'MEZASTAR_MICRO_QR' && dictName !== 'AUTO_DETECT') {
      if (typeof AR !== 'undefined' && AR.Detector) {
        detector = new AR.Detector({
          dictionaryName: currentDictionary
        });
      }
    } else {
      // In auto or micro QR mode, use ARUCO_4X4 as backup ArUco dictionary
      if (typeof AR !== 'undefined' && AR.Detector) {
        detector = new AR.Detector({
          dictionaryName: 'ARUCO_4X4_1000'
        });
      }
    }
  }

  async function getAvailableCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    } catch (e) {
      console.warn('Could not enumerate video devices:', e);
      return [];
    }
  }

  async function startCamera(deviceId = null) {
    stopCamera();

    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment'
      },
      audio: false
    };

    if (deviceId) {
      constraints.video.deviceId = { exact: deviceId };
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = stream;
      await videoEl.play();

      isRunning = true;
      requestAnimationFrame(processFrame);
      return true;
    } catch (err) {
      console.error('Error opening camera:', err);
      throw err;
    }
  }

  function stopCamera() {
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
    lastSeenIds.clear();
  }

  // Real-time camera processing loop
  async function processFrame() {
    if (!isRunning) return;

    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      const vWidth = videoEl.videoWidth;
      const vHeight = videoEl.videoHeight;

      if (displayCanvas.width !== vWidth || displayCanvas.height !== vHeight) {
        displayCanvas.width = vWidth;
        displayCanvas.height = vHeight;
        hiddenCanvas.width = vWidth;
        hiddenCanvas.height = vHeight;
      }

      // Draw camera feed to display and hidden canvases
      displayCtx.drawImage(videoEl, 0, 0, vWidth, vHeight);
      hiddenCtx.drawImage(videoEl, 0, 0, vWidth, vHeight);

      if (!isDetecting) {
        isDetecting = true;
        try {
          const imageData = hiddenCtx.getImageData(0, 0, vWidth, vHeight);
          await detectAndRender(imageData, vWidth, vHeight);
        } catch (e) {
          console.error('Frame detection error:', e);
        } finally {
          isDetecting = false;
        }
      }

      // Calculate FPS
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }
    }

    animationFrameId = requestAnimationFrame(processFrame);
  }

  // Scan a static image file (direct file buffer + canvas fallback)
  async function scanImage(imgElement, file = null) {
    const width = imgElement.naturalWidth || imgElement.width;
    const height = imgElement.naturalHeight || imgElement.height;

    displayCanvas.width = width;
    displayCanvas.height = height;
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;

    displayCtx.drawImage(imgElement, 0, 0, width, height);
    hiddenCtx.drawImage(imgElement, 0, 0, width, height);

    let processedMarkers = [];

    // 1. Direct File decode with ZXingWASM (highest accuracy for uploaded images)
    if (file && typeof ZXingWASM !== 'undefined' && ZXingWASM.readBarcodesFromImageFile) {
      try {
        const fileQRs = await ZXingWASM.readBarcodesFromImageFile(file, {
          formats: ['MicroQRCode', 'QRCode', 'RMQRCode'],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true
        });

        if (fileQRs && fileQRs.length > 0) {
          fileQRs.forEach(qr => {
            const p = qr.position;
            if (!p || !p.topLeft) return;

            const corners = [
              { x: p.topLeft.x, y: p.topLeft.y },
              { x: p.topRight.x, y: p.topRight.y },
              { x: p.bottomRight.x, y: p.bottomRight.y },
              { x: p.bottomLeft.x, y: p.bottomLeft.y }
            ];

            const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
            const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

            const dx = corners[1].x - corners[0].x;
            const dy = corners[1].y - corners[0].y;
            let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
            if (angleDeg < 0) angleDeg += 360;

            const edgeLen = Math.round(Math.hypot(dx, dy));
            const pokemon = MezaDB.getById(qr.text);
            const tier = MezaDB.STAR_TIERS[pokemon.stars] || MezaDB.STAR_TIERS[5];

            const item = {
              id: qr.text,
              rawText: qr.text,
              type: 'MicroQR',
              format: qr.format || 'MicroQRCode',
              version: qr.version || 'M2',
              ecLevel: qr.ecLevel || 'M',
              bytes: qr.bytes,
              symbology: qr.symbology || 'QRCode',
              symbologyIdentifier: qr.symbologyIdentifier || ']Q1',
              corners,
              center: { x: cx, y: cy },
              angle: angleDeg,
              size: edgeLen,
              pokemon,
              tier
            };

            processedMarkers.push(item);
            MezaAudio.playScan();
            drawMarkerOverlay(displayCtx, item);
          });
        }
      } catch (err) {
        console.warn('ZXing file decode error:', err);
      }
    }

    // 2. If no QR found from file or also check ArUco/Canvas
    if (processedMarkers.length === 0) {
      const imageData = hiddenCtx.getImageData(0, 0, width, height);
      processedMarkers = await detectAndRender(imageData, width, height);
    } else {
      if (onMarkersDetectedCallback) {
        onMarkersDetectedCallback({
          markers: processedMarkers,
          fps: currentFps,
          totalCount: processedMarkers.length,
          dictionaryName: currentDictionary
        });
      }
    }

    return processedMarkers;
  }

  // Core detection and AR overlay rendering
  async function detectAndRender(imageData, width, height) {
    const processedMarkers = [];
    const currentSeenIds = new Set();

    // Check QR/Micro QR in auto, micro QR, or as general fallback
    const shouldCheckQR = true;
    const shouldCheckAruco = (currentDictionary !== 'MEZASTAR_MICRO_QR');

    // 1. Check for Micro QR Code / Mezastar Tag using ZXingWASM
    if (shouldCheckQR && typeof ZXingWASM !== 'undefined' && ZXingWASM.readBarcodesFromImageData) {
      try {
        const qrList = await ZXingWASM.readBarcodesFromImageData(imageData, {
          formats: ['MicroQRCode', 'QRCode', 'RMQRCode'],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true
        });

        if (qrList && qrList.length > 0) {
          qrList.forEach(qr => {
            const p = qr.position;
            if (!p || !p.topLeft) return;

            const corners = [
              { x: p.topLeft.x, y: p.topLeft.y },
              { x: p.topRight.x, y: p.topRight.y },
              { x: p.bottomRight.x, y: p.bottomRight.y },
              { x: p.bottomLeft.x, y: p.bottomLeft.y }
            ];

            const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
            const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

            const dx = corners[1].x - corners[0].x;
            const dy = corners[1].y - corners[0].y;
            let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
            if (angleDeg < 0) angleDeg += 360;

            const edgeLen = Math.round(Math.hypot(dx, dy));

            // Fetch Pokemon data
            const pokemon = MezaDB.getById(qr.text);
            const tier = MezaDB.STAR_TIERS[pokemon.stars] || MezaDB.STAR_TIERS[5];

            const item = {
              id: qr.text,
              rawText: qr.text,
              type: 'MicroQR',
              format: qr.format || 'MicroQRCode',
              version: qr.version || 'M2',
              ecLevel: qr.ecLevel || 'M',
              bytes: qr.bytes,
              symbology: qr.symbology || 'QRCode',
              symbologyIdentifier: qr.symbologyIdentifier || ']Q1',
              corners,
              center: { x: cx, y: cy },
              angle: angleDeg,
              size: edgeLen,
              pokemon,
              tier
            };

            processedMarkers.push(item);
            currentSeenIds.add(String(qr.text));

            if (!lastSeenIds.has(String(qr.text))) {
              MezaAudio.playScan();
            }

            drawMarkerOverlay(displayCtx, item);
          });
        }
      } catch (err) {
        console.warn('ZXing error:', err);
      }
    }

    // 2. Check for ArUco / AprilTag markers
    if (shouldCheckAruco) {
      if (!detector) {
        setDictionary(currentDictionary);
      }

      let markers = [];
      try {
        if (detector) {
          markers = detector.detect(imageData) || [];
        }
      } catch (e) {
        console.warn('ArUco detection error:', e);
      }

      markers.forEach(marker => {
        const corners = marker.corners;
        if (!corners || corners.length < 4) return;

        const actualCx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
        const actualCy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

        const dx = corners[1].x - corners[0].x;
        const dy = corners[1].y - corners[0].y;
        let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        const edgeLen = Math.round(Math.hypot(dx, dy));
        const pokemon = MezaDB.getById(marker.id);
        const tier = MezaDB.STAR_TIERS[pokemon.stars] || MezaDB.STAR_TIERS[5];

        const item = {
          id: marker.id,
          rawText: String(marker.id),
          type: 'ArUco',
          format: currentDictionary,
          corners,
          center: { x: actualCx, y: actualCy },
          angle: angleDeg,
          size: edgeLen,
          pokemon,
          tier
        };

        processedMarkers.push(item);
        currentSeenIds.add(String(marker.id));

        if (!lastSeenIds.has(String(marker.id))) {
          MezaAudio.playScan();
        }

        drawMarkerOverlay(displayCtx, item);
      });
    }

    lastSeenIds = currentSeenIds;

    // Trigger external callback (for Arena simulator & UI telemetry)
    if (onMarkersDetectedCallback) {
      onMarkersDetectedCallback({
        markers: processedMarkers,
        fps: currentFps,
        totalCount: processedMarkers.length,
        dictionaryName: currentDictionary
      });
    }

    return processedMarkers;
  }

  // Render Augmented Reality Visual Elements over detected marker
  function drawMarkerOverlay(ctx, item) {
    const { corners, center, angle, pokemon, tier, id, format } = item;

    ctx.save();

    // 1. Glowing Bounding Box
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();

    ctx.lineWidth = 3;
    ctx.strokeStyle = tier.color || '#22C55E';
    ctx.shadowColor = tier.aura || 'rgba(34, 197, 94, 0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Semi-transparent fill inside marker
    ctx.fillStyle = tier.aura || 'rgba(34, 197, 94, 0.15)';
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // 2. Corner Target Pins (c0=Red top-left, c1=Green top-right, c2=Blue bottom-right, c3=Yellow bottom-left)
    const pinColors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B'];
    corners.forEach((c, idx) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = pinColors[idx];
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Center Point & Orientation Arrow
    ctx.beginPath();
    ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = tier.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Orientation Ray (points perpendicular to top edge)
    const arrowRad = (angle - 90) * (Math.PI / 180);
    const arrowLen = Math.max(40, item.size * 0.7);
    const arrowEndX = center.x + Math.cos(arrowRad) * arrowLen;
    const arrowEndY = center.y + Math.sin(arrowRad) * arrowLen;

    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Arrow Tip
    ctx.beginPath();
    ctx.arc(arrowEndX, arrowEndY, 4, 0, Math.PI * 2);
    ctx.fillStyle = tier.color;
    ctx.fill();

    // 4. Floating Holographic Info HUD
    const hudY = Math.min(corners[0].y, corners[1].y) - 20;
    const hudW = 200;
    const hudH = 54;
    const hudX = center.x - hudW / 2;

    ctx.beginPath();
    ctx.roundRect(hudX, hudY - hudH, hudW, hudH, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tier.borderColor;
    ctx.stroke();

    // Pokemon name + Stars
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(pokemon.name, hudX + 10, hudY - hudH + 20);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = tier.color;
    ctx.fillText(tier.stars, hudX + 10, hudY - hudH + 36);

    // ID Badge & Format on right
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText(`ID #${id}`, hudX + hudW - 10, hudY - hudH + 20);
    ctx.fillText(`${format || 'Tag'} | ${angle}°`, hudX + hudW - 10, hudY - hudH + 36);

    ctx.restore();
  }

  function onMarkersDetected(cb) {
    onMarkersDetectedCallback = cb;
  }

  return {
    init,
    startCamera,
    stopCamera,
    getAvailableCameras,
    setDictionary,
    scanImage,
    scanStaticImage: scanImage,
    onMarkersDetected,
    getCurrentFps: () => currentFps,
    getIsRunning: () => isRunning
  };
})();
