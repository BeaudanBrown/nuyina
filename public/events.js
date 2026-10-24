// Loads events from the plain-text events file (see events.txt for the format)
// and renders them. Sharing name="events" on every <details> makes them an
// exclusive accordion: opening one closes the others.
(() => {
  const cfg = window.NUYINA;
  const root = document.getElementById("events");

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Blocks separated by blank lines: name, date, then artists and "tickets:".
  function parse(text) {
    const events = [];
    const blocks = text
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        if (lines.length) console.warn("events: skipped event with no date:", lines[0]);
        continue;
      }
      const [name, date, ...rest] = lines;
      const ev = { name, date, lineup: [], tickets: null, when: parseDate(date) };
      if (!ev.when) console.warn(`events: "${date}" isn't DD.MM.YYYY (in "${name}")`);
      for (let i = 0; i < rest.length; i++) {
        const m = rest[i].match(/^tickets?\s*:\s*(.*)$/i);
        if (!m) ev.lineup.push(rest[i]);
        else ev.tickets = m[1] || rest[++i] || null;   // link may be on the next line
      }
      events.push(ev);
    }
    return events;
  }

  function parseDate(s) {
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    return m ? new Date(+m[3], m[2] - 1, +m[1]) : null;
  }

  function render(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upcoming soonest first, then past events newest first.
    const isPast = (ev) => ev.when && ev.when < today;
    const upcoming = events.filter((ev) => !isPast(ev))
      .sort((a, b) => (a.when ?? Infinity) - (b.when ?? Infinity));
    const past = events.filter(isPast).sort((a, b) => b.when - a.when);

    if (!upcoming.length) root.append(el("p", "events-empty", "more soon"));

    for (const ev of [...upcoming, ...past]) {
      const done = isPast(ev);
      const details = el("details", done ? "event past" : "event");
      details.name = "events";

      const summary = el("summary");
      summary.append(el("span", "name", ev.name), el("time", "date", ev.date));

      const body = el("div", "body");
      const lineup = el("ul", "lineup");
      if (!ev.lineup.length) lineup.append(el("li", null, "lineup tba"));
      for (const act of ev.lineup) lineup.append(el("li", null, act));
      body.append(lineup);

      // A link gets a button; anything else (e.g. TBC) shows as plain text.
      // Past events keep their date and lineup but drop the tickets line.
      if (!done && ev.tickets && !/^https?:\/\//i.test(ev.tickets)) {
        body.append(el("span", "tickets-note", `tickets ${ev.tickets.toLowerCase()}`));
      } else if (!done && ev.tickets) {
        const a = el("a", "tickets", "tickets");
        a.href = ev.tickets;
        a.target = "_blank";
        a.rel = "noopener";
        body.append(a);
      }

      details.append(summary, body);
      root.append(details);
    }
  }

  fetch(cfg.eventsFile, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.text();
    })
    .then((text) => render(parse(text)))
    .catch((err) => console.error(`events: couldn't load ${cfg.eventsFile}:`, err));
})();
