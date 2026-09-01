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

const metadata = JSON.parse(
  fs.readFileSync(path.join(root, "games", "game-metadata.json"), "utf8"),
).games;
const gameCount = metadata.length;

const allGameFiles = categories.flatMap((category) => {
  const categoryDirectory = path.join(root, "games", category);
  return fs.readdirSync(categoryDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(categoryDirectory, entry.name, "index.html"))
    .filter((file) => fs.existsSync(file));
});

// A game is published once. Extra category folders hold noindex canonical stubs.
const stubs = allGameFiles.filter((file) =>
  fs.readFileSync(file, "utf8").includes('http-equiv="refresh"'));
const pages = allGameFiles.filter((file) => !stubs.includes(file));

if (pages.length !== gameCount) {
  failures.push(`Expected ${gameCount} canonical game pages (one per game), found ${pages.length}.`);
}

// URL rules: one game must never be published at two indexable URLs.
const slugOwners = new Map();
for (const file of pages) {
  const slug = path.basename(path.dirname(file));
  const category = path.basename(path.dirname(path.dirname(file)));
  if (slugOwners.has(slug)) {
    failures.push(`Duplicate game URL: ${slug} is published under both ${slugOwners.get(slug)} and ${category}.`);
  }
  slugOwners.set(slug, category);
  if (slug !== slug.toLowerCase()) failures.push(`Game URL is not lowercase: ${category}/${slug}`);
}

for (const file of stubs) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes('name="robots" content="noindex, follow"')) {
    fail(file, "cross-category duplicate is not marked noindex");
  }
  if (!/<link rel="canonical" href="https:\/\/gladihoppersgames\.github\.io\/games\/[a-z0-9]+\/[a-z0-9-]+\/"/.test(html)) {
    fail(file, "cross-category duplicate has no canonical to the published game page");
  }
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
const expectedSitemapUrls = gameCount + 15;
if (sitemapUrls.length !== expectedSitemapUrls) {
  failures.push(`sitemap.xml: expected ${expectedSitemapUrls} URLs, found ${sitemapUrls.length}`);
}
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (new Set(sitemapLocs).size !== sitemapLocs.length) {
  failures.push("sitemap.xml: contains duplicate <loc> entries");
}
for (const loc of sitemapLocs.filter((url) => /\/games\/[a-z0-9]+\/[a-z0-9-]+\//.test(url))) {
  const relative = loc.replace("https://gladihoppersgames.github.io/", "");
  if (!fs.existsSync(path.join(root, relative, "index.html"))) {
    failures.push(`sitemap.xml: ${loc} does not exist on disk`);
  }
  if (stubs.some((file) => file.endsWith(path.join(relative.replaceAll("/", path.sep), "index.html")))) {
    failures.push(`sitemap.xml: ${loc} is a duplicate stub and must not be listed`);
  }
}

// Search bar must be backed by a real, complete game index.
const searchIndexPath = path.join(root, "games", "search-index.json");
if (!fs.existsSync(searchIndexPath)) {
  failures.push("games/search-index.json is missing - the search bar cannot find games.");
} else {
  const searchGames = JSON.parse(fs.readFileSync(searchIndexPath, "utf8")).games || [];
  if (searchGames.length !== gameCount) {
    failures.push(`games/search-index.json: expected ${gameCount} games, found ${searchGames.length}`);
  }
  for (const entry of searchGames) {
    if (!entry.t || !entry.u || !entry.c) {
      failures.push(`games/search-index.json: incomplete entry ${JSON.stringify(entry)}`);
      continue;
    }
    if (!fs.existsSync(path.join(root, entry.u, "index.html"))) {
      failures.push(`games/search-index.json: broken link ${entry.u}`);
    }
  }
  const indexedTitles = new Set(searchGames.map((entry) => entry.t));
  for (const game of metadata) {
    if (!indexedTitles.has(game.title)) {
      failures.push(`games/search-index.json: ${game.title} is not searchable`);
    }
  }
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
  const headingOrder = [...homeSections.matchAll(/<h2 id="home-[a-z-]+">([^<]+)<\/h2>/g)].map((match) => match[1]);
  const expectedOrder = ["Featured Games", "Trending Games", "New Games", "Popular Games"];
  if (headingOrder.slice(0, 4).join("|") !== expectedOrder.join("|")) {
    fail(homepagePath, `homepage group order is ${headingOrder.slice(0, 4).join(", ")} instead of ${expectedOrder.join(", ")}`);
  }
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

// Homepage structure required by the publishing standard.
const introBlock = homepage.match(/<p class="hero-intro">([\s\S]*?)<\/p>/)?.[1];
if (!introBlock) {
  fail(homepagePath, "missing the homepage intro paragraph");
} else if (wordCount(introBlock) < 30) {
  fail(homepagePath, `homepage intro is only ${wordCount(introBlock)} words`);
}
if (!homepage.includes('class="hero-stats"')) {
  fail(homepagePath, "missing the homepage at-a-glance summary line");
}

const aboutBlock = homepage.match(/<h2>ABOUT GLADIHOPPERS GAMES<\/h2>([\s\S]*?)<h3>/);
if (!aboutBlock) {
  fail(homepagePath, "missing the About the Platform section");
} else {
  const aboutWords = wordCount(aboutBlock[1]);
  if (aboutWords < 300) fail(homepagePath, `About the Platform copy is ${aboutWords} words, needs at least 300`);
  const themes = [/no (installation|software to download)/i, /browser/i, /desktop/i, /safe/i, /categor/i, /contact/i];
  for (const theme of themes) {
    if (!theme.test(aboutBlock[1])) fail(homepagePath, `About the Platform copy does not cover ${theme}`);
  }
}
if (!homepage.includes("data-recently-played")) {
  fail(homepagePath, "missing the Recently Played section");
}

// Header and footer rules apply to every page on the site.
function everyHtmlFile(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return everyHtmlFile(target);
    return entry.name.endsWith(".html") ? [target] : [];
  });
}

const footerLinks = ["About Us", "Contact Us", "Privacy Policy", "Terms of Service", "Cookie Policy", "DMCA"];
for (const file of everyHtmlFile(root)) {
  const html = fs.readFileSync(file, "utf8");
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
  if (header) {
    const external = [...header.matchAll(/href="(https?:[^"]+)"/g)].map((match) => match[1]);
    if (external.length) fail(file, `header contains external link(s): ${external.join(", ")}`);
    if (!/<form class="site-search"/.test(header)) fail(file, "header is missing the search bar");
    if (!/<nav class="main-nav"/.test(header)) fail(file, "header is missing category navigation");
  }
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
  if (footer) {
    for (const label of footerLinks) {
      if (!footer.includes(`>${label}<`)) fail(file, `footer is missing the ${label} link`);
    }
  }
}

if (failures.length) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  for (const issue of failures) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validation passed: ${pages.length} canonical game pages, ${stubs.length} noindex duplicate stubs, ` +
      `${categories.length * 24} category cards, ${sitemapUrls.length} sitemap URLs, ` +
      "and all required sections, headers, footers and links are valid.",
  );
}
