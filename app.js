// Third Place — homepage behaviour
(function () {
  document.documentElement.classList.add("js");

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---------- Walking through the doorway (parallax) ----------
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doorway = document.querySelector(".doorway");
  if (doorway && !reduceMotion) {
    var layers = Array.prototype.slice.call(doorway.querySelectorAll(".layer"));
    var pointerX = 0, pointerY = 0, ticking = false;

    function render() {
      ticking = false;
      var rect = doorway.getBoundingClientRect();
      // 0 when the arch is fully in view, rising to 1 as you scroll past it
      var progress = Math.min(Math.max((window.innerHeight * 0.5 - rect.top) / rect.height, 0), 1);
      layers.forEach(function (layer) {
        var depth = parseFloat(layer.getAttribute("data-depth")) || 0;
        var scale = 1 + progress * depth * 0.35;
        var tx = -pointerX * depth * 10;
        var ty = -pointerY * depth * 6 + progress * depth * 30;
        layer.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" + scale.toFixed(4) + ")";
      });
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", function (e) {
        pointerX = e.clientX / window.innerWidth - 0.5;
        pointerY = e.clientY / window.innerHeight - 0.5;
        request();
      });
    }
    render();
  }

  // ---------- Places ----------
  // Only public places whose basic details are widely known.
  // Never add opening hours, fees or phone numbers we haven't checked.
  var PLACES = [
    {
      name: "Bagh-e-Jinnah",
      also: "Lawrence Garden",
      area: "The Mall",
      cost: 0,
      noise: "Quiet",
      solo: true,
      feels: ["read", "breathe", "think", "wander"],
      suits: ["solo", "friend", "group", "family"],
      why: "Old trees, long shaded paths and a lot of green. Easy to lose an afternoon here.",
      wifi: "Don't count on it. Bring your own data.",
      seating: "Benches and wide lawns.",
      entry: "Check timings before you go."
    },
    {
      name: "Jilani Park",
      also: "Race Course Park",
      area: "Jail Road",
      cost: 0,
      noise: "Some chatter",
      solo: true,
      feels: ["breathe", "talk", "wander"],
      suits: ["solo", "friend", "group", "family"],
      why: "Big, open and full of walkers in the evening. Good for a long talk on the move.",
      wifi: "Don't count on it. Bring your own data.",
      seating: "Benches along the walking paths.",
      entry: "Check timings before you go."
    },
    {
      name: "Hazuri Bagh",
      also: "",
      area: "Walled City",
      cost: 0,
      noise: "Some chatter",
      solo: true,
      feels: ["think", "wander"],
      suits: ["solo", "friend", "group", "family"],
      why: "A small garden between the Fort and the Badshahi Mosque. Old Lahore all around you.",
      wifi: "Don't count on it. Bring your own data.",
      seating: "A few benches and the steps of the baradari.",
      entry: "Dress modestly, it sits beside a mosque. Check timings before you go."
    },
    {
      name: "The Canal bank",
      also: "",
      area: "Canal Road",
      cost: 0,
      noise: "Some chatter",
      solo: true,
      feels: ["breathe", "talk", "wander"],
      suits: ["solo", "friend", "group"],
      why: "Water, trees and a long straight path. Somewhere to walk until your head clears.",
      wifi: "Don't count on it. Bring your own data.",
      seating: "Not much. This is a place for walking.",
      entry: "An open path. Mind the traffic when you cross."
    }
  ];

  var FEEL_WORDS = {
    read: "to read",
    breathe: "to breathe",
    talk: "to talk",
    think: "to think",
    wander: "to wander"
  };

  function budgetLabel(cost) {
    if (cost === 0) return "Free";
    if (cost <= 500) return "Up to Rs. 500";
    if (cost <= 1000) return "Rs. 500–1,000";
    return "Rs. 1,000 or more";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var ARCH_SVG = '<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M8 70V34C8 20 20 12 30 4C40 12 52 20 52 34V70" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 70V38C16 29 23 24 30 18C37 24 44 29 44 38V70" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  function card(place, i) {
    var top = el("div", { "class": "card__top" }, [el("span", { "class": "card__area", text: place.area + ", Lahore" })]);
    top.insertAdjacentHTML("beforeend", ARCH_SVG);

    var name = el("h3", { "class": "card__name", text: place.name });
    var also = place.also ? el("p", { "class": "card__why", text: "Also called " + place.also + "." }) : null;
    var why = el("p", { "class": "card__why", text: place.why });

    var tags = el("ul", { "class": "tags", "aria-label": "At a glance" }, [
      el("li", { "class": "tag--budget", text: budgetLabel(place.cost) }),
      el("li", { text: place.noise }),
      el("li", { text: place.solo ? "Good on your own" : "Better with company" })
    ]);

    function row(term, value) {
      return el("div", null, [el("dt", { text: term }), el("dd", { text: value })]);
    }
    var before = el("div", { "class": "before" }, [
      el("h4", { text: "Before you go" }),
      el("dl", null, [row("Wi-Fi", place.wifi), row("Seating", place.seating), row("Entry", place.entry)])
    ]);

    var article = el("article", { "class": "card" }, [
      top,
      el("div", { "class": "card__body" }, [name, also, why, tags, before])
    ]);
    article.style.animationDelay = (i * 0.08) + "s";
    return article;
  }

  // ---------- Intent form ----------
  var form = document.getElementById("intent");
  if (!form) return;
  var go = document.getElementById("intent-go");
  var hint = document.getElementById("intent-hint");
  var results = document.getElementById("results");
  var title = document.getElementById("results-title");
  var cards = document.getElementById("cards");

  function answers() {
    var data = new FormData(form);
    return { feel: data.get("feel"), budget: data.get("budget"), with: data.get("with") };
  }

  form.addEventListener("change", function () {
    var a = answers();
    var left = ["feel", "budget", "with"].filter(function (k) { return !a[k]; }).length;
    go.disabled = left > 0;
    hint.textContent = left === 0
      ? "Lovely. We're ready when you are."
      : left === 3
        ? "Answer all three and we'll suggest a few places."
        : left === 1 ? "One more to go." : "Two more to go.";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var a = answers();
    if (!a.feel || !a.budget || !a.with) return;

    var max = parseInt(a.budget, 10);
    var matches = PLACES.filter(function (p) {
      return p.feels.indexOf(a.feel) !== -1 && p.cost <= max && p.suits.indexOf(a.with) !== -1;
    });

    cards.innerHTML = "";
    results.hidden = false;
    var old = results.querySelector(".empty");
    if (old) old.remove();

    if (matches.length) {
      title.textContent = matches.length === 1
        ? "One place " + FEEL_WORDS[a.feel] + "."
        : matches.length + " places " + FEEL_WORDS[a.feel] + ".";
      matches.forEach(function (p, i) { cards.appendChild(card(p, i)); });
    } else {
      title.textContent = "Nowhere yet, but we're looking.";
      var empty = el("div", { "class": "empty" }, [
        el("p", { text: "We haven't found the right place " + FEEL_WORDS[a.feel] + " with this company yet." }),
        el("p", { text: "Try a different feeling, or come back soon. We add places slowly, once we've checked them." })
      ]);
      results.appendChild(empty);
    }

    title.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
})();
