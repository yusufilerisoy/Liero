const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(size, outputPath) {
  // Colors
  const bgR = 0x1a, bgG = 0x0a, bgB = 0x2e; // #1a0a2e dark purple
  const circR = 0x00, circG = 0xcc, circB = 0x00; // #00cc00 green
  const txtR = 0xff, txtG = 0xff, txtB = 0xff; // white

  const cx = size / 2;
  const cy = size / 2;
  const circleRadius = size * 0.30;

  // Simple "L" shape parameters
  const lLeft = cx - size * 0.10;
  const lRight = cx + size * 0.12;
  const lTop = cy - size * 0.16;
  const lBottom = cy + size * 0.16;
  const lStroke = size * 0.06;
  const lFootTop = lBottom - lStroke;

  // Build raw pixel data (filter byte + RGB for each row)
  const rawData = Buffer.alloc(size * (1 + size * 3));

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 3);
    rawData[rowOffset] = 0; // filter: None

    for (let x = 0; x < size; x++) {
      const pixOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r, g, b;

      if (dist <= circleRadius) {
        // Inside green circle
        r = circR; g = circG; b = circB;

        // Draw "L" letter on top
        const inVerticalBar = (x >= lLeft && x <= lLeft + lStroke && y >= lTop && y <= lBottom);
        const inHorizontalBar = (y >= lFootTop && y <= lBottom && x >= lLeft && x <= lRight);
        if (inVerticalBar || inHorizontalBar) {
          r = txtR; g = txtG; b = txtB;
        }
      } else if (dist <= circleRadius + 2) {
        // Slight anti-alias / border
        const t = (dist - circleRadius) / 2;
        r = Math.round(circR * (1 - t) + bgR * t);
        g = Math.round(circG * (1 - t) + bgG * t);
        b = Math.round(circB * (1 - t) + bgB * t);
      } else {
        // Background
        r = bgR; g = bgG; b = bgB;
      }

      rawData[pixOffset] = r;
      rawData[pixOffset + 1] = g;
      rawData[pixOffset + 2] = b;
    }
  }

  // Compress pixel data
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // Build PNG file
  const chunks = [];

  // PNG Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  function writeChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const lenBuffer = Buffer.alloc(4);
    lenBuffer.writeUInt32BE(data.length, 0);

    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcInput);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);

    chunks.push(lenBuffer, typeBuffer, data, crcBuffer);
  }

  // CRC32 implementation
  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      table[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  writeChunk('IHDR', ihdr);

  // IDAT chunk
  writeChunk('IDAT', compressed);

  // IEND chunk
  writeChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat(chunks);
  fs.writeFileSync(outputPath, png);
  console.log(`Created ${outputPath} (${png.length} bytes, ${size}x${size})`);
}

const dir = path.dirname(process.argv[1]);
createPNG(192, path.join(dir, 'icon-192.png'));
createPNG(512, path.join(dir, 'icon-512.png'));
