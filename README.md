# Sanctuary Astro Server (Railway)

Heavy backend for Sanctuary natal chart computation using **Swiss Ephemeris**.

## Endpoints
- `GET /health`
- `POST /astro/compute`

## Request
Either:
```json
{ "dt": "1965-11-07T10:00", "place": "Bucharest, Romania" }
```
or:
```json
{ "dt": "1965-11-07T10:00", "lat": 44.4268, "lon": 26.1025 }
```

## Local run
```bash
npm install
npm start
```

Test:
```bash
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/astro/compute -H "Content-Type: application/json" -d '{"dt":"1965-11-07T10:00","place":"Bucharest, Romania"}'
```

## Geocoding 403
We call Nominatim with a strong `User-Agent`. If blocked, we fall back to Photon.
For production, switch to a provider with an API key.

### Optional env vars
- `GEOCODE_USER_AGENT`
- `GEOCODE_TIMEOUT_MS`
