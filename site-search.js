(() => {
  const categoryRoutes = {
    action: "games/action/",
    "action games": "games/action/",
    arcade: "games/arcade/",
    "arcade games": "games/arcade/",
    cars: "games/cars/",
    car: "games/cars/",
    "car games": "games/cars/",
    racing: "games/cars/",
    sports: "games/sports/",
    sport: "games/sports/",
    "sports games": "games/sports/",
    adventure: "games/adventure/",
    "adventure games": "games/adventure/",
    horror: "games/horror/",
    scary: "games/horror/",
    "horror games": "games/horror/",
    puzzles: "games/puzzles/",
    puzzle: "games/puzzles/",
    "puzzle games": "games/puzzles/",
    "2 players": "games/2players/",
    "2 player": "games/2players/",
    "2player": "games/2players/",
    "two players": "games/2players/"
  };
  const siteRoot = new URL(".", document.currentScript.src);
  const absolute = (target) => new URL(target, siteRoot).href;

  /* ---------------------------------------------------------------
     Game index: fetched once, on first interaction with a search box.
     --------------------------------------------------------------- */
  let indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(absolute("games/search-index.json"))
        .then((response) => (response.ok ? response.json() : { games: [] }))
        .then((data) => data.games || [])
        .catch(() => []);
    }
    return indexPromise;
  }

  const normalise = (value) =>
    value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

  function matchGames(games, query) {
    const needle = normalise(query);
    if (!needle) return [];
    const terms = needle.split(" ");
    return games
      .map((game) => {
        const haystack = normalise(game.t + " " + game.c);
        if (!terms.every((term) => haystack.includes(term))) return null;
        const title = normalise(game.t);
        let score = 3;
        if (title.startsWith(needle)) score = 0;
        else if (title.includes(needle)) score = 1;
        else if (title.split(" ").some((word) => word.startsWith(terms[0]))) score = 2;
        return { game, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.game.t.length - b.game.t.length)
      .slice(0, 8)
      .map((entry) => entry.game);
  }

  document.querySelectorAll(".site-search").forEach((form) => {
    const input = form.querySelector("input[type='search']");
    if (!input) return;
    const status = form.parentElement.querySelector(".search-status[aria-live]");

    // A custom results panel replaces the native datalist so players can see
    // matching game thumbnails and reach a game page in a single step.
    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "list");

    const panel = document.createElement("div");
    panel.className = "search-results";
    panel.setAttribute("role", "listbox");
    panel.hidden = true;
    form.appendChild(panel);

    let results = [];
    let active = -1;

    function close() {
      panel.hidden = true;
      panel.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
      active = -1;
    }

    function setActive(next) {
      const options = [...panel.querySelectorAll(".search-result")];
      if (!options.length) return;
      active = (next + options.length) % options.length;
      options.forEach((option, position) => {
        option.classList.toggle("is-active", position === active);
        option.setAttribute("aria-selected", position === active ? "true" : "false");
      });
      options[active].scrollIntoView({ block: "nearest" });
    }

    function render(games, query) {
      results = games;
      panel.innerHTML = "";
      if (!query.trim()) {
        close();
        return;
      }

      if (!games.length) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "No games match that search. Try a category such as Action or Puzzles.";
        panel.appendChild(empty);
      } else {
        games.forEach((game) => {
          const link = document.createElement("a");
          link.className = "search-result";
          link.href = absolute(game.u);
          link.setAttribute("role", "option");
          link.setAttribute("aria-selected", "false");

          const thumb = document.createElement("img");
          thumb.src = game.i;
          thumb.alt = "";
          thumb.width = 40;
          thumb.height = 40;
          thumb.loading = "lazy";
          thumb.decoding = "async";

          const title = document.createElement("span");
          title.className = "search-result-title";
          title.textContent = game.t;

          const category = document.createElement("span");
          category.className = "search-result-category";
          category.textContent = game.c;

          link.append(thumb, title, category);
          panel.appendChild(link);
        });
      }
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
      active = -1;
    }

    input.addEventListener("input", () => {
      input.setCustomValidity("");
      const query = input.value;
      if (!query.trim()) {
        close();
        return;
      }
      loadIndex().then((games) => {
        if (input.value !== query) return;
        render(matchGames(games, query), query);
      });
    });

    input.addEventListener("focus", () => {
      loadIndex();
      if (input.value.trim() && results.length) render(results, input.value);
    });

    input.addEventListener("keydown", (event) => {
      if (panel.hidden) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(active - 1);
      } else if (event.key === "Escape") {
        close();
      } else if (event.key === "Enter" && active >= 0) {
        event.preventDefault();
        panel.querySelectorAll(".search-result")[active].click();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const raw = input.value.trim();
      const route = categoryRoutes[raw.toLowerCase().replace(/\s+/g, " ")];

      if (route) {
        window.location.href = absolute(route);
        return;
      }

      loadIndex().then((games) => {
        const matches = matchGames(games, raw);
        if (matches.length) {
          window.location.href = absolute(matches[0].u);
          return;
        }
        if (status) {
          status.textContent =
            "No games found. Try a category such as Action, Arcade, Cars, Sports, Adventure, Horror, 2 Players, or Puzzles.";
        }
        render([], raw);
      });
    });

    document.addEventListener("click", (event) => {
      if (!form.contains(event.target)) close();
    });
  });

  /* ---------------------------------------------------------------
     Navigation state
     --------------------------------------------------------------- */
  const currentPath = window.location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".main-nav a, .more-menu a").forEach((link) => {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/index\.html$/, "");
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".more-menu[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  });

  /* ---------------------------------------------------------------
     Recently played: recorded on game pages, listed on the homepage.
     Stored in this browser only; nothing leaves the device.
     --------------------------------------------------------------- */
  const RECENT_KEY = "gladihoppers:recently-played";
  const RECENT_LIMIT = 8;

  function readRecent() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter((item) => item && item.path && item.title) : [];
    } catch {
      return [];
    }
  }

  if (window.gladiRecentGame) {
    try {
      const entry = window.gladiRecentGame;
      const next = [entry, ...readRecent().filter((item) => item.path !== entry.path)].slice(0, RECENT_LIMIT);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode, blocked storage) - not critical */
    }
  }

  const recentSection = document.querySelector("[data-recently-played]");
  if (recentSection) {
    const grid = recentSection.querySelector(".home-game-grid");
    const recent = readRecent();
    if (grid && recent.length) {
      grid.innerHTML = "";
      recent.forEach((item) => {
        const card = document.createElement("a");
        card.className = "home-game-card";
        card.href = absolute(item.path);
        card.setAttribute("aria-label", "Play " + item.title);

        const thumb = document.createElement("img");
        thumb.src = item.image || "";
        thumb.alt = "";
        thumb.width = 360;
        thumb.height = 360;
        thumb.loading = "lazy";
        thumb.decoding = "async";

        const label = document.createElement("span");
        label.textContent = item.title;

        card.append(thumb, label);
        grid.appendChild(card);
      });
      recentSection.hidden = false;
    }
  }
})();
