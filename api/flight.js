// /api/flight.js (or pages/api/flight.js if you’re on Next.js)

export default async function handler(req, res) {
  const { airline, number } = req.query || {};

  if (!airline || !number) {
    return res.status(400).json({ error: "Missing airline or number" });
  }

  try {
    // --- 1. Call AviationStack ---
    const avKey = process.env.AVSTACK_API_KEY;
    if (!avKey) {
      throw new Error("Missing AVSTACK_API_KEY env var");
    }

    const avUrl = new URL("http://api.aviationstack.com/v1/flights");
    avUrl.searchParams.set("access_key", avKey);
    avUrl.searchParams.set("airline_iata", airline);
    avUrl.searchParams.set("flight_number", number);

    const avRes = await fetch(avUrl.toString());
    if (!avRes.ok) {
      throw new Error(`AviationStack HTTP ${avRes.status}`);
    }
    const avJson = await avRes.json();
    const av = avJson?.data?.[0];

    // --- 2. Call FlightAware (Firehose / AeroAPI or whatever you wired) ---
    // Adjust URL & auth header to your actual FlightAware endpoint:
    const faKey = process.env.FLIGHTAWARE_API_KEY;
    if (!faKey) {
      throw new Error("Missing FLIGHTAWARE_API_KEY env var");
    }

    const faUrl = new URL("https://aeroapi.flightaware.com/aeroapi/flights");
    faUrl.searchParams.set("ident", `${airline}${number}`);

    const faRes = await fetch(faUrl.toString(), {
      headers: { "x-apikey": faKey },
    });

    // FlightAware may not always have data – so treat non-200 as soft failure
    let fa = null;
    if (faRes.ok) {
      const faJson = await faRes.json();
      fa = faJson?.flights?.[0] || null;
    }

    // --- 3. Normalize values (AviationStack as base, FlightAware to refine) ---

    // Status
    const status =
      (fa?.status || av?.flight_status || "scheduled").toLowerCase();

    // Times
    const depScheduled =
      fa?.scheduled_out || av?.departure?.scheduled || null;
    const depEstimated =
      fa?.estimated_out || av?.departure?.estimated || depScheduled;
    const arrScheduled =
      fa?.scheduled_in || av?.arrival?.scheduled || null;
    const arrEstimated =
      fa?.estimated_in || av?.arrival?.estimated || arrScheduled;

    // Airports + timezones
    const departureAirport =
      fa?.origin?.code_iata ||
      av?.departure?.iata ||
      av?.departure?.airport ||
      null;
    const arrivalAirport =
      fa?.destination?.code_iata ||
      av?.arrival?.iata ||
      av?.arrival?.airport ||
      null;

    const departureTz =
      av?.departure?.timezone || fa?.origin?.timezone || null;
    const arrivalTz =
      av?.arrival?.timezone || fa?.destination?.timezone || null;

    // Gate / terminal info (FlightAware usually strongest here)
    const terminalOrigin =
      fa?.terminal_origin || av?.departure?.terminal || null;
    const gateOrigin =
      fa?.gate_origin || av?.departure?.gate || null;
    const terminalDest =
      fa?.terminal_destination || av?.arrival?.terminal || null;
    const gateDest =
      fa?.gate_destination || av?.arrival?.gate || null;

    // --- 4. Respond with unified, frontend-friendly JSON ---
    return res.status(200).json({
      status,
      depScheduled,
      depEstimated,
      arrScheduled,
      arrEstimated,
      departureAirport,
      arrivalAirport,
      departureTz,
      arrivalTz,
      terminalOrigin,
      gateOrigin,
      terminalDest,
      gateDest,
      source: {
        aviationstack: Boolean(av),
        flightaware: Boolean(fa),
      },
    });
  } catch (err) {
    console.error("Error in /api/flight:", err);
    return res.status(500).json({
      error: "Unexpected server error in /api/flight",
      details: err.message,
    });
  }
}
