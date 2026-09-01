const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const { concepts, palette } = require("./build-logo.cjs");

const root = path.resolve(__dirname, "..");

function crc32(buffer) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buffer);
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// Minimal 8-bit RGBA PNG encoder. Pixel art only, so no filtering is needed.
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;  // bit depth
  header[9] = 6;  // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function render(grid, scale) {
  const n = grid.length;
  const size = n * scale;
  const rgba = Buffer.alloc(size * size * 4); // zero-filled = fully transparent

  for (let gy = 0; gy < n; gy += 1) {
    for (let gx = 0; gx < n; gx += 1) {
      const fill = palette[grid[gy][gx]];
      if (!fill) continue;
      const [r, g, b] = hexToRgb(fill);
      for (let y = gy * scale; y < (gy + 1) * scale; y += 1) {
        for (let x = gx * scale; x < (gx + 1) * scale; x += 1) {
          const offset = (y * size + x) * 4;
          rgba[offset] = r;
          rgba[offset + 1] = g;
          rgba[offset + 2] = b;
          rgba[offset + 3] = 255;
        }
      }
    }
  }

  return { png: encodePng(size, size, rgba), size };
}

const name = process.argv[2] || "monogram";
const grid = concepts[name];
if (!grid) throw new Error(`Unknown logo concept "${name}". Available: ${Object.keys(concepts).join(", ")}`);

const { png, size } = render(grid, 32); // 16 x 16 grid at 32x = 512px
const output = path.join(root, "favicon.png");
fs.writeFileSync(output, png);

console.log(`Wrote favicon.png from the "${name}" logo at ${size}x${size} (${png.length} bytes).`);
