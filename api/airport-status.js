// api/airport-status.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { airport } = req.query;
    if (!airport) {
      return res.status(400).json({ error: "Missing airport code" });
    }

    const apiKey = process.env.AVSTACK_API_KEY;
    if (!apiKey) {
      // Fall back to a static mock
      return res.status(200).json(mockStatus(airport));
    }

    // Very lightweight heuristic:
    // - Pull a handful of recent arrivals for this airport
    // - Compute avg delay in minutes
    const url = new URL("http://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", apiKey);
    url.searchParams.set("arr_iata", airport.toUpperCase());
    url.searchParams.set("limit", "25");

    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      console.warn("[airport-status] upstream non-200", upstream.status);
      return res.status(200).json(mockStatus(airport));
    }

    const json = await upstream.json();
    const flights = Array.isArray(json.data) ? json.data : [];

    let totalDelay = 0;
    let count = 0;
    let groundStop = false;
    let groundDelay = false;

    for (const f of flights) {
      const arr = f.arrival || {};
      const sched = arr.scheduled;
      const est = arr.estimated || arr.actual;

      if (sched && est) {
        const dSched = new Date(sched).getTime();
        const dEst = new Date(est).getTime();
        const diffMin = Math.round((dEst - dSched) / 60000);
        if (Number.isFinite(diffMin)) {
          totalDelay += diffMin;
          count++;
        }
      }

      const status = (f.flight_status || "").toLowerCase();
      if (status === "cancelled") groundStop = true;
      if (status === "delayed") groundDelay = true;
    }

    const avgDelayMinutes = count > 0 ? Math.round(totalDelay / count) : 0;

    const result = {
      airport: airport.toUpperCase(),
      avgDelayMinutes,
      groundStop,
      groundDelay,
      source: "aviationstack-derived",
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error("[airport-status] error", err);
    return res.status(200).json(mockStatus(req.query.airport || "UNK"));
  }
}

function mockStatus(airport) {
  // Reasonable default for when upstream fails or key is missing
  return {
    airport: (airport || "UNK").toUpperCase(),
    avgDelayMinutes: 5,
    groundStop: false,
    groundDelay: false,
    source: "mock",
  };
}
