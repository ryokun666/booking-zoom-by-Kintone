const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const { zonedTimeToUtc, utcToZonedTime, format } = require("date-fns-tz");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 80;

const KINTONE_API_URL = process.env.KINTONE_API_URL;
const KINTONE_API_TOKEN = process.env.KINTONE_API_TOKEN;
const ZOOM_API_KEY = process.env.ZOOM_API_KEY;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET;
const userId = "r.morie@gulliver.co.jp";

app.use(bodyParser.json());

async function getKintone(url, apiToken) {
  const headers = {
    "X-Cybozu-API-Token": apiToken,
  };
  const params = {
    app: 25,
    id: 100,
    query: "order by 更新日時 desc limit 1",
  };
  try {
    const response = await axios.get(url, { headers, params });
    getZoomData(response.data);
    return response;
  } catch (error) {
    console.error(error);
  }
}

function getZoomData(data) {
  try {
    const zoomAccountValue = data.records[0]["Zoomアカウント"].value;
    if (!zoomAccountValue) {
      return;
    }
    getUserData(data);
  } catch (error) {
    console.error(error);
  }
}

function getUserData(data) {
  const userName = data.records[0]["担当者"].value[0].name ?? "なし";
  const customerName = data.records[0]["顧客名"].value[0] ?? "お客";
  const bookingStartDate = convertUtcToJapanTimeDate(
    data.records[0]["開始日時"].value
  );
  const bookingEndDate = convertUtcToJapanTimeDate(
    data.records[0]["終了日時"].value
  );

  console.log("-------------------------");
  console.log("担当営業：" + userName);
  console.log("打ち合わせ先：" + customerName);
  console.log("開始時間：" + bookingStartDate);
  console.log("終了時間：" + bookingEndDate);
  console.log("-------------------------");
  const bookingData = {
    userName,
    customerName,
    bookingStartDate,
    bookingEndDate,
  };
  bookingZoomMeeting(bookingStartDate, bookingEndDate, bookingData);
}

function calculateDuration(start, end) {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diff = endTime.getTime() - startTime.getTime();
  const duration = diff / (1000 * 60);
  return duration;
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
  const meetingConfigJson = JSON.stringify(meetingConfig);

  try {
    const meeting = await createZoomMeeting(
      ZOOM_API_KEY,
      ZOOM_API_SECRET,
      meetingConfigJson
    );

    console.log("トピック:", meeting.topic);
    console.log("開始時間:", meeting.start_time);
    console.log("会議時間:", duration + "分");
    console.log(
      "タイムゾーン:",
      meeting.timezone === "Asia/Tokyo" ? "大阪、札幌、東京" : meeting.timezone
    );
    console.log("会議URL:", meeting.join_url);
    console.log("ミーティングID:", meeting.id);
    console.log("パスコード:", meeting.password);
    console.log(meeting);
  } catch (error) {
    console.error("Error:", error);
  }
}

function convertUtcToJapanTimeDate(utcDateString) {
  const timeZone = "Asia/Tokyo";
  const utcDate = zonedTimeToUtc(utcDateString, timeZone);
  const japanDate = utcToZonedTime(utcDate, timeZone);

  const formattedDate = format(japanDate, "yyyy-MM-dd'T'HH:mm:ss", {
    timeZone: timeZone,
  });

  return formattedDate;
}

app.get("/", async (req, res) => {
  const response = await getKintone(KINTONE_API_URL, KINTONE_API_TOKEN);
  if (response) {
    res.send(response.data);
  } else {
    res
      .status(500)
      .send("エラー: Kintone APIからデータを取得出来ませんでした。");
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const response = await getKintone(KINTONE_API_URL, KINTONE_API_TOKEN);
    if (response) {
      res.status(200).json(response.data);
    } else {
      res
        .status(500)
        .send("エラー: Kintone APIからデータを取得出来ませんでした。");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("エラー: サーバー内で問題が発生しました。");
  }
});

app.listen(port, () => {
  console.log(`サーバー起動🚀：${port}`);
});

function generateToken(apiKey, apiSecret) {
  const payload = {
    iss: apiKey,
    exp: new Date().getTime() + 60 * 1000,
  };

  return jwt.sign(payload, apiSecret);
}

async function createZoomMeeting(apiKey, apiSecret, meetingConfigJson) {
  const token = generateToken(apiKey, apiSecret);

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
    console.error("Error creating Zoom meeting:", error.response);
    throw error;
  }
}
