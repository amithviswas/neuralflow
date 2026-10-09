/* NeuralFlow — site behaviour (vanilla JS) */
(function (start) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = function () { return motionQuery.matches; };

  /* ---------- toast ---------- */
  var toastBox = $("#toasts");
  function toast(msg) {
    if (!toastBox) return;
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    toastBox.appendChild(t);
    setTimeout(function () {
      t.classList.add("is-out");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, 2600);
  }

  /* ---------- ripple ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".btn, .copy-btn, .fchip");
    if (!b || reduced()) return;
    var r = b.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = size + "px";
    var x = e.clientX || r.left + r.width / 2;
    var y = e.clientY || r.top + r.height / 2;
    s.style.left = x - r.left - size / 2 + "px";
    s.style.top = y - r.top - size / 2 + "px";
    b.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
  });

  /* ---------- clipboard ---------- */
  function copyText(text, msg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? msg : "Press Ctrl/Cmd + C to copy");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    } else {
      fallback();
    }
  }
  $$(".copy-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var code = b.closest(".code").querySelector("code");
      copyText(code.textContent, "Copied!");
      b.textContent = "Copied";
      setTimeout(function () { b.textContent = "Copy"; }, 1600);
    });
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { copyText(b.getAttribute("data-copy"), b.getAttribute("data-copy-msg") || "Copied!"); });
  });

  /* ---------- scroll reveal ---------- */
  var revealObs = null;
  if ("IntersectionObserver" in window) {
    revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          revealObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  function observeReveals(scope) {
    $$(".reveal:not(.is-in)", scope).forEach(function (el, i) {
      if (!revealObs || reduced()) { el.classList.add("is-in"); return; }
      el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
      revealObs.observe(el);
    });
  }

  /* ---------- counters ---------- */
  var countersDone = false;
  function runCounters() {
    if (countersDone) return;
    countersDone = true;
    $$("[data-count]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (reduced()) { el.textContent = target; return; }
      var start = null, dur = 1600;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
    var sc = $("[data-scramble]");
    if (sc && !reduced()) {
      var word = sc.getAttribute("data-scramble"), chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", n = 0;
      var iv = setInterval(function () {
        n++;
        sc.textContent = word.split("").map(function (c, i) { return i < n / 4 ? c : chars[Math.floor(Math.random() * 26)]; }).join("");
        if (n >= word.length * 4) { clearInterval(iv); sc.textContent = word; }
      }, 55);
    }
  }
  var countersEl = $(".counters");
  if (countersEl) {
    if ("IntersectionObserver" in window) {
      var co = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { runCounters(); co.disconnect(); }
      }, { threshold: 0.4 });
      co.observe(countersEl);
    } else runCounters();
  }

  /* ---------- router ---------- */
  var ROUTES = ["home", "product", "use-cases", "about", "roadmap", "contact"];
  var current = null;
  function routeFromHash() {
    var m = /^#\/([\w-]+)/.exec(location.hash || "");
    return m && ROUTES.indexOf(m[1]) > -1 ? m[1] : null;
  }
  function render() {
    var name = routeFromHash();
    if (!name) {
      if (location.hash !== "#/home") history.replaceState(null, "", "#/home");
      name = "home";
    }
    closeMenu();
    closeModal();
    if (name === current) { window.scrollTo(0, 0); return; }
    $$(".route").forEach(function (sec) {
      var on = sec.getAttribute("data-route") === name;
      sec.hidden = !on;
      sec.classList.remove("is-entering");
      if (on && current !== null && !reduced()) {
        void sec.offsetWidth;
        sec.classList.add("is-entering");
      }
      if (on) {
        document.title = name === "home" ? "NeuralFlow — Orchestrate AI agents" : "NeuralFlow — " + sec.getAttribute("data-title");
      }
    });
    $$("#nav-links [data-link]").forEach(function (a) {
      var on = a.getAttribute("data-link") === name;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var first = current === null;
    current = name;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!first) $("#main").focus({ preventScroll: true });
    observeReveals($('.route[data-route="' + name + '"]'));
    if (name === "product") requestAnimationFrame(moveInk);
  }
  window.addEventListener("hashchange", render);
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute("href") === location.hash) {
      closeMenu();
      window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    }
  });

  var skip = $(".skip");
  if (skip) skip.addEventListener("click", function (e) {
    e.preventDefault();
    $("#main").focus();
  });

  /* ---------- mobile menu ---------- */
  var burger = $("#burger"), links = $("#nav-links"), scrim = $("#scrim");
  function openMenu() {
    links.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    if (!links || !links.classList.contains("is-open")) return;
    links.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    scrim.hidden = true;
    document.body.style.overflow = "";
  }
  burger.addEventListener("click", function () {
    if (links.classList.contains("is-open")) closeMenu(); else openMenu();
  });
  scrim.addEventListener("click", closeMenu);
  links.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) closeMenu(); });

  /* ---------- theme ---------- */
  var themeBtn = $("#theme-btn"), themePop = $("#theme-pop");
  var THEME_COLORS = { aurora: "#0B1020", sunset: "#170A14", mint: "#F6FAF8", neon: "#07070A" };
  function setTheme(name, announce) {
    if (!THEME_COLORS[name]) name = "aurora";
    document.documentElement.setAttribute("data-theme", name);
    $$(".swatch").forEach(function (s) { s.setAttribute("aria-checked", String(s.getAttribute("data-theme-set") === name)); });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[name]);
    try { localStorage.setItem("nf-theme", name); } catch (e) { /* storage unavailable */ }
    if (announce) toast("Theme: " + name.charAt(0).toUpperCase() + name.slice(1));
  }
  function togglePop(open) {
    themePop.hidden = !open;
    themeBtn.setAttribute("aria-expanded", String(open));
    if (open) { var sel = $('.swatch[aria-checked="true"]') || $(".swatch"); sel.focus(); }
  }
  themeBtn.addEventListener("click", function (e) { e.stopPropagation(); togglePop(themePop.hidden); });
  $$(".swatch").forEach(function (s) {
    s.addEventListener("click", function () {
      setTheme(s.getAttribute("data-theme-set"), true);
      togglePop(false);
      themeBtn.focus();
    });
  });
  themePop.addEventListener("keydown", function (e) {
    var items = $$(".swatch"), i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!themePop.hidden && !e.target.closest(".theme")) togglePop(false);
  });
  var saved = "aurora";
  try { saved = localStorage.getItem("nf-theme") || "aurora"; } catch (e) { saved = "aurora"; }
  setTheme(saved, false);

  /* ---------- nav state & back to top ---------- */
  var nav = $("#nav"), toTop = $("#to-top");
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 10);
    toTop.classList.toggle("is-on", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); });

  /* ---------- hero glow ---------- */
  var hero = $("#hero");
  if (hero) hero.addEventListener("pointermove", function (e) {
    if (reduced()) return;
    var r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", e.clientX - r.left + "px");
    hero.style.setProperty("--my", e.clientY - r.top + "px");
  });

  /* ---------- typewriter ---------- */
  var typer = $("#typer");
  if (typer) {
    var words = ["agents", "pipelines", "workflows", "copilots"], wi = 0, ci = words[0].length, deleting = true;
    if (reduced()) {
      setInterval(function () { wi = (wi + 1) % words.length; typer.textContent = words[wi]; }, 2400);
    } else {
      var tick = function () {
        var delay = 90;
        if (deleting) {
          ci--;
          delay = 45;
          if (ci <= 0) { ci = 0; deleting = false; wi = (wi + 1) % words.length; delay = 300; }
        } else {
          ci++;
          if (ci >= words[wi].length) { deleting = true; delay = 1800; }
        }
        typer.textContent = words[wi].slice(0, ci) || "\u200b";
        setTimeout(tick, delay);
      };
      setTimeout(tick, 1800);
    }
  }

  /* ---------- card tilt ---------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  $$(".tilt").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      if (reduced() || !fine.matches) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transition = "transform .12s ease-out, border-color .3s, box-shadow .35s, background .3s";
      card.style.transform = "perspective(900px) translateY(-6px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 8).toFixed(2) + "deg)";
    });
    card.addEventListener("pointerleave", function () {
      card.style.transition = "";
      card.style.transform = "";
    });
  });

  /* ---------- flow builder ---------- */
  var runBtn = $("#run-flow"), resetBtn = $("#reset-flow"), log = $("#console-log");
  var timers = [];
  var STEPS = [
    ["Input", "received request: <b>\"Summarise last week's support tickets\"</b>"],
    ["Planner Agent", "plan → 1) fetch tickets 2) cluster by topic 3) write summary"],
    ["Tool Call", "<b>search_tickets</b>(range=\"7d\") → 128 tickets in 412 ms"],
    ["Output", "summary ready: 5 themes, top issue \"billing emails\""]
  ];
  function line(html, cls) {
    var idle = $(".console__idle", log);
    if (idle) idle.parentNode.removeChild(idle);
    var li = document.createElement("li");
    if (cls) li.className = cls;
    li.innerHTML = html;
    log.appendChild(li);
  }
  function resetFlow(silent) {
    timers.forEach(clearTimeout);
    timers = [];
    $$(".fnode").forEach(function (n) { n.classList.remove("is-active", "is-done"); });
    $$(".fedge").forEach(function (e) { e.classList.remove("is-running", "is-done"); });
    log.innerHTML = '<li class="console__idle">Press “Run flow” to start.</li>';
    runBtn.disabled = false;
    runBtn.textContent = "Run flow";
    if (!silent) toast("Flow reset");
  }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  if (runBtn) {
    runBtn.addEventListener("click", function () {
      resetFlow(true);
      runBtn.disabled = true;
      runBtn.textContent = "Running…";
      var nodes = $$(".fnode"), edges = $$(".fedge"), t = 0, gap = reduced() ? 350 : 1100;
      line("$ neuralflow run demo-flow");
      STEPS.forEach(function (s, i) {
        at(t, function () {
          nodes[i].classList.add("is-active");
          line("[" + s[0] + "] " + s[1]);
        });
        if (i < edges.length) {
          at(t + gap * 0.45, function () {
            nodes[i].classList.remove("is-active");
            nodes[i].classList.add("is-done");
            edges[i].classList.add("is-running");
          });
          at(t + gap * 0.45 + 800 * (reduced() ? 0.1 : 1), function () {
            edges[i].classList.remove("is-running");
            edges[i].classList.add("is-done");
          });
        }
        t += gap + (reduced() ? 0 : 300);
      });
      at(t, function () {
        nodes[nodes.length - 1].classList.remove("is-active");
        nodes[nodes.length - 1].classList.add("is-done");
        line("✓ flow completed in 4 steps", "ok");
        runBtn.disabled = false;
        runBtn.textContent = "Run again";
        toast("Flow completed");
      });
    });
    resetBtn.addEventListener("click", function () { resetFlow(false); });
  }

  /* ---------- tabs ---------- */
  var tabs = $$('[role="tab"]'), ink = $(".tabs__ink");
  function moveInk() {
    var sel = $('[role="tab"][aria-selected="true"]');
    if (!sel || !ink || !sel.offsetWidth) return;
    ink.style.left = sel.offsetLeft + "px";
    ink.style.width = sel.offsetWidth + "px";
  }
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    moveInk();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t, false); });
    t.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") n = tabs[0];
      if (e.key === "End") n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });
  window.addEventListener("resize", moveInk);

  /* ---------- use-case filters ---------- */
  var chips = $$(".fchip"), ucs = $$(".uc"), empty = $("#uc-empty");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.getAttribute("data-filter"), shown = 0;
      chips.forEach(function (x) {
        var on = x === c;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-pressed", String(on));
      });
      ucs.forEach(function (u) {
        var cats = u.getAttribute("data-cat").split(" ");
        var show = f === "all" || cats.indexOf(f) > -1;
        u.classList.toggle("is-hidden", !show);
        u.classList.remove("is-filtering");
        if (show) {
          shown++;
          u.classList.add("is-in");
          if (!reduced()) { void u.offsetWidth; u.classList.add("is-filtering"); }
        }
      });
      empty.hidden = shown > 0;
    });
  });

  /* ---------- modal ---------- */
  var modal = $("#modal"), lastFocus = null;
  function openModal(card) {
    lastFocus = document.activeElement;
    $("#modal-cat").textContent = card.querySelector(".badge").textContent;
    $("#modal-title").textContent = card.querySelector("h3").textContent;
    $("#modal-desc").textContent = card.querySelector("p").textContent;
    var body = $("#modal-body");
    body.innerHTML = "";
    body.appendChild(card.querySelector("template").content.cloneNode(true));
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $(".modal__x", modal).focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  ucs.forEach(function (u) {
    u.querySelector(".uc__open").addEventListener("click", function () { openModal(u); });
  });
  $$("[data-close]", modal).forEach(function (el) { el.addEventListener("click", closeModal); });
  modal.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = $$("button, a[href]", modal);
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- global Esc ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) { closeModal(); return; }
    if (!themePop.hidden) { togglePop(false); themeBtn.focus(); return; }
    if (links.classList.contains("is-open")) { closeMenu(); burger.focus(); }
  });

  /* ---------- FAQ ---------- */
  $$(".faq__q").forEach(function (q) {
    var panel = q.closest(".faq__item").querySelector(".faq__a");
    q.addEventListener("click", function () {
      var open = q.getAttribute("aria-expanded") === "true";
      q.setAttribute("aria-expanded", String(!open));
      if (open) {
        panel.style.height = panel.scrollHeight + "px";
        void panel.offsetHeight;
        panel.style.height = "0px";
      } else {
        panel.style.height = panel.scrollHeight + "px";
        var done = function (ev) {
          if (ev.propertyName !== "height") return;
          if (q.getAttribute("aria-expanded") === "true") panel.style.height = "auto";
          panel.removeEventListener("transitionend", done);
        };
        panel.addEventListener("transitionend", done);
        if (reduced()) panel.style.height = "auto";
      }
    });
  });

  /* ---------- contact form ---------- */
  var form = $("#access-form");
  if (form) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var rules = {
      name: function (v) { return v.trim().length >= 2 ? "" : "Please enter your name."; },
      email: function (v) { return !v.trim() ? "Please enter your email." : emailRe.test(v.trim()) ? "" : "That email doesn't look right."; },
      role: function (v) { return v ? "" : "Please choose a role."; },
      message: function (v) { return v.trim().length >= 10 ? "" : "Tell us a little more (at least 10 characters)."; }
    };
    var check = function (field) {
      var msg = rules[field.name](field.value);
      var wrap = field.closest(".field");
      wrap.classList.toggle("is-bad", !!msg);
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      wrap.querySelector(".field__err").textContent = msg;
      return !msg;
    };
    $$("input, select, textarea", form).forEach(function (f) {
      f.addEventListener("blur", function () { if (f.value) check(f); });
      f.addEventListener("input", function () { if (f.closest(".field").classList.contains("is-bad")) check(f); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = $$("input, select, textarea", form), firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) { firstBad.focus(); toast("Please fix the highlighted fields"); return; }
      var d = {};
      fields.forEach(function (f) { d[f.name] = f.value.trim(); });
      var subject = "NeuralFlow early access — " + d.name;
      var body = "Name: " + d.name + "\nEmail: " + d.email + "\nRole: " + d.role + "\n\nMessage:\n" + d.message;
      var href = "mailto:contact@neuralflow.eu.org?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = href;
      toast("Thanks, " + d.name.split(" ")[0] + "! Your email app is opening.");
      form.reset();
      fields.forEach(function (f) { f.removeAttribute("aria-invalid"); });
    });
  }

  /* ---------- start ---------- */
  render();
  onScroll();
});
