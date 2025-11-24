// api/tsa.js
// Template for integrating a third-party TSA wait-time provider.
// Fall back to nulls if anything fails so the front-end can still use modeled times.

const TSA_API_URL = process.env.TSA_API_URL;   // e.g. "https://example.com/tsa/waits"
const TSA_API_KEY = process.env.TSA_API_KEY;   // from your provider / RapidAPI

module.exports = async (req, res) => {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: "airport code required, e.g. ?airport=SAN" });
  }

  const code = String(airport).toUpperCase().trim();

  // If you haven't configured a real TSA provider yet, just return nulls.
  if (!TSA_API_URL || !TSA_API_KEY) {
    return res.status(200).json({
      airport: code,
      standardMin: null,
      standardMax: null,
      preMin: null,
      preMax: null
    });
  }

  try {
    // This shape will depend on your provider; adjust query/headers as needed.
    const url = `${TSA_API_URL}?airport=${encodeURIComponent(code)}`;

    const tsaRes = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TSA_API_KEY   // or "X-RapidAPI-Key", etc.
      }
    });

    if (!tsaRes.ok) {
      console.error("TSA API HTTP error:", tsaRes.status, await tsaRes.text());
      return res.status(200).json({
        airport: code,
        standardMin: null,
        standardMax: null,
        preMin: null,
        preMax: null
      });
    }

    const data = await tsaRes.json();

    // Map the provider's response into your normalized shape.
    // Example (you will need to adapt this):
    //   data might look like:
    //   { standard: { min: 10, max: 20 }, pre: { min: 3, max: 7 } }

    const standardMin = data.standard?.min ?? null;
    const standardMax = data.standard?.max ?? null;
    const preMin = data.pre?.min ?? null;
    const preMax = data.pre?.max ?? null;

    return res.status(200).json({
      airport: code,
      standardMin,
      standardMax,
      preMin,
      preMax
    });
  } catch (err) {
    console.error("TSA API lookup failed:", err);
    return res.status(200).json({
      airport: code,
      standardMin: null,
      standardMax: null,
      preMin: null,
      preMax: null
    });
  }
};
