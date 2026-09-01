const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

// Palette shared with the site theme.
const palette = {
  ".": null,
  K: "#2a0a0e", // outline
  R: "#c8152a", // crimson crest
  r: "#8f0f1e", // crest shadow
  G: "#f5c842", // gold
  g: "#c99a24", // gold shadow
  S: "#e8d4b8", // steel light
  s: "#a88972", // steel mid
  D: "#140306", // face opening
};

// Each concept is a square ASCII grid. Every row must be the same length.
const concepts = {};

// Draws a 1px dark outline around every filled cell. Lets a shape be plotted
// from its silhouette alone and still read as pixel art at small sizes.
function outline(grid, key = "K") {
  const n = grid.length;
  const copy = grid.map((row) => row.split(""));
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (grid[y][x] !== ".") continue;
      const touches = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < n && ny < n && grid[ny][nx] !== "." && grid[ny][nx] !== key;
      });
      if (touches) copy[y][x] = key;
    }
  }
  return copy.map((row) => row.join(""));
}

// A: Gladiator helmet, front view, crimson crest over a gold galea.
concepts.helmet = [
  "......RRRR......",
  ".....RRRRRR.....",
  "....KRRRRRRK....",
  "...KKKRRRRKKK...",
  "..KGGGGGGGGGGK..",
  ".KGGGGGGGGGGGGK.",
  "KGGGGGGGGGGGGGGK",
  "KGgDDDGGGGDDDgGK",
  "KGgDDDGGGGDDDgGK",
  "KGgDDDGGGGDDDgGK",
  "KGgDDDGGGGDDDgGK",
  ".KGgDDDGGDDDgGK.",
  "..KGgDDGGDDgGK..",
  "...KGgGGGGgGK...",
  "....KKGGGGKK....",
  "......KKKK......",
];

// B: Crossed gladius swords, plotted from the silhouette then outlined.
concepts.swords = (() => {
  const n = 16;
  const grid = Array.from({ length: n }, () => Array(n).fill("."));
  const put = (x, y, key) => {
    if (x >= 0 && y >= 0 && x < n && y < n) grid[y][x] = key;
  };

  // Two blades running corner to corner, two cells wide.
  for (let t = 0; t < 12; t += 1) {
    const blade = t < 9 ? "S" : "g"; // steel blade, then the grip
    put(13 - t, 2 + t, blade);
    put(12 - t, 2 + t, blade);
    put(2 + t, 2 + t, blade);
    put(3 + t, 2 + t, blade);
  }

  // Crossguards and pommels in gold.
  for (let i = -2; i <= 2; i += 1) {
    put(3 + i, 10 - i, "G");
    put(12 - i, 10 - i, "G");
  }
  put(2, 14, "G"); put(3, 14, "G"); put(2, 13, "G"); put(3, 13, "G");
  put(13, 14, "G"); put(12, 14, "G"); put(13, 13, "G"); put(12, 13, "G");

  return outline(grid.map((row) => row.join("")));
})();

// C: Pixel "G" monogram inside an arena arch.
concepts.monogram = [
  "..KKKKKKKKKKKK..",
  ".KRRRRRRRRRRRRK.",
  "KRRRRRRRRRRRRRRK",
  "KRRKKKKKKKKKKRRK",
  "KRRKGGGGGGGGKRRK",
  "KRRKGGKKKKGGKRRK",
  "KRRKGGKRRRRRRRRK",
  "KRRKGGKRRRRRRRRK",
  "KRRKGGKKGGGGKRRK",
  "KRRKGGGGGGGGKRRK",
  "KRRKGGKKKKGGKRRK",
  "KRRKGGGGGGGGKRRK",
  "KRRKKKKKKKKKKRRK",
  "KRRRRRRRRRRRRRRK",
  ".KRRRRRRRRRRRRK.",
  "..KKKKKKKKKKKK..",
];

function toSvg(grid, { size = 512, background = null } = {}) {
  const n = grid.length;
  grid.forEach((row, index) => {
    if (row.length !== n) throw new Error(`Row ${index} is ${row.length} cells, expected ${n}`);
  });

  const rects = [];
  if (background) rects.push(`<rect width="${n}" height="${n}" fill="${background}"/>`);

  // Merge horizontal runs of the same colour into single rects to keep the file small.
  for (let y = 0; y < n; y += 1) {
    let x = 0;
    while (x < n) {
      const key = grid[y][x];
      const fill = palette[key];
      if (fill === undefined) throw new Error(`Unknown palette key "${key}" at row ${y}`);
      if (fill === null) { x += 1; continue; }
      let run = 1;
      while (x + run < n && grid[y][x + run] === key) run += 1;
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="Gladihoppers Games">
${rects.map((rect) => `  ${rect}`).join("\n")}
</svg>
`;
}

// Only write files when run directly - build-favicon.cjs imports this module.
if (require.main === module) {
  const outputDir = process.argv[3] || path.join(root, "assets");
  fs.mkdirSync(outputDir, { recursive: true });

  const only = process.argv[2];
  for (const [name, grid] of Object.entries(concepts)) {
    if (only && only !== "all" && only !== name) continue;
    fs.writeFileSync(path.join(outputDir, `logo-${name}.svg`), toSvg(grid), "utf8");
    console.log(`Wrote logo-${name}.svg`);
  }
}

module.exports = { concepts, palette, toSvg };
