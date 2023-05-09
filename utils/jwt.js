const jwt = require("jsonwebtoken");

async function generateToken(apiKey, apiSecret) {
  const payload = {
    iss: apiKey,
    exp: new Date().getTime() + 60 * 1000,
  };

  return jwt.sign(payload, apiSecret);
}

module.exports = { generateToken };
