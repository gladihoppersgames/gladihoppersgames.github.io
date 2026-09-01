const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const homepagePath = path.join(root, "index.html");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "games", "wgplayground-catalog.json"), "utf8"),
).categories;
const metadataByUrl = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "games", "game-metadata.json"), "utf8"))
    .games.map((game) => [game.url, game]),
);

const categories = [
  ["action", "Action Games"],
  ["adventure", "Adventure Games"],
  ["arcade", "Arcade Games"],
  ["cars", "Cars Games"],
  ["sports", "Sports Games"],
  ["horror", "Horror Games"],
  ["puzzles", "Puzzle Games"],
  ["2players", "2 Player Games"],
];

// Order follows the publishing standard: Featured, Trending, New, Popular.
const groups = [
  ["Featured Games", 0],
  ["Trending Games", 2],
  ["New Games", 4],
  ["Popular Games", 6],
];

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugFor(game) {
  return new URL(game.url).pathname.split("/").filter(Boolean)[2];
}

function squareImage(image) {
  return image.replace("/w_360/h_270/", "/w_360/h_360/");
}

const usedGames = new Set();
const cursors = Object.fromEntries(categories.map(([category]) => [category, 0]));

function takeGame(category) {
  const games = catalog[category];
  while (cursors[category] < games.length) {
    const game = games[cursors[category]++];
    if (!usedGames.has(game.url)) {
      usedGames.add(game.url);
      return game;
    }
  }
  throw new Error(`Not enough unique games in ${category}`);
}

// Cards always point at a game's single canonical URL, which is built from the
// first category listed for it in the metadata.
function primaryCategoryFor(game) {
  const record = metadataByUrl.get(game.url);
  if (!record) throw new Error(`Missing metadata for ${game.url}`);
  return record.categories[0];
}

function gameCard(game) {
  const title = esc(game.title);
  return `        <a class="home-game-card" href="games/${primaryCategoryFor(game)}/${slugFor(game)}/" aria-label="Play ${title}">
          <img src="${esc(squareImage(game.image))}" alt="" width="360" height="360" loading="lazy" decoding="async" />
          <span>${title}</span>
        </a>`;
}

const groupMarkup = groups.map(([heading, offset]) => {
  const orderedCategories = categories
    .slice(offset)
    .concat(categories.slice(0, offset));
  const cards = orderedCategories
    .map(([category]) => gameCard(takeGame(category)))
    .join("\n");
  return `    <section class="home-game-group" aria-labelledby="home-${heading.toLowerCase().replaceAll(" ", "-")}">
      <div class="home-group-header">
        <h2 id="home-${heading.toLowerCase().replaceAll(" ", "-")}">${heading}</h2>
        <a href="games/action/">Explore Games →</a>
      </div>
      <div class="home-game-grid">
${cards}
      </div>
    </section>`;
}).join("\n\n");

const categoryMarkup = categories.map(([category, label]) => `      <a class="home-category-card" href="games/${category}/">
        ${label} <span>${catalog[category].length} games</span>
      </a>`).join("\n");

const content = `  <!-- HOME_GAME_SECTIONS_START -->
  <section class="home-game-discovery" aria-label="Discover more games">
    <div class="home-games-inner">
${groupMarkup}
    </div>
  </section>

  <section class="home-category-overview" aria-labelledby="home-category-heading">
    <div class="home-categories-inner">
      <h2 id="home-category-heading">GAME CATEGORIES</h2>
      <div class="home-category-grid">
${categoryMarkup}
      </div>
    </div>
  </section>
  <!-- HOME_GAME_SECTIONS_END -->`;

let homepage = fs.readFileSync(homepagePath, "utf8");
const pattern = /  <!-- HOME_GAME_SECTIONS_START -->[\s\S]*?  <!-- HOME_GAME_SECTIONS_END -->/;
if (!pattern.test(homepage)) throw new Error("Homepage game-section markers are missing.");
homepage = homepage.replace(pattern, content);
fs.writeFileSync(homepagePath, homepage, "utf8");

console.log(`Added ${usedGames.size} homepage game thumbnails across ${groups.length} sections.`);
