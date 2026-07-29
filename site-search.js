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

  document.querySelectorAll(".site-search").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input[type='search']");
      const status = form.parentElement.querySelector(".search-status");
      const query = input.value.trim().toLowerCase().replace(/\s+/g, " ");
      const route = categoryRoutes[query];

      if (route) {
        window.location.href = new URL(route, siteRoot).href;
        return;
      }

      if (status) {
        status.textContent = "Choose a category: Action, Arcade, Cars, Sports, Adventure, Horror, 2 Players, or Puzzles.";
      }
      input.setCustomValidity("Enter a category such as Action, Arcade, or Puzzles.");
      input.reportValidity();
    });

    const input = form.querySelector("input[type='search']");
    input.addEventListener("input", () => input.setCustomValidity(""));
  });

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
})();
