// api/flight.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { airline, number } = req.query;

    if (!airline || !number) {
      return res.status(400).json({ error: "Missing airline or number" });
    }

    const apiKey = process.env.AVSTACK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing AVSTACK_API_KEY" });
    }

    // AviationStack flights endpoint
    const url = new URL("http://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", apiKey);
    url.searchParams.set("airline_iata", airline.toUpperCase());
    url.searchParams.set("flight_number", String(number).replace(/\D/g, ""));

    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      const text = await upstream.text();
      console.warn("[flight] upstream non-200", upstream.status, text);
      return res
        .status(502)
        .json({ error: "Upstream flight API failed", status: upstream.status });
    }

    const data = await upstream.json();

    // You already expect { data: [...] } in the frontend
    return res.status(200).json(data);
  } catch (err) {
    console.error("[flight] error", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
