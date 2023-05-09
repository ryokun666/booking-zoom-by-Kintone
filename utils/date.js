const { zonedTimeToUtc, utcToZonedTime, format } = require("date-fns-tz");
const { generateToken } = require("./jwt");

function hasOverlappingMeetings(existingMeetings, startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return existingMeetings.some((meeting) => {
    const meetingStart = new Date(meeting.start_time);
    const meetingEnd = new Date(meeting.start_time);
    meetingEnd.setMinutes(meetingEnd.getMinutes() + meeting.duration);

    return (
      (start >= meetingStart && start < meetingEnd) ||
      (end > meetingStart && end <= meetingEnd)
    );
  });
}

async function listMeetings(apiKey, apiSecret, userId) {
  const token = await generateToken(apiKey, apiSecret);
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      config
    );
    console.log(response);
    if (!response) return null;
    return response.data.meetings;
  } catch (error) {
    console.error("Error listing Zoom meetings:", error.response.data);
    throw error;
  }
}

function calculateDuration(start, end) {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diff = endTime.getTime() - startTime.getTime();
  const duration = diff / (1000 * 60);
  return duration;
}

async function convertUtcToJapanTimeDate(utcDateString) {
  // 文字列でない場合、エラーメッセージを返す
  if (typeof utcDateString !== "string") {
    console.error(
      "Error: フォーマット変換関数の引数には文字列を入れてください。"
    );
    return;
  }

  const timeZone = "Asia/Tokyo";
  const utcDate = zonedTimeToUtc(utcDateString, timeZone);
  const japanDate = utcToZonedTime(utcDate, timeZone);

  const formattedDate = format(japanDate, "yyyy-MM-dd'T'HH:mm:ss", {
    timeZone: timeZone,
  });
  return formattedDate;
}

module.exports = {
  hasOverlappingMeetings,
  listMeetings,
  calculateDuration,
  convertUtcToJapanTimeDate,
};
