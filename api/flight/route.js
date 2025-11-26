export default async function handler(req, res) {
  const { airline = "", number = "" } = req.query;
  const flight = `${airline}${number}`.toUpperCase();

  try {
    const [faaRes, avRes] = await Promise.allSettled([
      fetch(`https://...flightaware endpoint...`),
      fetch(`https://...aviationstack endpoint...`)
    ]);

    const faa = faaRes.value && faaRes.value.ok ? await faaRes.value.json() : null;
    const av = avRes.value && avRes.value.ok ? await avRes.value.json() : null;

    const faaObj = faa?.flights?.[0];
    const avObj = av?.data?.[0];

    if (!faaObj && !avObj) {
      return res.status(404).json({ error: "Flight not found in any source" });
    }

    const data = {
      status: faaObj?.status || avObj?.flight_status || "unknown",
      departureAirport: faaObj?.origin?.code_iata || avObj?.departure?.iata,
      arrivalAirport: faaObj?.destination?.code_iata || avObj?.arrival?.iata,
      depScheduled: faaObj?.scheduled_out || avObj?.departure?.scheduled,
      depEstimated: faaObj?.estimated_out || avObj?.departure?.estimated,
      arrScheduled: faaObj?.scheduled_in || avObj?.arrival?.scheduled,
      arrEstimated: faaObj?.estimated_in || avObj?.arrival?.estimated,
      terminalOrigin: faaObj?.terminal_origin || avObj?.departure?.terminal,
      gateOrigin: faaObj?.gate_origin || avObj?.departure?.gate,
      terminalDest: faaObj?.terminal_destination || avObj?.arrival?.terminal,
      gateDest: faaObj?.gate_destination || avObj?.arrival?.gate,
      progress: faaObj?.route_distance
        ? {
            routeDistance: faaObj.route_distance,
            distancePercent: faaObj.progress_percent ?? null
          }
        : null,
      aircraft: faaObj?.aircraft_type || null,
      source: [
        faaObj ? "flightaware" : null,
        avObj ? "aviationstack" : null
      ].filter(Boolean)
    };

    return res.status(200).json(data);
  } catch (err) {
    console.error("Flight merge failed", err);
    return res.status(500).json({ error: "Flight merge failed" });
  }
}
