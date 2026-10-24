// ASCII aurora australis, rendered on the GPU (WebGL2).
// The shader computes aurora brightness per character cell, picks a glyph from
// a pre-rendered atlas of the character ramp, and colours it from the palette.
(() => {
  const RAMP = " .,:;-~=+*x#%@";
  const MAX_COLOURS = 8;

  const canvas = document.getElementById("aurora");
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  const cfg = window.NUYINA;

  function parsePalette(csv) {
    const cols = String(csv)
      .split(",")
      .map((s) => s.trim().replace(/^#/, ""))
      .filter((s) => /^[0-9a-f]{6}$/i.test(s))
      .slice(0, MAX_COLOURS)
      .map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
    return cols.length >= 2 ? cols : null;
  }

  const bg = parsePalette(`${cfg.background},${cfg.background}`)[0];
  document.documentElement.style.setProperty("--bg", cfg.background);
  // Light backgrounds flip the palette so the faintest aurora sits closest to
  // the background colour and the strongest parts get the most contrast.
  const light = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] > 0.5;
  document.documentElement.dataset.theme = light ? "light" : "dark";

  if (!gl) {
    canvas.parentElement.classList.add("no-webgl");
    window.Aurora = { setPalette() { return false; }, parsePalette };
    return;
  }

  const VERT = `#version 300 es
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

  const FRAG = `#version 300 es
    precision highp float;
    uniform vec2 uCell;      // cell size in device px
    uniform vec2 uGrid;      // cols, rows
    uniform vec2 uOffset;    // px offset that centres the grid
    uniform float uTime;
    uniform sampler2D uAtlas;
    uniform float uGlyphs;
    uniform vec3 uPal[${MAX_COLOURS}];
    uniform int uPalN;
    uniform vec3 uBg;
    uniform bool uLight;
    out vec4 outColor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }

    vec3 palette(float t) {
      t = clamp(t, 0.0, 1.0) * float(uPalN - 1);
      int i = int(floor(t));
      int j = min(i + 1, uPalN - 1);
      return mix(uPal[i], uPal[j], fract(t));
    }

    // One aurora curtain: a folding, drifting base line with a sharp lower
    // edge, a long upward fade, and shimmering vertical rays.
    float curtain(vec2 p, float t, float seed, float baseY, float amp, float freq) {
      // Domain-warped base line so the ribbon folds back on itself.
      float warp = fbm(vec2(p.x * freq * 0.5 + seed, t * 0.05));
      float x = p.x + 0.35 * (warp - 0.5);
      float wave = fbm(vec2(x * freq + seed, t * 0.07 + seed * 0.3)) - 0.5;
      wave += 0.4 * sin(x * freq * 1.7 + t * 0.21 + seed * 3.0);
      float d = p.y - (baseY + amp * wave);

      // Bright lower edge, long soft fade upward.
      float edge = smoothstep(-0.035, 0.0, d);
      float fade = exp(-max(d, 0.0) * (2.8 + 3.0 * noise(vec2(x * 2.0 + seed, t * 0.08))));
      float body = edge * fade * (1.0 + 0.8 * exp(-max(d, 0.0) * 30.0));

      // Vertical rays that follow the fold and shimmer.
      float rx = x * 22.0 + wave * 10.0 + seed * 10.0;
      float rays = fbm(vec2(rx, p.y * 0.35 - t * 0.3 + seed));
      rays = smoothstep(0.3, 0.8, rays);

      // Brightness surges drifting along the curtain.
      float surge = smoothstep(0.3, 0.75, fbm(vec2(x * 1.6 - t * 0.06 + seed, seed + t * 0.02)));
      return body * mix(0.08, 1.0, rays) * surge;
    }

    void main() {
      vec2 fc = gl_FragCoord.xy - uOffset;
      vec2 cell = floor(fc / uCell);
      if (any(lessThan(cell, vec2(0))) || any(greaterThanEqual(cell, uGrid))) {
        outColor = vec4(uBg, 1.0);
        return;
      }
      vec2 inCell = fract(fc / uCell);
      vec2 p = (cell + 0.5) / uGrid;                      // 0..1, y up
      float aspect = (uGrid.x * uCell.x) / (uGrid.y * uCell.y);
      vec2 q = vec2(p.x * aspect, p.y);
      float t = uTime;

      float a = curtain(q, t,        1.7, 0.16, 0.45, 1.2)
              + curtain(q, t * 1.1,  7.3, 0.32, 0.38, 1.7) * 0.7
              + curtain(q, t * 0.9, 13.1, 0.48, 0.30, 2.3) * 0.45;

      a *= smoothstep(0.0, 0.06, p.y) * (1.0 - 0.7 * smoothstep(0.75, 1.0, p.y));
      a += (hash(cell + floor(t * 8.0)) - 0.5) * 0.06;     // glyph flicker
      a = clamp((a - 0.06) / 0.94, 0.0, 1.0);               // let the sky go dark

      float gi = floor(pow(a, 0.8) * (uGlyphs - 1.0) + 0.5);
      vec2 auv = vec2((gi + inCell.x) / uGlyphs, 1.0 - inCell.y);
      float glyph = texture(uAtlas, auv).a;

      float pt = pow(a, 0.65) + (p.y - 0.35) * 0.12;
      vec3 col = uLight ? palette(1.0 - pt) : palette(pt) * (0.9 + 0.7 * a);
      outColor = vec4(mix(uBg, col, glyph), 1.0);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());

  const u = {};
  for (const name of ["uCell", "uGrid", "uOffset", "uTime", "uAtlas", "uGlyphs", "uPal", "uPalN", "uBg", "uLight"]) {
    u[name] = gl.getUniformLocation(prog, name);
  }
  gl.uniform3fv(u.uBg, bg);
  gl.uniform1i(u.uLight, light);
  gl.uniform1f(u.uGlyphs, RAMP.length);
  gl.uniform1i(u.uAtlas, 0);

  const atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
                        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, k, v);
  }

  const font = { family: "IBM Plex Mono", size: 12 };
  let cellW = 8, cellH = 16;

  // Draw every ramp character once into a strip texture, one cell per glyph.
  async function buildAtlas() {
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(font.size * dpr);
    const css = `${px}px "${font.family}", monospace`;
    try { await document.fonts.load(css, RAMP); } catch {}

    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = css;
    cellW = Math.max(1, Math.round(ctx.measureText("M").width));
    cellH = Math.max(1, Math.round(px * 1.15));
    c.width = cellW * RAMP.length;
    c.height = cellH;
    ctx.font = css;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [...RAMP].forEach((ch, i) => ctx.fillText(ch, cellW * (i + 0.5), cellH / 2));

    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    resize();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    const cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    gl.uniform2f(u.uCell, cellW, cellH);
    gl.uniform2f(u.uGrid, cols, rows);
    gl.uniform2f(u.uOffset, Math.floor((w - cols * cellW) / 2), Math.floor((h - rows * cellH) / 2));
  }

  // Palettes of any length (2–8) are resampled to MAX_COLOURS evenly spaced
  // stops, so switching schemes can crossfade stop by stop.
  function resample(cols) {
    const out = new Float32Array(MAX_COLOURS * 3);
    for (let i = 0; i < MAX_COLOURS; i++) {
      const x = (i / (MAX_COLOURS - 1)) * (cols.length - 1);
      const lo = Math.floor(x), hi = Math.min(lo + 1, cols.length - 1), f = x - lo;
      for (let c = 0; c < 3; c++) out[i * 3 + c] = cols[lo][c] + (cols[hi][c] - cols[lo][c]) * f;
    }
    return out;
  }

  let palCurrent = null, palTarget = null;

  function setPalette(csv, { instant = false } = {}) {
    const cols = parsePalette(csv);
    if (!cols) return false;
    palTarget = resample(cols);
    if (instant || !palCurrent) palCurrent = palTarget.slice();
    gl.uniform3fv(u.uPal, palCurrent);
    return true;
  }

  // Ease the live palette toward the target; returns false once settled.
  function stepPalette(dt) {
    let moving = false;
    const k = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < palCurrent.length; i++) {
      const d = palTarget[i] - palCurrent[i];
      if (Math.abs(d) > 1e-4) { palCurrent[i] += d * k; moving = true; }
      else palCurrent[i] = palTarget[i];
    }
    if (moving) gl.uniform3fv(u.uPal, palCurrent);
  }

  gl.uniform1i(u.uPalN, MAX_COLOURS);

  const params = new URLSearchParams(location.search);
  if (!(params.has("palette") && setPalette(params.get("palette")))) setPalette(cfg.palette);

  // Slow almost to a standstill for visitors who prefer reduced motion.
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);

  let t = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) {
      t += dt * (motion.matches ? 0.05 : 1);
      stepPalette(motion.matches ? 1 : dt);
      gl.uniform1f(u.uTime, t + 40.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }

  window.Aurora = { setPalette, parsePalette };

  buildAtlas().then(() => requestAnimationFrame(frame));
})();
