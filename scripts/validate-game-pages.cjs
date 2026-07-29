const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];
const categories = [
  "action",
  "adventure",
  "arcade",
  "cars",
  "sports",
  "horror",
  "puzzles",
  "2players",
];

function fail(file, message) {
  failures.push(`${path.relative(root, file)}: ${message}`);
}

function allFiles(directory, name) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return allFiles(target, name);
    return entry.name === name ? [target] : [];
  });
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value) {
  return stripHtml(value).split(/\s+/).filter(Boolean).length;
}

function resolveInternalLink(sourceFile, href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean || clean.startsWith("http") || clean.startsWith("mailto:")) return null;
  const candidate = path.resolve(path.dirname(sourceFile), clean);
  return clean.endsWith("/") ? path.join(candidate, "index.html") : candidate;
}

const pages = categories.flatMap((category) => {
  const categoryDirectory = path.join(root, "games", category);
  return fs.readdirSync(categoryDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(categoryDirectory, entry.name, "index.html"))
    .filter((file) => fs.existsSync(file));
});
if (pages.length !== 192) {
  failures.push(`Expected 192 category game pages, found ${pages.length}.`);
}

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) fail(file, `expected one H1, found ${h1s.length}`);

  const iframe = html.match(/<iframe[^>]+src="([^"]+)"/);
  if (!iframe?.[1]) fail(file, "missing iframe source");

  const required = [
    '<nav class="breadcrumb"',
    '<section class="player-shell"',
    "<h2>About ",
    "<h2>Controls</h2>",
    "<h2>How to Play ",
    '<section class="related-section">',
    '<footer class="site-footer">',
  ];
  let previous = -1;
  for (const marker of required) {
    const position = html.indexOf(marker);
    if (position === -1) fail(file, `missing ${marker}`);
    if (position !== -1 && position < previous) fail(file, `section is out of order: ${marker}`);
    previous = Math.max(previous, position);
  }

  const about = html.match(/<h2>About [^<]+<\/h2>([\s\S]*?)<\/section>/);
  if (!about) {
    fail(file, "missing About copy");
  } else {
    const count = wordCount(about[1]);
    if (count < 150 || count > 250) fail(file, `About copy is ${count} words`);
  }

  const controls = html.match(/<h2>Controls<\/h2><ul class="controls-list">([\s\S]*?)<\/ul>/);
  if (!controls || !controls[1].includes("<li>")) fail(file, "missing control items");

  const howItems = html.match(/<ol class="how-list">([\s\S]*?)<\/ol>/)?.[1].match(/<li>/g) || [];
  if (howItems.length !== 4) fail(file, `expected four How to Play items, found ${howItems.length}`);

  const related = html.match(/<div class="related-grid">([\s\S]*?)<\/div>/);
  const relatedCards = related?.[1].match(/class="related-card"/g) || [];
  if (relatedCards.length !== 12) {
    fail(file, `expected 12 related games, found ${relatedCards.length}`);
  }
  const nonSquareRelatedImages = related?.[1].match(/<img[^>]+width="360" height="(?!360")[^"]+"/g) || [];
  if (nonSquareRelatedImages.length) {
    fail(file, `found ${nonSquareRelatedImages.length} non-square related image dimensions`);
  }
  if (related?.[1].includes("/w_360/h_270/")) {
    fail(file, "related image source still requests a 4:3 thumbnail");
  }

  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const target = resolveInternalLink(file, href[1]);
    if (target && !fs.existsSync(target)) fail(file, `broken internal link ${href[1]}`);
  }

  for (const json of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json[1]);
    } catch {
      fail(file, "invalid JSON-LD");
    }
  }
}

for (const category of categories) {
  const file = path.join(root, "games", category, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const cards = html.match(/class="game-card"/g) || [];
  if (cards.length !== 24) fail(file, `expected 24 game cards, found ${cards.length}`);
  const publishers = html.match(/class="game-card-publisher"/g) || [];
  if (publishers.length) fail(file, `found ${publishers.length} publisher labels`);
  const externalCards = [...html.matchAll(/<a class="game-card" href="([^"]+)"/g)]
    .filter((match) => /^https?:/.test(match[1]));
  if (externalCards.length) fail(file, `${externalCards.length} cards still use external links`);
  for (const href of html.matchAll(/<a class="game-card" href="([^"]+)"/g)) {
    const target = resolveInternalLink(file, href[1]);
    if (!target || !fs.existsSync(target)) fail(file, `broken game card link ${href[1]}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = sitemap.match(/<url>/g) || [];
if (sitemapUrls.length !== 207) {
  failures.push(`sitemap.xml: expected 207 URLs, found ${sitemapUrls.length}`);
}

const legacyPages = allFiles(path.join(root, "play"), "index.html");
if (legacyPages.length !== 162) {
  failures.push(`Expected 162 legacy redirects, found ${legacyPages.length}.`);
}
for (const file of legacyPages) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes('http-equiv="refresh"') || !html.includes('name="robots" content="noindex, follow"')) {
    fail(file, "legacy page is not a noindex redirect");
  }
}

const css = fs.readFileSync(path.join(root, "game-page.css"), "utf8");
const cssBalance = [...css].reduce((balance, character) => {
  if (character === "{") return balance + 1;
  if (character === "}") return balance - 1;
  return balance;
}, 0);
if (cssBalance !== 0) failures.push(`game-page.css: unbalanced braces (${cssBalance})`);

const homepagePath = path.join(root, "index.html");
const homepage = fs.readFileSync(homepagePath, "utf8");
const homeSections = homepage.match(/<!-- HOME_GAME_SECTIONS_START -->([\s\S]*?)<!-- HOME_GAME_SECTIONS_END -->/)?.[1];
if (!homeSections) {
  fail(homepagePath, "missing homepage game sections");
} else {
  const homeCards = [...homeSections.matchAll(/<a class="home-game-card" href="([^"]+)"/g)];
  if (homeCards.length !== 32 || homeCards.length > 60) {
    fail(homepagePath, `expected 32 homepage thumbnails within the 60-card limit, found ${homeCards.length}`);
  }
  if (new Set(homeCards.map((match) => match[1])).size !== homeCards.length) {
    fail(homepagePath, "homepage contains duplicate game links");
  }
  const groups = [...homeSections.matchAll(/<section class="home-game-group"[\s\S]*?<\/section>/g)];
  if (groups.length !== 4) fail(homepagePath, `expected four homepage game groups, found ${groups.length}`);
  for (const group of groups) {
    const cards = group[0].match(/class="home-game-card"/g) || [];
    if (cards.length !== 8) fail(homepagePath, `homepage group contains ${cards.length} cards instead of eight`);
  }
  const categoryCards = homeSections.match(/class="home-category-card"/g) || [];
  if (categoryCards.length !== 8) fail(homepagePath, `expected eight category overview cards, found ${categoryCards.length}`);
  if (homeSections.includes("/w_360/h_270/") || /width="360" height="(?!360")/.test(homeSections)) {
    fail(homepagePath, "homepage contains a non-square game thumbnail");
  }
  for (const card of homeCards) {
    const target = resolveInternalLink(homepagePath, card[1]);
    if (!target || !fs.existsSync(target)) fail(homepagePath, `broken homepage game link ${card[1]}`);
  }
}

if (failures.length) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  for (const issue of failures) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validation passed: ${pages.length} game pages, ${categories.length * 24} category cards, ` +
      `${sitemapUrls.length} sitemap URLs, and all required sections and links are valid.`,
  );
}
