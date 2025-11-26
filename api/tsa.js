// api/tsa.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { airport } = req.query;
    if (!airport) {
      return res.status(400).json({ error: "Missing airport code" });
    }

    const now = new Date();
    const hour = now.getHours();

    // crude time-of-day heuristic
    let standardMin = 5;
    let standardMax = 15;
    let preMin = 0;
    let preMax = 5;

    if (hour >= 5 && hour < 9) {
      // early AM rush
      standardMin = 20;
      standardMax = 40;
      preMin = 5;
      preMax = 15;
    } else if (hour >= 15 && hour < 20) {
      // afternoon / evening
      standardMin = 15;
      standardMax = 30;
      preMin = 5;
      preMax = 10;
    }

    const payload = {
      airport: airport.toUpperCase(),
      standardMin,
      standardMax,
      preMin,
      preMax,
      source: "modeled", // label so you can show 'modeled TSA wait' if you want
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("[tsa] error", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
