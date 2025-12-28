/**
 * Sanctuary Astro Server (Railway)
 * - POST /astro/compute  (Swiss Ephemeris compute + geocoding)
 * - GET  /health
 *
 * Uses Moshier ephemeris (SEFLG_MOSEPH) so no external ephemeris files are required.
 */
const express = require("express");
const cors = require("cors");

const { geocodePlace } = require("./astro/geocode");
const { computeChart } = require("./astro/compute");

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "sanctuary-astro-server", ts: new Date().toISOString() });
});

app.post("/astro/compute", async (req, res) => {
  try {
    const body = req.body || {};
    const dt = String(body.dt || "").trim();
    const place = String(body.place || "").trim();
    const latRaw = body.lat;
    const lonRaw = body.lon;

    if (!dt) return res.status(400).json({ ok:false, error:"Missing dt. Use ISO like 1965-11-07T10:00" });

    const parsed = new Date(dt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ ok:false, error:"Invalid dt. Use ISO YYYY-MM-DDTHH:mm" });
    }

    let lat = (typeof latRaw === "number") ? latRaw : null;
    let lon = (typeof lonRaw === "number") ? lonRaw : null;
    let resolvedPlace = place || "";

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      if (!place) return res.status(400).json({ ok:false, error:"Missing location. Provide {lat, lon} or a place string." });
      const geo = await geocodePlace(place);
      lat = geo.lat; lon = geo.lon;
      resolvedPlace = geo.displayName || place;
    }

    const chart = await computeChart({ date: parsed, lat, lon, place: resolvedPlace });
    return res.json({ ok: true, ...chart });
  } catch (err) {
    console.error("[/astro/compute] error:", err);
    return res.status(500).json({ ok:false, error: String(err && err.message ? err.message : err) });
  }
});

app.use((req, res) => res.status(404).json({ ok:false, error:"Not found" }));

app.listen(PORT, () => console.log(`✅ sanctuary-astro-server listening on :${PORT}`));
