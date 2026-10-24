// Colour panel for the ?dev toolbar: paste a CSV scheme to preview it live,
// pick a saved one, then copy the line to paste into config.js.
(() => {
  const cfg = window.NUYINA;
  const params = new URLSearchParams(location.search);
  if (!params.has("dev")) return;

  const bar = document.createElement("div");
  bar.className = "devbar";

  const toggleRow = document.createElement("div");
  toggleRow.className = "devrow toggle-row";
  const toggle = document.createElement("button");
  toggle.className = "toggle";
  toggle.textContent = "hide";
  toggle.onclick = () => {
    toggle.textContent = bar.classList.toggle("collapsed") ? "dev" : "hide";
  };
  toggleRow.append(toggle);

  const row = document.createElement("div");
  row.className = "devrow palette-row";

  const input = document.createElement("input");
  input.type = "text";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Aurora colours as CSV hex");
  input.placeholder = "0d1f22,264027,3c5233,6f732f,b38a58";
  input.value = params.get("palette") || cfg.palette;

  const swatches = document.createElement("div");
  swatches.className = "swatches";

  const copy = document.createElement("button");
  copy.textContent = "copy";
  copy.title = "Copy the palette line for config.js";

  row.append(swatches, input, copy);

  const saved = document.createElement("div");
  saved.className = "devrow saved-row";
  for (const [name, csv] of Object.entries(cfg.palettes || {})) {
    const b = document.createElement("button");
    b.className = "saved";
    b.title = csv;
    b.append(strip(csv), name);
    b.onclick = () => { input.value = csv; apply(); };
    saved.append(b);
  }

  bar.append(saved, row, toggleRow);
  document.body.append(bar);

  function strip(csv) {
    const s = document.createElement("span");
    s.className = "strip";
    for (const c of Aurora.parsePalette(csv) || []) {
      const i = document.createElement("i");
      i.style.background = `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`;
      s.append(i);
    }
    return s;
  }

  function normalise(csv) {
    return csv.split(",").map((s) => s.trim().replace(/^#/, "").toLowerCase()).filter(Boolean).join(",");
  }

  function apply() {
    const csv = normalise(input.value);
    const ok = Aurora.setPalette(csv);
    input.classList.toggle("invalid", !ok);
    if (!ok) return;
    swatches.replaceChildren(strip(csv));
    const url = new URL(location.href);
    url.searchParams.set("palette", csv);
    history.replaceState(null, "", url);
  }

  input.addEventListener("input", apply);

  copy.onclick = async () => {
    const line = `palette: "${normalise(input.value)}",`;
    try {
      await navigator.clipboard.writeText(line);
      copy.textContent = "copied";
    } catch {
      input.select();
      copy.textContent = "select + copy";
    }
    setTimeout(() => { copy.textContent = "copy"; }, 1500);
  };

  apply();
})();
