// pages/api/flightaware-debug.js or app/api/flightaware-debug/route.js

export default async function handler(req, res) {
  try {
    const { airline = "AA", number = "100" } = req.query;
    const ident = `${airline}${number}`; // adjust to your scheme

    const resp = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/flights/${ident}`,
      {
        headers: {
          "x-apikey": process.env.FLIGHTAWARE_API_KEY,
        },
      }
    );

    const json = await resp.json();
    console.log("🟦 FlightAware raw:", JSON.stringify(json).slice(0, 3000));

    return res.status(resp.status).json(json);
  } catch (err) {
    console.error("❌ flightaware-debug error:", err);
    return res
      .status(500)
      .json({ error: "flightaware-debug failure", details: String(err) });
  }
}
