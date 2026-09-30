// The page behaves like a Marka window: ⌘/ (or the View control) switches Live and source,
// clicking a block opens it up, the status bar counts the words, EN / 中文 picks the article.
(function () {
  "use strict";
  var root = document.documentElement;
  var status = document.querySelector(".status");
  var labels = {
    en: { live: "Live", source: "Source", count: function (w, c, m) { return w.toLocaleString("en") + " words · " + c.toLocaleString("en") + " characters · " + m + " min"; } },
    zh: { live: "Live", source: "源码", count: function (w, c, m) { return w.toLocaleString("zh") + " 字 · " + c.toLocaleString("zh") + " 字符 · " + m + " 分钟"; } },
  };

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function article() { return document.querySelector('article[data-lang="' + root.dataset.lang + '"]'); }

  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang === "zh" ? "zh-Hans" : "en";
    var current = article();
    document.title = current.dataset.title;
    document.querySelector('meta[name="description"]').content = current.dataset.description;
    document.querySelectorAll("[data-set-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)); });
    document.querySelectorAll("[data-" + lang + "]").forEach(function (el) { el.firstChild.nodeValue = el.dataset[lang]; });
    document.querySelectorAll("[data-label-" + lang + "]").forEach(function (el) { el.setAttribute("aria-label", el.dataset["label" + (lang === "zh" ? "Zh" : "En")]); });
    count();
    clearStatus();
  }

  function setMode(mode) {
    root.dataset.mode = mode;
    document.querySelectorAll("[data-mode]:not(html)").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode)); });
    if (mode === "source") activate(null);
    count();
  }

  // Words the way the app counts them: every Han character is one, Latin words by spaces.
  function count() {
    if (!status) return;
    var text = "";
    article().querySelectorAll(".block").forEach(function (block) {
      var clone = block.cloneNode(true);
      clone.querySelectorAll(".m, .src").forEach(function (m) { m.remove(); });
      text += clone.textContent + "\n";
    });
    var han = (text.match(/[㐀-鿿]/g) || []).length;
    var latin = (text.replace(/[㐀-鿿]/g, " ").match(/[A-Za-z0-9][\w'’.,-]*/g) || []).length;
    var words = han + latin;
    var characters = text.replace(/\s/g, "").length;
    var minutes = Math.max(1, Math.round(latin / 230 + han / 400));
    var l = labels[root.dataset.lang];
    status.innerHTML = '<span class="mode"></span><span class="count"></span>';
    status.firstChild.textContent = l[root.dataset.mode];
    status.lastChild.textContent = l.count(words, characters, minutes);
  }

  // Live mode: the clicked block shows its Markdown, and the caret moves to its end.
  var caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  var active = null;
  function activate(block) {
    if (active) active.classList.remove("active");
    active = block;
    if (!block) return;
    block.classList.add("active");
    var host = block.matches("ul") ? block.lastElementChild : block.matches(".code, .table, .image, .rule") ? null : block;
    if (host) {
      if (host.matches("blockquote")) host = host.lastElementChild;
      host.appendChild(caret);
    }
  }

  document.addEventListener("click", function (event) {
    if (root.dataset.mode !== "live" || event.target.closest("a, button")) return;
    var block = event.target.closest("main .block");
    if (block === active) return;
    document.querySelectorAll("main .caret").forEach(function (c) { if (c !== caret) c.remove(); });
    activate(block);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setMode(root.dataset.mode === "live" ? "source" : "live");
    } else if (event.key === "Escape") {
      activate(null);
    }
  });

  document.querySelectorAll("[data-set-lang]").forEach(function (button) {
    button.addEventListener("click", function () {
      store("marka.lang", button.dataset.setLang);
      setLang(button.dataset.setLang);
    });
  });
  document.querySelectorAll("button[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
  });

  // Keep the status bar off the editor window while the window is in view.
  function clearStatus() {
    if (!status) return;
    var figure = article().querySelector("figure.window");
    if (!figure) return;
    var f = figure.getBoundingClientRect(), b = status.getBoundingClientRect();
    status.classList.toggle("clear", f.top < b.bottom && f.bottom > b.top && f.left < b.right && f.right > b.left);
  }
  window.addEventListener("scroll", clearStatus, { passive: true });
  window.addEventListener("resize", clearStatus);

  var chrome = document.querySelector(".chrome");
  function onScroll() { chrome.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  setLang(root.dataset.lang || "en");
  setMode(/[?&]mode=source/.test(location.search) ? "source" : "live");
})();
