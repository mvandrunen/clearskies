// api/airport-status.js
// Uses FAA public JSON feed, then maps into a simple shape for the UI.

const FAA_BASE_URL = "https://services.faa.gov/airport/status";

module.exports = async (req, res) => {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: "airport code required, e.g. ?airport=SAN" });
  }

  const code = String(airport).toUpperCase().trim();

  try {
    const url = `${FAA_BASE_URL}/${encodeURIComponent(code)}?format=application/json`;
    const faaRes = await fetch(url);

    if (!faaRes.ok) {
      console.error("FAA airport status HTTP error:", faaRes.status, await faaRes.text());
      // Return a benign object so the front-end can still render using its model.
      return res.status(200).json({
        airport: code,
        groundDelay: false,
        groundStop: false,
        avgDelayMinutes: null
      });
    }

    const data = await faaRes.json();
    const status = data.status || {};

    // Example FAA field formats:
    //   status.type: "GROUND_DELAY", "GROUND_STOP", "DELAY", null, etc.
    //   status.avgDelay: "27 minutes", "1 hour 15 minutes", null, etc.
    const type = (status.type || "").toUpperCase();

    const groundDelay = type.includes("GROUND_DELAY");
    const groundStop = type.includes("GROUND_STOP");

    let avgDelayMinutes = null;
    if (status.avgDelay) {
      // Extract the first number in minutes from strings like "27 minutes" or "45 min".
      const match = String(status.avgDelay).match(/(\d+)\s*min/i);
      if (match) {
        avgDelayMinutes = parseInt(match[1], 10);
      } else {
        // Fallback: if we see "1 hour 15 minutes" etc, grab the first number and approximate.
        const hoursMatch = String(status.avgDelay).match(/(\d+)\s*hour/i);
        if (hoursMatch) {
          const hours = parseInt(hoursMatch[1], 10);
          avgDelayMinutes = hours * 60;
        }
      }
    }

    return res.status(200).json({
      airport: code,
      groundDelay,
      groundStop,
      avgDelayMinutes
    });
  } catch (err) {
    console.error("FAA airport status lookup failed:", err);
    // Fail soft: send a neutral object so the UI can fallback to modeled behavior.
    return res.status(200).json({
      airport: code,
      groundDelay: false,
      groundStop: false,
      avgDelayMinutes: null
    });
  }
};
