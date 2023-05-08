const jwt = require("jsonwebtoken");

function generateZoomToken(apiKey, apiSecret) {
  const payload = {
    iss: apiKey,
    exp: new Date().getTime() + 60 * 60 * 1000,
  };

  return jwt.sign(payload, apiSecret);
}

module.exports = generateZoomToken;
