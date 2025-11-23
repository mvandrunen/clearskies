// api/airport-status.js
// Interim version: stable shape, ready for plugging in real FAA data later.

module.exports = async (req, res) => {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: 'airport code required, e.g. ?airport=SAN' });
  }

  // For now, always return a neutral object so the front end doesn't blow up.
  // You can later replace this with a real FAA call and map into this shape.
  return res.status(200).json({
    airport: airport.toUpperCase(),
    groundDelay: false,
    groundStop: false,
    avgDelayMinutes: null
  });
};
