/**
 * Swiss Ephemeris compute (portable: Moshier)
 * Returns planets in a shape compatible with your existing Sanctuary UI.
 */
const swe = require("swisseph");

const FLAGS = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED;

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

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function normLon(lon){
  const L = ((lon % 360) + 360) % 360;
  const idx = Math.floor(L / 30);
  return { sign: SIGNS[idx] || "Aries", degree: L - idx * 30 };
}

function toUT(date){
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hourUT: date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600
  };
}

function calcPlanet(jdUT, planet){
  return new Promise((resolve, reject) => {
    swe.calc_ut(jdUT, planet.id, FLAGS, (r) => {
      if (!r || r.error) return reject(new Error((r && r.error) ? r.error : "swe.calc_ut failed"));
      const longitude = Number(r.data && r.data[0]);
      if (!Number.isFinite(longitude)) return reject(new Error("Invalid longitude"));
      const { sign, degree } = normLon(longitude);
      resolve({ name: planet.name, longitude, sign, degree, meaning: "" });
    });
  });
}

function houses(jdUT, lat, lon, hsys){
  return new Promise((resolve, reject) => {
    swe.houses(jdUT, lat, lon, hsys, (r) => {
      if (!r || r.error) return reject(new Error((r && r.error) ? r.error : "swe.houses failed"));
      resolve(r);
    });
  });
}

async function computeChart({ date, lat, lon, place }) {
  const { year, month, day, hourUT } = toUT(date);
  const jdUT = swe.julday(year, month, day, hourUT, swe.GREG_CAL);

  const houseSystem = "P"; // Placidus
  const h = await houses(jdUT, lat, lon, houseSystem);

  const asc = Number(h.ascendant);
  const mc  = Number(h.mc);

  const planets = [];
  for (const p of PLANETS) {
    // sequential to avoid stressing runtime
    // eslint-disable-next-line no-await-in-loop
    planets.push(await calcPlanet(jdUT, p));
  }

  const ascInfo = normLon(asc);
  const mcInfo  = normLon(mc);

  planets.push({ name:"Ascendant", longitude: asc, sign: ascInfo.sign, degree: ascInfo.degree, meaning:"" });
  planets.push({ name:"Midheaven", longitude: mc, sign: mcInfo.sign, degree: mcInfo.degree, meaning:"" });

  return {
    place: place || "",
    lat, lon,
    year, month, day,
    hour: hourUT,
    houseSystem,
    planets,
    houses: { cusps: h.house, ascendant: asc, mc: mc }
  };
}

module.exports = { computeChart };
