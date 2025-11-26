// api/flight.js

// ---------- Normalization helpers ----------

function normalizeFromFlightAware(json, airline, number) {
  const f = json.flights && json.flights[0];
  if (!f) return null;

  const dep = f.origin || {};
  const arr = f.destination || {};

  const departure = {
    airport: dep.name || dep.code_iata || dep.code || null,
    iata: dep.code_iata || dep.code || null,
    timezone: dep.timezone || null,
    scheduled: f.scheduled_out || null,
    estimated: f.estimated_out || f.scheduled_out || null,
    actual: f.actual_out || null,
    gate: f.gate_out || null,
    terminal: f.terminal_out || null
  };

  const arrival = {
    airport: arr.name || arr.code_iata || arr.code || null,
    iata: arr.code_iata || arr.code || null,
    timezone: arr.timezone || null,
    scheduled: f.scheduled_in || null,
    estimated: f.estimated_in || f.scheduled_in || null,
    actual: f.actual_in || null,
    gate: f.gate_in || null,
    terminal: f.terminal_in || null
  };

  let flight_status = "scheduled";
  const rawStatus = (f.status || "").toLowerCase();
  if (rawStatus.includes("cancel")) flight_status = "cancelled";
  else if (rawStatus.includes("landed") || rawStatus.includes("arrived")) flight_status = "landed";
  else if (rawStatus.includes("en route") || rawStatus.includes("active")) flight_status = "active";
  else if (rawStatus.includes("delay")) flight_status = "delayed";

  return {
    flight_status,
    departure,
    arrival,
    airline: {
      iata: airline.toUpperCase(),
      name: f.operator || f.airline || airline.toUpperCase()
    },
    flight: {
      number,
      iata: f.ident_iata || `${airline}${number}`
    },
    _source: "flightaware"
  };
}

function normalizeFromAviationStack(json) {
  const f = json.data && json.data[0];
  if (!f) return null;

  const dep = f.departure || {};
  const arr = f.arrival || {};

  const departure = {
    airport: dep.airport || null,
    iata: dep.iata || null,
    timezone: dep.timezone || null,
    scheduled: dep.scheduled || null,
    estimated: dep.estimated || dep.scheduled || null,
    actual: dep.actual || null,
    gate: dep.gate || null,
    terminal: dep.terminal || null
  };

  const arrival = {
    airport: arr.airport || null,
    iata: arr.iata || null,
    timezone: arr.timezone || null,
    scheduled: arr.scheduled || null,
    estimated: arr.estimated || arr.scheduled || null,
    actual: arr.actual || null,
    gate: arr.gate || null,
    terminal: arr.terminal || null
  };

  let flight_status = (f.flight_status || "scheduled").toLowerCase();
  // coerce to your set
  if (!["scheduled", "active", "landed", "cancelled", "delayed"].includes(flight_status)) {
    if (flight_status.includes("cancel")) flight_status = "cancelled";
    else if (flight_status.includes("land")) flight_status = "landed";
    else if (flight_status.includes("active") || flight_status.includes("en-route")) flight_status = "active";
    else if (flight_status.includes("delay")) flight_status = "delayed";
    else flight_status = "scheduled";
  }

  return {
    flight_status,
    departure,
    arrival,
    airline: {
      iata: (f.airline && f.airline.iata) || null,
      name: (f.airline && f.airline.name) || null
    },
    flight: {
      number: f.flight && f.flight.number,
      iata: f.flight && f.flight.iata
    },
    _source: "aviationstack"
  };
}

// ---------- Merge logic ----------

function mergeFlightData(fa, av) {
  if (!fa && !av) return null;
  if (fa && !av) return fa;
  if (!fa && av) return av;

  // Start with FlightAware as primary
  const merged = JSON.parse(JSON.stringify(fa));

  const secondary = av;

  const mergeField = (obj, keyPath) => {
    const [root, field] = keyPath.split(".");
    if (!merged[root]) merged[root] = {};
    if (
      (merged[root][field] == null || merged[root][field] === "") &&
      secondary[root] &&
      secondary[root][field] != null &&
      secondary[root][field] !== ""
    ) {
      merged[root][field] = secondary[root][field];
    }
  };

  // Fill in missing info from AviationStack (names, timezones, gates if FA lacks them)
  [
    "departure.airport",
    "departure.iata",
    "departure.timezone",
    "departure.gate",
    "departure.terminal",
    "arrival.airport",
    "arrival.iata",
    "arrival.timezone",
    "arrival.gate",
    "arrival.terminal"
  ].forEach(mergeField);

  // If FlightAware status is generic but AviationStack says cancelled, respect that.
  const faStatus = fa.flight_status;
  const avStatus = av.flight_status;
  if (
    avStatus === "cancelled" &&
    (faStatus === "scheduled" || faStatus === "delayed")
  ) {
    merged.flight_status = "cancelled";
  }

  // Airline name fallback
  if (!merged.airline.name && secondary.airline && secondary.airline.name) {
    merged.airline.name = secondary.airline.name;
  }

  return merged;
}

// ---------- Provider fetchers ----------

async function fetchFromFlightAware(airline, number) {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) return null;

  const ident = `${airline}${number}`;
  const url = `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(
    ident
  )}?max_pages=1`;

  const resp = await fetch(url, {
    headers: {
      "x-apikey": apiKey,
      Accept: "application/json"
    }
  });

  if (!resp.ok) {
    console.warn("FlightAware upstream", resp.status, await resp.text());
    return null;
  }

  const json = await resp.json();
  return normalizeFromFlightAware(json, airline, number);
}

async function fetchFromAviationStack(airline, number) {
  const key = process.env.AVSTACK_API_KEY;
  if (!key) return null;

  const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(
    key
  )}&airline_iata=${encodeURIComponent(
    airline
  )}&flight_number=${encodeURIComponent(number)}&limit=1`;

  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn("AviationStack upstream", resp.status, await resp.text());
    return null;
  }

  const json = await resp.json();
  return normalizeFromAviationStack(json);
}

// ---------- Main handler ----------

export default async function handler(req, res) {
  const { airline, number } = req.query;

  if (!airline || !number) {
    return res.status(400).json({ error: "Missing airline or number" });
  }

  try {
    const [fa, av] = await Promise.all([
      fetchFromFlightAware(airline, number).catch((e) => {
        console.error("FA error", e);
        return null;
      }),
      fetchFromAviationStack(airline, number).catch((e) => {
        console.error("AS error", e);
        return null;
      })
    ]);

    const merged = mergeFlightData(fa, av);

    if (!merged) {
      return res.status(200).json({ data: [] });
    }

    return res.status(200).json({ data: [merged] });
  } catch (err) {
    console.error("Unified /api/flight error", err);
    return res.status(500).json({ error: "Unexpected server error in /api/flight" });
  }
}

console.log("🔵 FlightAware FULL JSON:", JSON.stringify(json).substr(0, 5000));
console.log("🟡 AviationStack FULL JSON:", JSON.stringify(json).substr(0, 5000));
