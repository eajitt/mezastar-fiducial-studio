// MezaTag Scanner: Camera Feed, Image Upload, and Real-Time Fiducial Tracking
const MezaScanner = (function() {
  let videoEl = null;
  let displayCanvas = null;
  let hiddenCanvas = null;
  let hiddenCtx = null;
  let displayCtx = null;

  let stream = null;
  let isRunning = false;
  let animationFrameId = null;

  let detector = null;
  let currentDictionary = 'ARUCO_4X4_1000';

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

    setDictionary(options.dictionaryName || currentDictionary);
  }

  function setDictionary(dictName) {
    currentDictionary = dictName;
    if (typeof AR !== 'undefined' && AR.Detector) {
      detector = new AR.Detector({
        dictionaryName: currentDictionary
      });
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
  function processFrame() {
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

      // Extract raw image data for detector
      const imageData = hiddenCtx.getImageData(0, 0, vWidth, vHeight);
      detectAndRender(imageData, vWidth, vHeight);

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

  // Scan a static image file
  function scanStaticImage(imgElement) {
    const width = imgElement.naturalWidth || imgElement.width;
    const height = imgElement.naturalHeight || imgElement.height;

    displayCanvas.width = width;
    displayCanvas.height = height;
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;

    displayCtx.drawImage(imgElement, 0, 0, width, height);
    hiddenCtx.drawImage(imgElement, 0, 0, width, height);

    const imageData = hiddenCtx.getImageData(0, 0, width, height);
    return detectAndRender(imageData, width, height);
  }

  // Core detection and AR overlay rendering
  function detectAndRender(imageData, width, height) {
    if (!detector) {
      setDictionary(currentDictionary);
    }

    let markers = [];
    try {
      markers = detector.detect(imageData) || [];
    } catch (e) {
      console.error('Detection error:', e);
      return [];
    }

    const processedMarkers = [];
    const currentSeenIds = new Set();

    markers.forEach(marker => {
      const corners = marker.corners;
      if (!corners || corners.length < 4) return;

      // 1. Calculate Center Coordinate (cx, cy)
      const cx = (corners[0].x + corners[1].x + corners[2].y + corners[3].x) / 4;
      const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

      // Actually, proper center:
      const actualCx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
      const actualCy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

      // 2. Calculate Angle / Rotation
      const dx = corners[1].x - corners[0].x;
      const dy = corners[1].y - corners[0].y;
      let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      if (angleDeg < 0) angleDeg += 360;

      // 3. Approximate physical size in pixels (top edge length)
      const edgeLen = Math.round(Math.hypot(dx, dy));

      // 4. Lookup Pokemon Data
      const pokemon = MezaDB.getById(marker.id);
      const tier = MezaDB.STAR_TIERS[pokemon.stars] || MezaDB.STAR_TIERS[5];

      const item = {
        id: marker.id,
        corners,
        center: { x: actualCx, y: actualCy },
        angle: angleDeg,
        size: edgeLen,
        pokemon,
        tier
      };

      processedMarkers.push(item);
      currentSeenIds.add(marker.id);

      // Play lock-on audio cue if newly detected
      if (!lastSeenIds.has(marker.id)) {
        MezaAudio.playScan();
      }

      // Draw AR Overlays
      drawMarkerOverlay(displayCtx, item);
    });

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
    const { corners, center, angle, pokemon, tier, id } = item;

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
    const hudW = 180;
    const hudH = 50;
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

    // ID Badge on right
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText(`ID #${id}`, hudX + hudW - 10, hudY - hudH + 20);
    ctx.fillText(`${angle}°`, hudX + hudW - 10, hudY - hudH + 36);

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
    scanStaticImage,
    onMarkersDetected,
    getCurrentFps: () => currentFps,
    getIsRunning: () => isRunning
  };
})();
