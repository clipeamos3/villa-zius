/*!
 * Recorrido — convierte la galería de fotos de una ficha en un recorrido al deslizar.
 * Uso en la web del cliente (una sola línea en la plantilla de fichas):
 *   <script src="recorrido.js" defer></script>
 * Opcionalmente se configura con data-galeria="selector CSS" y data-fotos="selector CSS".
 */
(function () {
  "use strict";
  if (window.__recorrido) { window.__recorrido.toggle(); return; }

  /* Ajustes por web conocida. Para cada cliente nuevo se añade aquí su galería. */
  var SITES = {
    "abahanavillas.com": { gallery: ".jdt-c0105-full-carousel", photos: ".swiper-slide img" },
  };

  var host = location.hostname.replace(/^www\./, "");
  var script = document.currentScript;
  var cfg = SITES[host] || {};
  if (script && script.dataset.galeria) cfg.gallery = script.dataset.galeria;
  if (script && script.dataset.fotos) cfg.photos = script.dataset.fotos;

  /* ---------- buscar la galería y sus fotos ---------- */
  function srcOf(img) {
    var s = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.currentSrc || img.src || "";
    if (!s && img.srcset) s = img.srcset.split(",").pop().trim().split(" ")[0];
    return s;
  }
  function bigger(url) {
    // pedir una versión grande si la web usa un CDN con ancho en la URL
    return url.replace(/width=\d+/, "width=1920").replace(/([?&])w=\d+/, "$1w=1920");
  }
  function keyOf(url) {
    return url.replace(/\/cdn-cgi\/image\/[^/]+/, "").split("?")[0].replace(/-\d+x\d+(?=\.\w+$)/, "");
  }
  function autoGallery() {
    // el contenedor con más fotos grandes de la página
    var best = null, bestN = 0;
    document.querySelectorAll("[class*=gallery],[class*=galeria],[class*=swiper],[class*=slider],[class*=carousel],[class*=fotos],[id*=gallery]").forEach(function (el) {
      var n = el.querySelectorAll("img").length;
      if (n > bestN || (n === bestN && best && best.contains(el))) { best = el; bestN = n; }
    });
    while (best && best.parentElement && best.parentElement.querySelectorAll("img").length === bestN) best = best.parentElement;
    return bestN >= 4 ? best : null;
  }

  var gallery = cfg.gallery ? document.querySelector(cfg.gallery) : autoGallery();
  if (!gallery) { console.warn("[recorrido] no encuentro la galería"); return; }
  var seen = {}, urls = [];
  gallery.querySelectorAll(cfg.photos || "img").forEach(function (img) {
    var s = srcOf(img);
    if (!s || /^data:/.test(s) || /logo|icon|sprite/i.test(s)) return;
    var k = keyOf(s);
    if (seen[k]) return;
    seen[k] = 1;
    urls.push(bigger(s));
  });
  // quitar fotos que no son de la casa (banners, publicidad): nos quedamos con la carpeta más repetida
  function dirOf(u) {
    // carpeta de la foto: todo lo anterior al nombre del archivo
    var parts = keyOf(u).split("/");
    var k = parts.findIndex(function (s, i) { return i > 2 && /\.\w{3,4}$/.test(s); });
    return parts.slice(0, k > 0 ? k : parts.length - 1).join("/");
  }
  var count = {};
  urls.forEach(function (u) { var d = dirOf(u); count[d] = (count[d] || 0) + 1; });
  var mainDir = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; })[0];
  if (count[mainDir] >= 3) urls = urls.filter(function (u) { return dirOf(u) === mainDir; });
  if (urls.length < 3) { console.warn("[recorrido] pocas fotos", urls.length); return; }
  var MAX = 24;
  if (urls.length > MAX) {
    // repartir: quedarnos con fotos de todo el recorrido, no solo las primeras
    var pick = [];
    for (var i = 0; i < MAX; i++) pick.push(urls[Math.round(i * (urls.length - 1) / (MAX - 1))]);
    urls = pick;
  }

  var titleEl = document.querySelector("h1");
  var title = (titleEl && titleEl.textContent.trim()) || document.title.split(/ [-|·] /)[0];
  title = title.replace(/\s+/g, " ").slice(0, 60);

  /* ---------- estilos ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".rc-tour{position:relative;background:#0e0d0c;z-index:1;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}",
    ".rc-stage{position:absolute;top:0;left:0;width:100%;height:100vh;height:100svh;overflow:hidden}",
    ".rc-stage.rc-fixed{position:fixed}",
    ".rc-stage.rc-end{top:auto;bottom:0}",
    ".rc-stage canvas{display:block;width:100%;height:100%}",
    ".rc-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.35) 0,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 50%,rgba(0,0,0,.65) 100%)}",
    ".rc-title{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#f6f1ea;padding:0 24px;pointer-events:none}",
    ".rc-title b{display:block;font:400 clamp(44px,8vw,110px)/1.05 Georgia,'Times New Roman',serif;letter-spacing:.03em;text-shadow:0 2px 30px rgba(0,0,0,.5)}",
    ".rc-hint{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);color:rgba(246,241,234,.8);font-size:11px;letter-spacing:.3em;text-transform:uppercase;text-align:center;transition:opacity .4s;pointer-events:none}",
    ".rc-hint:after{content:'';display:block;width:1px;height:34px;margin:10px auto 0;background:linear-gradient(#d9c7ae,transparent);animation:rc-drip 1.8s ease-in-out infinite;transform-origin:top}",
    "@keyframes rc-drip{0%{transform:scaleY(0)}50%{transform:scaleY(1)}100%{transform:scaleY(1);opacity:0}}",
    ".rc-count{position:absolute;right:24px;bottom:26px;color:#f6f1ea;font:400 13px/1 Georgia,serif;letter-spacing:.12em;pointer-events:none}",
    ".rc-count i{font-style:normal;color:#d9c7ae;font-size:26px}",
    ".rc-bar{position:absolute;left:0;bottom:0;height:3px;background:#d9c7ae;width:0}",
    ".rc-hidden{display:none!important}",
  ].join("");
  document.head.appendChild(css);

  /* ---------- montar el recorrido en lugar de la galería ---------- */
  var N = urls.length, VH = 65, FADE = 0.35;
  var tour = document.createElement("section");
  tour.className = "rc-tour";
  tour.style.height = (N * VH + 100) + "vh";
  tour.innerHTML = '<div class="rc-stage"><canvas></canvas><div class="rc-shade"></div>' +
    '<div class="rc-title"><b></b></div><div class="rc-hint">Desliza para recorrer la casa</div>' +
    '<div class="rc-count"><i>01</i> / ' + String(N).padStart(2, "0") + '</div><div class="rc-bar"></div></div>';
  tour.querySelector(".rc-title b").textContent = title;
  gallery.parentNode.insertBefore(tour, gallery);
  gallery.classList.add("rc-hidden");

  var canvas = tour.querySelector("canvas"), ctx = canvas.getContext("2d");
  var titleBox = tour.querySelector(".rc-title"), hint = tour.querySelector(".rc-hint");
  var countEl = tour.querySelector(".rc-count i"), bar = tour.querySelector(".rc-bar");

  // movimiento de cámara de cada foto: alterna izquierda/derecha y acercar/alejar
  var moves = urls.map(function (_, i) {
    var a = [[.25, .65], [.70, .30], [.40, .60], [.60, .35]][i % 4];
    var z = i % 2 ? [1.10, 1.00] : [1.00, 1.10];
    return { f: a, z: i === 0 ? [1.16, 1.03] : z };
  });

  var imgs = [];
  urls.forEach(function (u, i) {
    var tries = 0;
    (function load() {
      var im = new Image();
      im.decoding = "async";
      im.onload = function () { imgs[i] = im; };
      im.onerror = function () { if (++tries < 4) setTimeout(load, 500 * tries); };
      im.src = u;
    })();
  });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  window.addEventListener("resize", resize);
  resize();

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function clamp(x) { return Math.min(Math.max(x, 0), 1); }
  function len() { return tour.offsetHeight - window.innerHeight; }
  function top() { return tour.getBoundingClientRect().top + window.scrollY; }

  function draw(i, local, alpha, push) {
    var img = imgs[i];
    if (!img || !img.naturalWidth || alpha <= 0) return;
    var m = moves[i], cw = canvas.width, ch = canvas.height;
    var z = lerp(m.z[0], m.z[1], local) * (1 + push);
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * z;
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, -(w - cw) * lerp(m.f[0], m.f[1], local), -(h - ch) / 2, w, h);
  }

  var p = 0, running = true;
  var stage = tour.querySelector(".rc-stage");
  // dejar la pantalla fija mientras se recorre (a mano, porque muchas webs rompen "sticky")
  function pin() {
    var r = tour.getBoundingClientRect(), vh = window.innerHeight;
    var fixed = r.top <= 0 && r.bottom >= vh, end = r.bottom < vh;
    stage.classList.toggle("rc-fixed", fixed);
    stage.classList.toggle("rc-end", end);
    stage.style.left = fixed ? r.left + "px" : "";
    stage.style.width = fixed ? r.width + "px" : "";
  }

  function frame() {
    if (!running) return;
    pin();
    var tp = clamp((window.scrollY - top()) / len()) * (N - 1);
    p += (tp - p) * 0.12;
    if (Math.abs(tp - p) < 0.0005) p = tp;
    var i = Math.floor(p), u = p - i;
    var local = function (k) { return clamp((p - k + FADE) / (1 + FADE)); };
    var mix = u > 1 - FADE ? ease((u - (1 - FADE)) / FADE) : 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0e0d0c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // si la foto aún no ha cargado, mostrar la anterior que sí esté
    var j = i; while (j > 0 && !(imgs[j] && imgs[j].naturalWidth)) j--;
    draw(j, local(i), 1, mix * 0.10);
    if (i + 1 < N && mix > 0) draw(i + 1, local(i + 1), mix, 0);
    ctx.globalAlpha = 1;
    titleBox.style.opacity = (1 - clamp(p / 0.45)).toFixed(3);
    hint.style.opacity = p < 0.15 ? 1 : 0;
    countEl.textContent = String(Math.min(N, Math.round(p) + 1)).padStart(2, "0");
    bar.style.width = (p / (N - 1) * 100).toFixed(2) + "%";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // volver a pulsar el botón de demo alterna entre la galería original y el recorrido
  window.__recorrido = {
    toggle: function () {
      var on = !tour.classList.contains("rc-hidden");
      tour.classList.toggle("rc-hidden", on);
      gallery.classList.toggle("rc-hidden", !on);
      running = !on;
      if (running) { resize(); requestAnimationFrame(frame); }
    },
  };
})();
