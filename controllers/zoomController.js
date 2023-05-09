const axios = require("axios");
const { ZOOM_API_KEY, ZOOM_API_SECRET, userId } = require("../config");
const { generateToken } = require("../utils/jwt");
const {
  hasOverlappingMeetings,
  listMeetings,
  calculateDuration,
} = require("../utils/date");

async function createZoomMeeting(apiKey, apiSecret, meetingConfigJson) {
  const token = await generateToken(apiKey, apiSecret);

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      meetingConfigJson,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Zoom meeting:", error.response.data);
    throw error;
  }
}

async function bookingZoomMeeting(
  bookingStartDate,
  bookingEndDate,
  bookingData
) {
  const duration = calculateDuration(bookingStartDate, bookingEndDate);
  const timeZone = "Asia/Tokyo";

  const meetingConfig = {
    topic: `${bookingData.customerName}様お打ち合わせ(${bookingData.userName})`,
    type: 2,
    start_time: bookingStartDate,
    duration: duration,
    timezone: timeZone,
  };

  try {
    const existingMeetings = await listMeetings(
      ZOOM_API_KEY,
      ZOOM_API_SECRET,
      userId
    );

    if (
      !hasOverlappingMeetings(
        existingMeetings,
        bookingStartDate,
        bookingEndDate
      )
    ) {
      const meeting = await createZoomMeeting(
        ZOOM_API_KEY,
        ZOOM_API_SECRET,
        meetingConfig
      );

      console.log("");
      console.log("~ZOOM予約内容~");
      console.log("-------------------------");
      console.log("トピック:", meeting.topic);
      console.log("開始時間:", meeting.start_time);
      console.log("会議時間:", duration + "分");
      console.log(
        "タイムゾーン:",
        meeting.timezone === "Asia/Tokyo"
          ? "大阪、札幌、東京"
          : meeting.timezone
      );
      console.log("会議URL:", meeting.join_url);
      console.log("ミーティングID:", meeting.id);
      console.log("パスコード:", meeting.password);
      console.log("-------------------------");

      return meeting;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

module.exports = { createZoomMeeting, bookingZoomMeeting };
