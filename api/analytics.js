// api/analytics.js
// Anonymous, fire-and-forget usage logging.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Analytics event:", req.body);
  } catch (e) {
    console.warn("Failed to read analytics body", e);
  }

  return res.status(204).end();
};
