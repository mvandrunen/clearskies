// pages/api/aviationstack-debug.js or app/api/aviationstack-debug/route.js

export default async function handler(req, res) {
  try {
    const { airline = "AA", number = "100" } = req.query;
    const accessKey = process.env.AVSTACK_API_KEY;

    const url =
      `http://api.aviationstack.com/v1/flights` +
      `?access_key=${encodeURIComponent(accessKey)}` +
      `&airline_iata=${encodeURIComponent(airline)}` +
      `&flight_number=${encodeURIComponent(number)}`;

    const resp = await fetch(url);
    const json = await resp.json();

    console.log("🟨 AviationStack raw:", JSON.stringify(json).slice(0, 3000));

    return res.status(resp.status).json(json);
  } catch (err) {
    console.error("❌ aviationstack-debug error:", err);
    return res
      .status(500)
      .json({ error: "aviationstack-debug failure", details: String(err) });
  }
}
