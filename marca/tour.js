/* Recorrido a pantalla completa para la web de la marca.
   Uso: Tour.mount(seccion, { escenas: [{ src, f:[ini,fin], z:[ini,fin], cap:{k,t,s}, room }], ... }) */
(function () {
  "use strict";
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const ease = t => t * t * (3 - 2 * t);

  function mount(section, cfg) {
    const S = cfg.escenas;
    const N = S.length;
    const perScene = cfg.vhPorEscena || 90;
    const FADE = 0.35;
    const bg = cfg.fondo || "#0e0d0c";

    section.classList.add("tour");
    section.style.height = (N * perScene + 100) + "vh";
    section.innerHTML =
      '<div class="tour-stage"><canvas></canvas><div class="tour-shade"></div>' +
      '<div class="tour-caps"></div><ul class="tour-rail"></ul>' +
      '<div class="tour-hint">' + (cfg.pista || "Desliza para entrar") + '</div>' +
      '<div class="tour-bar"></div></div>';
    const stage = section.querySelector(".tour-stage");
    const canvas = section.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const capsBox = section.querySelector(".tour-caps");
    const rail = section.querySelector(".tour-rail");
    const hint = section.querySelector(".tour-hint");
    const bar = section.querySelector(".tour-bar");
    if (cfg.extra) stage.insertAdjacentHTML("beforeend", cfg.extra);

    const capEls = [], railEls = [];
    S.forEach((s, i) => {
      if (s.cap) {
        const el = document.createElement("div");
        el.className = "tour-cap" + (i === 0 ? " first" : "");
        el.innerHTML = (s.cap.k ? '<div class="k">' + s.cap.k + "</div>" : "") +
          '<div class="t">' + s.cap.t + "</div>" + (s.cap.s ? '<div class="s">' + s.cap.s + "</div>" : "") +
          (s.cap.html || "");
        capsBox.appendChild(el);
        capEls.push({ i, el });
      }
      if (s.room) {
        const li = document.createElement("li");
        li.innerHTML = "<span>" + s.room + "</span>";
        li.addEventListener("click", () => goTo(i));
        rail.appendChild(li);
        railEls.push({ i, li });
      }
    });

    const len = () => section.offsetHeight - window.innerHeight;
    const top = () => section.getBoundingClientRect().top + window.scrollY;
    const targetP = () => clamp((window.scrollY - top()) / len(), 0, 1) * (N - 1);
    function goTo(i) { window.scrollTo({ top: top() + (i / (N - 1)) * len() + 2, behavior: "smooth" }); }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    window.addEventListener("resize", resize);

    const imgs = [];
    function draw(i, local, alpha, push) {
      const img = imgs[i];
      if (!img || !img.naturalWidth || alpha <= 0) return;
      const s = S[i], cw = canvas.width, ch = canvas.height;
      const z = lerp(s.z[0], s.z[1], local) * (1 + push);
      const sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * z;
      const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -(w - cw) * lerp(s.f[0], s.f[1], local), -(h - ch) / 2, w, h);
    }

    let p = 0, running = false, visible = true;
    function frame() {
      const tp = targetP();
      p += (tp - p) * 0.12;
      if (Math.abs(tp - p) < 0.0005) p = tp;
      ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const i = Math.floor(p), u = p - i;
      const local = k => clamp((p - k + FADE) / (1 + FADE), 0, 1);
      const mix = u > 1 - FADE ? ease((u - (1 - FADE)) / FADE) : 0;
      draw(i, local(i), 1, mix * 0.10);
      if (i + 1 < N && mix > 0) draw(i + 1, local(i + 1), mix, 0);
      ctx.globalAlpha = 1;

      capEls.forEach(c => {
        const d = p - c.i;
        const o = c.i === 0
          ? 1 - clamp(d / 0.45, 0, 1)
          : clamp((d + 0.1) / 0.25, 0, 1) * clamp((0.65 - d) / 0.2, 0, 1);
        c.el.style.opacity = o.toFixed(3);
        c.el.style.visibility = o < 0.01 ? "hidden" : "visible";
        if (c.i !== 0) c.el.style.transform = "translateY(" + ((1 - o) * 14).toFixed(1) + "px)";
      });
      let active = 0;
      railEls.forEach((r, k) => { if (p + 0.5 >= r.i) active = k; });
      railEls.forEach((r, k) => r.li.classList.toggle("on", k === active));
      hint.style.opacity = p < 0.15 ? 1 : 0;
      bar.style.width = (p / (N - 1) * 100).toFixed(2) + "%";
      if (cfg.onProgress) cfg.onProgress(p / (N - 1), window.scrollY > top() + len() + 40);
      if (visible) requestAnimationFrame(frame); else running = false;
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }, { rootMargin: "200px" }).observe(section);
    }

    S.forEach((s, i) => {
      let tries = 0;
      const attempt = () => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { imgs[i] = img; };
        img.onerror = () => { if (++tries < 5) setTimeout(attempt, 500 * tries); };
        img.src = s.src;
      };
      attempt();
    });
    resize();
    start();
    return { goTo };
  }

  window.Tour = { mount };
})();
