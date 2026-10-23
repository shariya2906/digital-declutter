const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const emptyStore = () => ({ notes: [], links: [], tasks: [] });
function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { ...emptyStore(), ...parsed };
  } catch (err) {
    console.error("Could not read data store:", err.message);
    return emptyStore();
  }
}
function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = DATA_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(store, null, 2));
  fs.renameSync(temp, DATA_FILE);
}
let store = readStore();

const collections = new Set(["notes", "links", "tasks"]);
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Digital Declutter API" }));
app.get("/api/:collection", (req, res) => {
  if (!collections.has(req.params.collection)) return res.status(404).json({ error: "Unknown collection" });
  res.json(store[req.params.collection]);
});
app.post("/api/:collection", (req, res) => {
  const key = req.params.collection;
  if (!collections.has(key)) return res.status(404).json({ error: "Unknown collection" });
  const item = req.body || {};
  const title = String(item.title || "").trim();
  if (!title) return res.status(400).json({ error: "A title is required." });
  if (key === "links" && !/^https?:\/\//i.test(String(item.url || ""))) {
    return res.status(400).json({ error: "Enter a valid link starting with http:// or https://." });
  }
  const record = {
    id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...item,
    title
  };
  store[key].unshift(record);
  writeStore(store);
  res.status(201).json(record);
});
app.put("/api/:collection/:id", (req, res) => {
  const key = req.params.collection;
  if (!collections.has(key)) return res.status(404).json({ error: "Unknown collection" });
  const index = store[key].findIndex(x => x.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Item not found." });
  const updated = { ...store[key][index], ...(req.body || {}), id: req.params.id, updatedAt: new Date().toISOString() };
  if (key === "links" && updated.url && !/^https?:\/\//i.test(String(updated.url))) {
    return res.status(400).json({ error: "Enter a valid link starting with http:// or https://." });
  }
  store[key][index] = updated;
  writeStore(store);
  res.json(updated);
});
app.delete("/api/:collection/:id", (req, res) => {
  const key = req.params.collection;
  if (!collections.has(key)) return res.status(404).json({ error: "Unknown collection" });
  const before = store[key].length;
  store[key] = store[key].filter(x => x.id !== req.params.id);
  if (store[key].length === before) return res.status(404).json({ error: "Item not found." });
  writeStore(store);
  res.status(204).end();
});
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Digital Declutter running at http://localhost:${PORT}`));
