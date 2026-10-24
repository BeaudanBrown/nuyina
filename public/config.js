// nuyina site config — edit this file to change colours and events.
window.NUYINA = {
  // Aurora colours as CSV hex, ordered faint -> bright (2 to 8 colours).
  // Try one without editing: add ?palette=0d1f22,264027,... to the URL,
  // or open the site with ?dev to paste schemes in live.
  palette: "0d1f22,264027,3c5233,6f732f,b38a58",

  // Saved schemes, shown as one-click swatches in the ?dev colour panel.
  palettes: {
    "gateway":    "0d1f22,264027,3c5233,6f732f,b38a58",
    "australis":  "0b1d2a,0f4c4a,1f8a6a,5fd39a,d98ac0",
    "deep south": "120f2e,2a2470,5b3aa0,b04f98,f0a8c8"
  },

  // Page background (kept separate from the aurora palette).
  // Light or dark is detected automatically and the text colours follow.
  background: "#ffffff",

  // Events and lineups live in events.txt (plain text, instructions inside).
  eventsFile: "events.txt"
};
