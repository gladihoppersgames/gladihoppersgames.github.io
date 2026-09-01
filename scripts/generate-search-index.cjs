const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, "games", "game-metadata.json"), "utf8"),
).games;

const categoryNames = {
  action: "Action",
  adventure: "Adventure",
  arcade: "Arcade",
  cars: "Cars",
  sports: "Sports",
  horror: "Horror",
  puzzles: "Puzzles",
  "2players": "2 Player",
};

function slugFor(game) {
  return new URL(game.url).pathname.split("/").filter(Boolean)[2];
}

// One entry per game, pointing at the single canonical URL for that game.
const games = metadata
  .map((game) => {
    const category = game.categories[0];
    return {
      t: game.title,
      u: `games/${category}/${slugFor(game)}/`,
      c: categoryNames[category],
      i: game.image.replace("/w_360/h_270/", "/w_360/h_360/"),
    };
  })
  .sort((a, b) => a.t.localeCompare(b.t));

const output = path.join(root, "games", "search-index.json");
fs.writeFileSync(output, `${JSON.stringify({ games }, null, 0)}\n`, "utf8");

console.log(`Wrote search index with ${games.length} games to games/search-index.json.`);
