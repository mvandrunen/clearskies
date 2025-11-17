// api/airport-status.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: 'airport code required, e.g. ?airport=SAN' });
  }

  try {
    // NOTE: You may need to adjust this URL to the current FAA/NAS status API
    const url = `https://nasstatus.faa.gov/api/airport-status-information?airport=${airport}`;
    const r = await fetch(url);
    const text = await r.text();

    // very naive parsing – good enough for v0.1
    const groundDelay = text.includes('Ground Delay');
    const groundStop = text.includes('Ground Stop');

    let avgDelayMinutes = null;
    const delayMatch = text.match(/Average Delay\s*:\s*(\d+)\s*minutes?/i);
    if (delayMatch) {
      avgDelayMinutes = parseInt(delayMatch[1], 10);
    }

    return res.status(200).json({
      airport,
      groundDelay,
      groundStop,
      avgDelayMinutes
    });
  } catch (err) {
    console.error('Airport status error:', err);
    return res.status(500).json({ error: 'Airport status lookup failed' });
  }
};
