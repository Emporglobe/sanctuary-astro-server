/**
 * Swiss Ephemeris compute (portable, robust across bindings)
 */
const swe = require("swisseph");

const FLAGS = (swe.SEFLG_MOSEPH || 0) | (swe.SEFLG_SPEED || 0);

const PLANETS = [
  { name: "Sun", id: swe.SE_SUN },
  { name: "Moon", id: swe.SE_MOON },
  { name: "Mercury", id: swe.SE_MERCURY },
  { name: "Venus", id: swe.SE_VENUS },
  { name: "Mars", id: swe.SE_MARS },
  { name: "Jupiter", id: swe.SE_JUPITER },
  { name: "Saturn", id: swe.SE_SATURN },
  { name: "Uranus", id: swe.SE_URANUS },
  { name: "Neptune", id: swe.SE_NEPTUNE },
  { name: "Pluto", id: swe.SE_PLUTO },
  { name: "True Node", id: swe.SE_TRUE_NODE }
];

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];

function lonToSign(lon) {
  const L = ((lon % 360) + 360) % 360;
  const idx = Math.floor(L / 30);
  return { sign: SIGNS[idx], degree: L - idx * 30 };
}

function toUT(date) {
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
    h: date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600
  };
}

function getJulianDay(y, m, d, h) {
  const fn =
    swe.julday_ut ||
    swe.swe_julday_ut ||
    swe.julday ||
    swe.swe_julday;

  if (typeof fn !== "function") {
    throw new Error("Swiss Ephemeris: no julday function available");
  }

  try {
    return fn(y, m, d, h, swe.GREG_CAL || 1);
  } catch {
    return fn(y, m, d, h);
  }
}

function extractLongitude(result) {
  if (!result) return NaN;

  // Variant A: result.data[0]
  if (Array.isArray(result.data) && Number.isFinite(result.data[0])) {
    return result.data[0];
  }

  // Variant B: result.longitude
  if (Number.isFinite(result.longitude)) {
    return result.longitude;
  }

  return NaN;
}

function calcPlanet(jd, planet) {
  return new Promise((resolve, reject) => {
    const fn = swe.calc_ut || swe.swe_calc_ut;
    if (typeof fn !== "function") {
      return reject(new Error("Swiss Ephemeris: no calc_ut function"));
    }

    fn(jd, planet.id, FLAGS, (r) => {
      if (!r || r.error) {
        return reject(new Error(r?.error || "calc_ut failed"));
      }

      const lon = extractLongitude(r);
      if (!Number.isFinite(lon)) {
        return reject(new Error("Invalid longitude"));
      }

      const { sign, degree } = lonToSign(lon);
      resolve({ name: planet.name, longitude: lon, sign, degree, meaning: "" });
    });
  });
}

function calcHouses(jd, lat, lon) {
  return new Promise((resolve, reject) => {
    const fn = swe.houses || swe.swe_houses;
    if (typeof fn !== "function") {
      return reject(new Error("Swiss Ephemeris: no houses function"));
    }

    fn(jd, lat, lon, "P", (r) => {
      if (!r || r.error) {
        return reject(new Error(r?.error || "houses failed"));
      }
      resolve(r);
    });
  });
}

async function computeChart({ date, lat, lon, place }) {
  const { y, m, d, h } = toUT(date);
  const jd = getJulianDay(y, m, d, h);

  const houses = await calcHouses(jd, lat, lon);
  const asc = Number(houses.ascendant);
  const mc  = Number(houses.mc);

  const planets = [];
  for (const p of PLANETS) {
    planets.push(await calcPlanet(jd, p));
  }

  const ascInfo = lonToSign(asc);
  const mcInfo  = lonToSign(mc);

  planets.push({ name:"Ascendant", longitude: asc, sign: ascInfo.sign, degree: ascInfo.degree, meaning:"" });
  planets.push({ name:"Midheaven", longitude: mc, sign: mcInfo.sign, degree: mcInfo.degree, meaning:"" });

  return {
    place,
    lat, lon,
    planets,
    houses: {
      cusps: houses.house,
      ascendant: asc,
      mc
    }
  };
}

module.exports = { computeChart };
