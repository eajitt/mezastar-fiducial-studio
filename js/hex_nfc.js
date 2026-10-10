// MezaTag Hex & NFC Studio: Adapted from DOKUMENTASI_TEKNIS_HEXADECIMAL.md
// Implements: Smart Hex Converter, Aburiz Monetary Formula Engine, Web NFC API, and Arcade Token Mapping.

const MezaHexNFC = (function() {

  // --- 1. Smart Hex Sanitizer & Converter (Bab 3 Dokumentasi) ---
  function sanitizeHex(input) {
    if (!input) return '';
    // Clean spaces, 0x, colons, dashes, brackets
    let clean = input.replace(/0x|[^0-9A-Fa-f]/gi, '');
    if (clean.length % 2 !== 0) {
      clean = '0' + clean; // Auto-pad leading zero
    }
    return clean.toUpperCase();
  }

  function hexToBytes(hexStr) {
    const clean = sanitizeHex(hexStr);
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  }

  function bytesToHex(bytes, delimiter = ' ') {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(delimiter);
  }

  function hexToAscii(hexStr) {
    const bytes = hexToBytes(hexStr);
    let result = '';
    bytes.forEach(b => {
      // Filter non-printable ASCII (outside 0x20 - 0x7E)
      if (b >= 32 && b <= 126) {
        result += String.fromCharCode(b);
      } else {
        result += '·';
      }
    });
    return result;
  }

  function asciiToHex(text) {
    let hex = '';
    for (let i = 0; i < text.length; i++) {
      hex += text.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
    return hex.trim();
  }

  function hexToIntegers(hexStr) {
    const bytes = hexToBytes(hexStr);
    const len = bytes.length;

    let int16BE = null, int16LE = null;
    let int32BE = null, int32LE = null;

    if (len >= 2) {
      int16BE = (bytes[0] << 8) | bytes[1];
      int16LE = bytes[0] | (bytes[1] << 8);
    }

    if (len >= 4) {
      int32BE = ((bytes[0] << 24) >>> 0) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
      int32LE = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | ((bytes[3] << 24) >>> 0);
    }

    // Binary string for first few bytes
    const binary = Array.from(bytes.slice(0, 4))
      .map(b => b.toString(2).padStart(8, '0'))
      .join(' ');

    // BCC (Bit Count Checksum via XOR for UID)
    let bcc = 0;
    if (len >= 4) {
      bcc = bytes[0] ^ bytes[1] ^ bytes[2] ^ bytes[3];
    }

    return {
      byteCount: len,
      int16BE,
      int16LE,
      int32BE,
      int32LE,
      binary,
      bccHex: bcc.toString(16).padStart(2, '0').toUpperCase()
    };
  }

  // --- 2. Aburiz Monetary Formula Engine (Bab 2 Dokumentasi) ---
  // Structure: [ B0 | B1 | B2 | MK | ~B0 | ~B1 | ~B2 | ~MK | B0 | B1 | B2 | MK | AD | ~AD | AD | ~AD ]
  function decodeAburizBlock(hexInput) {
    const bytes = hexToBytes(hexInput);
    if (bytes.length < 16) {
      throw new Error(`Panjang data blok harus minimal 16 byte (terbaca ${bytes.length} byte).`);
    }

    const b0 = bytes[0];
    const b1 = bytes[1];
    const b2 = bytes[2];
    const mk = bytes[3];

    // Formula 1: Aburiz Specific (B0 * 256 + B1) + (B2 / 100)
    const aburizValue = (b0 * 256 + b1) + (b2 / 100);

    // Formula 2: Standard Little-Endian (B0 + B1 * 256) + (B2 / 100)
    const littleEndianValue = (b0 + b1 * 256) + (b2 / 100);

    // Integrity Check: Bitwise Inverted Checksum
    const isChecksumValid = 
      bytes[4] === (255 - b0) &&
      bytes[5] === (255 - b1) &&
      bytes[6] === (255 - b2) &&
      bytes[7] === (255 - mk) &&
      bytes[8] === b0 &&
      bytes[9] === b1 &&
      bytes[10] === b2 &&
      bytes[11] === mk &&
      bytes[12] === (255 - bytes[13]) &&
      bytes[14] === (255 - bytes[15]);

    // Mark Byte Meaning (Bab 2.5)
    let markDesc = 'Status Standar';
    if (mk === 0xDB) markDesc = 'Debit Transit / Wahana Aktif (0xDB)';
    else if (mk === 0x01) markDesc = 'Kartu Merchant / POS Standar (0x01)';
    else if (mk === 0x1B) markDesc = 'Tier Privilege / Multi-Tier (0x1B)';
    else if (mk === 0x06) markDesc = 'Rolling Counter / Audit (0x06)';

    return {
      aburizValue,
      littleEndianValue,
      b0, b1, b2, mk,
      markHex: mk.toString(16).padStart(2, '0').toUpperCase(),
      markDesc,
      blockAddress: bytes[12],
      isChecksumValid,
      rawHexFormatted: bytesToHex(bytes.slice(0, 16))
    };
  }

  function encodeAburizBlock(decimalVal, markByte = 0xDB, blockAddress = 0x04) {
    const val = Number(decimalVal) || 0;
    const whole = Math.floor(val);
    const cents = Math.round((val - whole) * 100) % 100;

    const b0 = Math.floor(whole / 256) & 0xFF;
    const b1 = (whole % 256) & 0xFF;
    const b2 = cents & 0xFF;
    const mk = markByte & 0xFF;
    const ad = blockAddress & 0xFF;

    const block = new Uint8Array(16);
    // 0-3: Value section
    block[0] = b0;
    block[1] = b1;
    block[2] = b2;
    block[3] = mk;

    // 4-7: Bitwise Inverted Checksum
    block[4] = 255 - b0;
    block[5] = 255 - b1;
    block[6] = 255 - b2;
    block[7] = 255 - mk;

    // 8-11: Duplicate Backup
    block[8] = b0;
    block[9] = b1;
    block[10] = b2;
    block[11] = mk;

    // 12-15: Block Address & Inverted Address
    block[12] = ad;
    block[13] = 255 - ad;
    block[14] = ad;
    block[15] = 255 - ad;

    return {
      bytes: block,
      hexFormatted: bytesToHex(block),
      cleanHex: bytesToHex(block, '')
    };
  }

  // --- 3. Web NFC Scanner API (Untuk Browser Android / Chrome) ---
  let isNfcScanning = false;
  let nfcReaderInstance = null;
  let onNfcTagDetectedCallback = null;

  function isWebNfcSupported() {
    return (typeof window !== 'undefined' && 'NDEFReader' in window);
  }

  async function startWebNfcScan() {
    if (!isWebNfcSupported()) {
      throw new Error('Web NFC API tidak didukung oleh browser ini. Gunakan Chrome pada perangkat Android dengan fitur NFC aktif.');
    }

    try {
      const NDEFReaderClass = window.NDEFReader;
      nfcReaderInstance = new NDEFReaderClass();
      await nfcReaderInstance.scan();
      isNfcScanning = true;

      nfcReaderInstance.addEventListener('reading', (event) => {
        const serialNumber = event.serialNumber ? event.serialNumber.replace(/:/g, '').toUpperCase() : 'UNKNOWN_UID';
        
        let ndefText = '';
        if (event.message && event.message.records) {
          event.message.records.forEach(rec => {
            const dec = new TextDecoder();
            if (rec.data) ndefText += dec.decode(rec.data) + ' ';
          });
        }

        const tagData = {
          uid: serialNumber,
          ndefText: ndefText.trim(),
          timestamp: new Date().toLocaleTimeString()
        };

        if (onNfcTagDetectedCallback) {
          onNfcTagDetectedCallback(tagData);
        }
      });

      return true;
    } catch (err) {
      isNfcScanning = false;
      throw err;
    }
  }

  function onNfcTagDetected(cb) {
    onNfcTagDetectedCallback = cb;
  }

  return {
    sanitizeHex,
    hexToBytes,
    bytesToHex,
    hexToAscii,
    asciiToHex,
    hexToIntegers,
    decodeAburizBlock,
    encodeAburizBlock,
    isWebNfcSupported,
    startWebNfcScan,
    onNfcTagDetected,
    getIsNfcScanning: () => isNfcScanning
  };
})();
