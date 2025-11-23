// api/flight.js

// Vercel's Node runtime (Node 18+) has a global fetch, so we don't need node-fetch.

module.exports = async (req, res) => {
  const { airline, number } = req.query || {};

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
    const flightIata = `${airline}${number}`.toUpperCase().trim(); // e.g. "AA100"
    const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(
      apiKey
    )}&flight_iata=${encodeURIComponent(flightIata)}`;

    const r = await fetch(url);

    const text = await r.text(); // read raw for debugging
    // Try to parse JSON; if it fails, surface the body so we can see what's wrong
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('AviationStack non-JSON response:', text.slice(0, 500));
      return res.status(502).json({
        error: 'Upstream response was not JSON',
        bodySnippet: text.slice(0, 500)
      });
    }

    // AviationStack often returns { success:false, error:{...} } when there is an API problem
    if (data.error || data.success === false) {
      console.error('AviationStack reported error:', data);
      return res.status(502).json({
        error: 'AviationStack API error',
        upstream: data
      });
    }

    // Success path: pass through the data array
    return res.status(200).json(data);
  } catch (err) {
    console.error('Flight API error:', err);
    return res.status(500).json({
      error: 'Flight lookup failed',
      details: err.message || String(err)
    });
  }
};
