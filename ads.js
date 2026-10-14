// Ad.Plus ad setup, shared by every page that carries ads.
// One GPT instance defines all slots so gpt.js loads once and services are
// enabled once, instead of each Ad.Plus snippet repeating that work.
//
// In-content slots are placeholders in the page markup:
//   <div class="ad-slot" data-ad="banner"></div>     728x90 desktop, 320x100 mobile
//   <div class="ad-slot" data-ad="rectangle"></div>  336x280 wide, 300x250 narrow
//   <div class="ad-slot" data-ad="pregame"></div>    300x250 on the screen before a game starts
//   <div class="ad-slot" data-ad="video"></div>      InPage video (one per page)
(() => {
  // Ads only serve on the approved domain; skip them on local previews.
  if (location.hostname !== "gladihoppersgames.github.io") return;

  const network = "/21849154601,23320499064/";
  const refreshMs = 30000;

  const units = {
    banner: () => (window.innerWidth >= 768
      ? { unit: "Ad.Plus-728x90", size: [728, 90] }
      : { unit: "Ad.Plus-320x100", size: [320, 100] }),
    rectangle: () => (window.innerWidth >= 400
      ? { unit: "Ad.Plus-336x280", size: [336, 280] }
      : { unit: "Ad.Plus-300x250", size: [300, 250] }),
    pregame: () => ({ unit: "Ad.Plus-300x250", size: [300, 250] }),
  };

  const gpt = document.createElement("script");
  gpt.async = true;
  gpt.crossOrigin = "anonymous";
  gpt.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
  document.head.appendChild(gpt);

  window.googletag = window.googletag || { cmd: [] };
  googletag.cmd.push(() => {
    const pubads = googletag.pubads();
    const formats = googletag.enums.OutOfPageFormat;

    // GPT returns null for an out-of-page format the page or device can't
    // show (for example side rails on a narrow screen), so skip those.
    const outOfPage = (unit, format) => {
      const slot = googletag.defineOutOfPageSlot(network + unit, format);
      if (slot) slot.addService(pubads);
      return slot;
    };

    const interstitial = outOfPage("Ad.Plus-Interstitial", formats.INTERSTITIAL);
    const anchor = outOfPage("Ad.Plus-Anchor", formats.BOTTOM_ANCHOR);
    const leftRail = outOfPage("Ad.Plus-Side-Anchor", formats.LEFT_SIDE_RAIL);
    const rightRail = outOfPage("Ad.Plus-Side-Anchor", formats.RIGHT_SIDE_RAIL);

    const counts = {};
    const inPage = [];
    document.querySelectorAll(".ad-slot[data-ad]").forEach((container) => {
      const pick = units[container.dataset.ad];
      if (!pick) return;
      const { unit, size } = pick();
      const key = size.join("x");
      counts[key] = (counts[key] || 0) + 1;
      const id = `${key}-${counts[key]}`;
      const target = document.createElement("div");
      target.id = id;
      container.appendChild(target);
      container.style.minHeight = `${size[1]}px`;
      const slot = googletag.defineSlot(network + unit, size, id);
      if (slot) inPage.push({ slot, id });
    });

    pubads.enableSingleRequest();
    googletag.enableServices();

    [interstitial, anchor, leftRail, rightRail].forEach((slot) => {
      if (slot) googletag.display(slot);
    });
    inPage.forEach(({ id }) => googletag.display(id));

    // Ad.Plus refreshes the anchor and side rails every 30 seconds. Only do
    // it while the tab is visible so hidden tabs don't burn impressions.
    const sticky = [anchor, leftRail, rightRail].filter(Boolean);
    if (sticky.length) {
      setInterval(() => {
        if (document.visibilityState === "visible") pubads.refresh(sticky);
      }, refreshMs);
    }
  });

  // InPage video (outstream). Ad.Plus allows a single video unit per page.
  const video = document.querySelector('.ad-slot[data-ad="video"]');
  if (video) {
    const player = document.createElement("script");
    player.async = true;
    player.src = "https://cdn.ad.plus/player/adplus.js";
    document.head.appendChild(player);
    const anchorPoint = document.createElement("div");
    video.appendChild(anchorPoint);
    (window.playerPro = window.playerPro || []).push({
      id: "z2I717k6zq5b",
      after: anchorPoint,
      appParams: { C_NETWORK_CODE: "23320499064", C_WEBSITE: "gladihoppersgames.github.io" },
    });
  }
})();
