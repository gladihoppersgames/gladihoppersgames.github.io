const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "games", "game-metadata.json"), "utf8")).games;
const catalog = JSON.parse(fs.readFileSync(path.join(root, "games", "wgplayground-catalog.json"), "utf8")).categories;

const categoryNames = {
  action: "Action",
  adventure: "Adventure",
  arcade: "Arcade",
  cars: "Cars",
  sports: "Sports",
  horror: "Horror",
  puzzles: "Puzzles",
  "2players": "2 Player"
};

const profiles = {
  action: {
    focus: "fast reactions, tactical movement, and decisive moment-to-moment choices",
    experience: "active challenges where timing, positioning, and awareness influence every attempt",
    skill: "coordination, reaction speed, and the ability to adapt when the situation changes",
    objective: "Complete each action encounter by avoiding hazards, overcoming opponents, and following the current mission marker or on-screen objective.",
    progression: "Advance through stages, rounds, missions, or upgrades. Watch the interface for health, score, equipment, and any resources that improve your next attempt.",
    winning: "You win by completing the required mission, defeating the final opponent, reaching the target score, or surviving the full challenge."
  },
  adventure: {
    focus: "exploration, discovery, environmental challenges, and steady forward progress",
    experience: "journeys that reward curiosity, observation, and learning how each area works",
    skill: "spatial awareness, planning, and solving problems with the tools available",
    objective: "Explore the environment, follow the current quest, and interact with useful objects or characters to open the route ahead.",
    progression: "New areas, abilities, items, or story objectives become available as earlier tasks are completed. Check the environment carefully when progress appears blocked.",
    winning: "Finish the adventure by reaching the final destination, completing the main quest, escaping the area, or resolving the last objective."
  },
  arcade: {
    focus: "quick rounds, readable goals, score chasing, and replayable skill tests",
    experience: "compact challenges that are simple to begin and become more demanding as the pace rises",
    skill: "timing, pattern recognition, accuracy, and consistent control",
    objective: "Follow the immediate on-screen goal, avoid mistakes, collect useful bonuses, and build the highest score or longest run possible.",
    progression: "Rounds usually become faster or introduce additional hazards. Use each retry to learn patterns, improve timing, and pass your previous result.",
    winning: "Clear every available stage or meet the target score. Endless modes are won by setting a new personal best before the run ends."
  },
  cars: {
    focus: "speed, steering control, racing lines, and confident vehicle handling",
    experience: "driving challenges that balance acceleration with accurate braking and positioning",
    skill: "reaction time, spatial judgment, and planning for corners or traffic",
    objective: "Control the vehicle, remain on the course, and reach each checkpoint or finish line while avoiding collisions and unnecessary time loss.",
    progression: "Complete races, routes, or driving tasks to reach harder events and, when available, unlock stronger vehicles or performance improvements.",
    winning: "Finish first, beat the target time, complete the delivery, or satisfy every driving objective before the timer or attempt limit expires."
  },
  sports: {
    focus: "competition, accurate timing, tactical decisions, and sports-inspired challenges",
    experience: "matches and skill events where practice produces clearer, more consistent results",
    skill: "coordination, anticipation, precision, and making useful decisions under pressure",
    objective: "Use the rules of the selected event to score, defend, and create better opportunities than the opposing player or team.",
    progression: "Move through matches, rounds, tournaments, or increasingly difficult targets. Improve consistency as opponents and score requirements become stronger.",
    winning: "Lead when the match ends, complete the event in the best time, or reach the required score before your opponent."
  },
  horror: {
    focus: "suspenseful exploration, careful observation, survival, and unsettling discoveries",
    experience: "tense situations where limited information makes every route and decision important",
    skill: "awareness, memory, problem-solving, and remaining deliberate under pressure",
    objective: "Explore cautiously, locate clues or essential items, and avoid or overcome threats while searching for the next safe route.",
    progression: "Unlock new areas by solving puzzles, collecting objects, or completing survival tasks. Sound and environmental details may reveal danger or useful information.",
    winning: "Escape the location, survive the final encounter, solve the central mystery, or complete the last objective without being caught."
  },
  puzzles: {
    focus: "logic, pattern recognition, experimentation, and carefully planned solutions",
    experience: "brain challenges that introduce understandable rules and then combine them in more demanding ways",
    skill: "concentration, spatial reasoning, memory, and step-by-step problem-solving",
    objective: "Study the board or problem, identify the governing pattern, and arrange, match, connect, or remove pieces according to the rules.",
    progression: "Each completed puzzle introduces harder layouts, additional elements, or tighter move limits. Use hints sparingly and learn from unsuccessful attempts.",
    winning: "Solve the full board, reach the required total, clear every objective, or complete the puzzle within the available moves or time."
  },
  "2players": {
    focus: "shared competition, cooperation, quick reactions, and adapting to another player",
    experience: "local matches where two people can compete or coordinate from the same device",
    skill: "communication, prediction, coordination, and changing tactics between rounds",
    objective: "Choose the correct controls for each side, then compete for points or work together to complete the shared on-screen objective.",
    progression: "Play successive rounds, change tactics, and learn the opponent’s habits. Cooperative games may unlock later stages only when both players contribute.",
    winning: "Reach the target score, win the required number of rounds, finish ahead of the other player, or complete the cooperative challenge together."
  }
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugFor(game) {
  const parsed = new URL(game.url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[2];
}

function routeFor(game, category) {
  return `/games/${category}/${slugFor(game)}/`;
}

function legacyRouteFor(game) {
  const parsed = new URL(game.url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return `/play/${parts[1]}/${parts[2]}/`;
}

function diskPathFor(game, category) {
  return path.join(root, routeFor(game, category).replace(/^\/|\/$/g, ""), "index.html");
}

function controlsFor(game) {
  const lines = String(game.specs || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => line.toLowerCase() === "controls");
  const raw = index >= 0 ? lines[index + 1] : "";
  const controls = raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : ["Keyboard", "Mouse or touchscreen"];
  return [...new Set(controls)];
}

function aboutFor(game, category) {
  const profile = profiles[category];
  const label = categoryNames[category].toLowerCase();
  return [
    `${game.title} is a free browser-based ${label} game published by ${game.publisher} and presented here through the official WGPlayground player. It is designed for players who enjoy ${profile.focus}. The embedded version starts without a separate installation, allowing you to move from the game page into the main challenge with minimal setup. Its interface, available input methods, and supported devices come from the original release, so control prompts shown inside the player should always be treated as the most current guide.`,
    `Within our ${label} collection, ${game.title} offers ${profile.experience}. A first attempt is useful for learning the layout, understanding feedback, and identifying the actions that move the session forward. Later attempts give you room to improve ${profile.skill}. Use fullscreen mode when the interface feels crowded, keep an eye on score or progress indicators, and allow the game to finish loading before entering commands. Because the title runs through an external HTML5 player, progress-saving behavior can vary by browser and device. Returning players should use the same browser when they want the best chance of retaining locally stored settings or progress.`
  ];
}

function relatedFor(game, category) {
  return catalog[category]
    .filter((candidate) => candidate.url !== game.url)
    .slice(0, 12)
    .map((candidate) => ({
      ...candidate,
      internal: routeFor(candidate, category)
    }));
}

const metadataByUrl = new Map(metadata.map((game) => [game.url, game]));

function headerMarkup() {
  return `<header class="site-header">
    <a href="../../../" class="logo-area" aria-label="Gladihoppers Games home"><img src="../../../favicon.png" alt="Gladihoppers icon" width="44" height="44" /><span class="logo-text">GLADIHOPPERS<span>FREE BROWSER GAMES</span></span></a>
    <div class="header-tools">
      <nav class="main-nav" aria-label="Main navigation"><a href="../../../">Home</a><a href="../../../games/action/">Action</a><a href="../../../games/arcade/">Arcade</a><a href="../../../games/cars/">Cars</a><a href="../../../games/sports/">Sports</a><a href="../../../games/adventure/">Adventure</a><a href="../../../games/horror/">Horror</a><details class="more-menu"><summary>More</summary><div class="more-menu-items"><a href="../../../games/2players/">2 Players</a><a href="../../../games/puzzles/">Puzzles</a></div></details></nav>
      <form class="site-search" role="search" action="../../../" method="get"><label class="search-status" for="site-search-game">Search game categories</label><input id="site-search-game" name="search" type="search" placeholder="Search games..." list="game-categories-game" autocomplete="off" /><datalist id="game-categories-game"><option value="Action"></option><option value="Arcade"></option><option value="Cars"></option><option value="Sports"></option><option value="Adventure"></option><option value="Horror"></option><option value="2 Players"></option><option value="Puzzles"></option></datalist><button type="submit" aria-label="Search">⌕</button></form><p class="search-status" aria-live="polite"></p>
    </div>
  </header>`;
}

function footerMarkup() {
  return `<footer class="site-footer"><div class="footer-logo">⚔ GLADIHOPPERS ⚔</div><nav class="footer-links" aria-label="Footer navigation"><a href="../../../about/">About Us</a><a href="../../../contact/">Contact Us</a><a href="../../../privacy.html">Privacy Policy</a><a href="../../../terms/">Terms of Service</a><a href="../../../cookies/">Cookie Policy</a><a href="../../../DCMA.html">DMCA</a><a href="../../../sitemap.xml">Sitemap</a></nav><p class="footer-copy">&copy; <span class="current-year">2026</span> GladiHoppers Games. All rights reserved.</p></footer>`;
}

let generatedPageCount = 0;
for (const [category, categoryGames] of Object.entries(catalog)) {
for (const catalogGame of categoryGames) {
  const game = metadataByUrl.get(catalogGame.url);
  if (!game) throw new Error(`Missing metadata for ${catalogGame.url}`);
  const categoryName = categoryNames[category];
  const profile = profiles[category];
  const about = aboutFor(game, category);
  const controls = controlsFor(game);
  const related = relatedFor(game, category);
  const canonical = `https://gladihoppersgames.github.io${routeFor(game, category)}`;
  const description = `Play ${game.title} online for free. Learn the controls, objective, progression, and winning conditions, then discover related ${categoryName.toLowerCase()} games.`;
  const relatedMarkup = related.map((item) => {
    const squareImage = item.image.replace("/w_360/h_270/", "/w_360/h_360/");
    return `<a class="related-card" href="../../..${item.internal}"><img src="${esc(squareImage)}" alt="" width="360" height="360" loading="lazy" decoding="async" /><span>${esc(item.title)}</span></a>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(game.title)} – Play Free Online</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" /><meta property="og:title" content="${esc(game.title)} – Play Free Online" /><meta property="og:description" content="${esc(description)}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${esc(game.image)}" />
  <link rel="icon" type="image/png" href="../../../favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Crimson+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../../game-page.css" /><link rel="stylesheet" href="../../../header.css" />
  <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"VideoGame",name:game.title,url:canonical,image:game.image,genre:game.categories.map((item)=>categoryNames[item]),gamePlatform:"Web Browser",playMode:game.categories.includes("2players")?"MultiPlayer":"SinglePlayer",publisher:{"@type":"Organization",name:game.publisher}}).replaceAll("<","\\u003c")}</script>
</head>
<body>
  ${headerMarkup()}
  <main class="game-page">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="../../../">Home</a></li><li><a href="../../../games/${category}/">${categoryName} Games</a></li><li aria-current="page">${esc(game.title)}</li></ol></nav>
    <h1 class="game-title">${esc(game.title)}</h1>
    <section class="player-shell" aria-label="${esc(game.title)} game player">
      <div class="player-frame"><iframe src="${esc(game.embedUrl)}" title="${esc(game.title)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture; gamepad; accelerometer; gyroscope" allowfullscreen scrolling="no"></iframe></div>
      <div class="player-actions"><span class="player-source">Game by ${esc(game.publisher)} · Player supplied by WGPlayground</span><button class="fullscreen-button" type="button" onclick="this.closest('.player-shell').querySelector('iframe').requestFullscreen()">⛶ Fullscreen</button></div>
    </section>
    <section class="game-content-section"><h2>About ${esc(game.title)}</h2><p>${esc(about[0])}</p><p>${esc(about[1])}</p></section>
    <section class="game-content-section"><h2>Controls</h2><ul class="controls-list">${controls.map((control)=>`<li>${esc(control)}</li>`).join("")}</ul><p>Follow any control prompts displayed inside the game, as individual levels or devices may introduce additional actions.</p></section>
    <section class="game-content-section"><h2>How to Play ${esc(game.title)}</h2><ol class="how-list"><li><strong>Learn the inputs</strong>Use the listed controls and watch the opening prompts before beginning your first full attempt.</li><li><strong>Game objective</strong>${esc(profile.objective)}</li><li><strong>Progression</strong>${esc(profile.progression)}</li><li><strong>Winning conditions</strong>${esc(profile.winning)}</li></ol></section>
    <section class="related-section"><h2>Related ${categoryName} Games</h2><div class="related-grid">${relatedMarkup}</div></section>
  </main>
  ${footerMarkup()}
  <script>document.querySelector(".current-year").textContent = new Date().getFullYear();</script><script src="../../../site-search.js"></script>
</body>
</html>`;

  const output = diskPathFor(game, category);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, "utf8");
  generatedPageCount += 1;
}
}

for (const [category, items] of Object.entries(catalog)) {
  const categoryFile = path.join(root, "games", category, "index.html");
  let html = fs.readFileSync(categoryFile, "utf8");
  html = html.replace(/<span class="game-card-publisher">[\s\S]*?<\/span>/g, "");
  let cardIndex = 0;
  html = html.replace(/(<a class="game-card" href=")[^"]+("[^>]*>)/g, (match, prefix, suffix) => {
    const item = items[cardIndex++];
    if (!item) return match;
    return `${prefix}./${slugFor(item)}/${suffix.replace(`aria-label="Play ${esc(item.title)} on WGPlayground"`, `aria-label="Play ${esc(item.title)}"`)}`;
  });
  if (cardIndex !== items.length) throw new Error(`Expected ${items.length} cards in ${categoryFile}, updated ${cardIndex}`);
  fs.writeFileSync(categoryFile, html, "utf8");
}

for (const game of metadata) {
  const destination = routeFor(game, game.categories[0]);
  const legacyPath = path.join(root, legacyRouteFor(game).replace(/^\/|\/$/g, ""), "index.html");
  const redirect = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Game moved</title><meta name="robots" content="noindex, follow" />
<link rel="canonical" href="https://gladihoppersgames.github.io${destination}" />
<meta http-equiv="refresh" content="0; url=../../..${destination}" /></head>
<body><p>This game has moved to <a href="../../..${destination}">${esc(game.title)}</a>.</p></body></html>`;
  fs.writeFileSync(legacyPath, redirect, "utf8");
}

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = sitemap.replace(/\s*<!-- GAME_PAGES_START -->[\s\S]*?<!-- GAME_PAGES_END -->\s*/g, "\n");
const gameUrls = Object.entries(catalog).flatMap(([category, items]) => items.map((game) => `  <url>
    <loc>https://gladihoppersgames.github.io${routeFor(game, category)}</loc>
    <lastmod>2026-07-29</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)).join("\n\n");
sitemap = sitemap.replace("</urlset>", `  <!-- GAME_PAGES_START -->\n${gameUrls}\n  <!-- GAME_PAGES_END -->\n\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap, "utf8");

console.log(`Generated ${generatedPageCount} category game pages, updated ${Object.keys(catalog).length} grids, and preserved ${metadata.length} legacy redirects.`);
