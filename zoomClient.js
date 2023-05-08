const axios = require("axios");

async function createZoomMeeting(apiKey, apiSecret, meetingConfig) {
  try {
    const zoomToken = require("./generateZoomToken")(apiKey, apiSecret);

    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      meetingConfig,
      {
        headers: {
          Authorization: `Bearer ${zoomToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log("ZOOM API連携時にエラーが発生しました。");
    throw error;
  }
}

module.exports = createZoomMeeting;
