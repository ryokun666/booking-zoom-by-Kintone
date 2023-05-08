const axios = require("axios");
const jwt = require("jsonwebtoken");

const userId = "r.morie@gulliver.co.jp";

function generateToken() {
  const payload = {
    iss: apiKey,
    exp: new Date().getTime() + 5000,
  };

  return jwt.sign(payload, apiSecret);
}

async function createZoomMeeting(apiKey, apiSecret, meetingConfigJson) {
  // JWTトークンを生成
  const token = generateToken();

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      meetingConfigJson,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Zoom meeting:", error.response);
    throw error;
  }
}

module.exports = createZoomMeeting;
