/* Adressen für Raumliste, Raumnamen und Chatbot.
   graph.json bleibt beim Chatbot-Team. In data/ liegt nur eine schlanke
   Liste der Startpunkte (ID, Typ, Haus, Etage) und die Raumnamen,
   ohne Koordinaten oder Grundrisse. */
window.CAMPUS_CONFIG = {
  graphUrl: "data/raeume.json",
  synonymUrl: "data/raumnamen.json",
  webhookUrl: "https://twpeah2026.app.n8n.cloud/webhook/campus-navigation"
};
