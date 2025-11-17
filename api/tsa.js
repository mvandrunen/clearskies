// api/tsa.js
// Placeholder TSA endpoint – returns nulls so front-end falls back to modeled wait times.

module.exports = async (req, res) => {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: 'airport code required, e.g. ?airport=SAN' });
  }

  // For now, we just return nulls – front-end keeps its own modeled estimates.
  return res.status(200).json({
    standardMin: null,
    standardMax: null,
    preMin: null,
    preMax: null
  });
};
