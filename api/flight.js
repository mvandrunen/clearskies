// api/flight.js
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  const { airline, number } = req.query;

  if (!airline || !number) {
    return res
      .status(400)
      .json({ error: 'airline and number are required, e.g. ?airline=AA&number=100' });
  }

  const apiKey = process.env.AVIATIONSTACK_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AVIATIONSTACK_KEY not set on server' });
  }

  try {
    const flightIata = `${airline}${number}`; // e.g. "AA100"
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(
      flightIata
    )}`;

    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`AviationStack HTTP ${r.status}`);
    }

    const data = await r.json();
    // data should have a `data` array; we just pass it through
    return res.status(200).json(data);
  } catch (err) {
    console.error('Flight API error:', err);
    return res.status(500).json({ error: 'Flight lookup failed' });
  }
};
