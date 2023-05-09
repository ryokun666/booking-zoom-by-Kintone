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

async function generateToken(apiKey, apiSecret) {
  const payload = {
    iss: apiKey,
    exp: new Date().getTime() + 60 * 1000,
  };

  return jwt.sign(payload, apiSecret);
}

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
    return response;
  } catch (error) {
    console.error(error);
  }
}

async function getZoomData(data) {
  try {
    const zoomAccountValue = data.records[0]["Zoomアカウント"].value
      ? data
      : "";
    return zoomAccountValue;
  } catch (error) {
    console.error(error);
  }
}

async function getUserData(data) {
  const userName = data.records[0]["担当者"].value[0].name ?? "なし";
  const customerName = data.records[0]["顧客名"].value[0] ?? "お客";
  const bookingStartDate = await convertUtcToJapanTimeDate(
    data.records[0]["開始日時"].value
  );
  const bookingEndDate = await convertUtcToJapanTimeDate(
    data.records[0]["終了日時"].value
  );
  console.log("");
  console.log("~KintoneでのZOOM予約依頼~");
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
  const data1 = await bookingZoomMeeting(
    bookingStartDate,
    bookingEndDate,
    bookingData
  );
  return data1;
}

// 既存ミーティングと新規追加ミーティングの時間帯が重複していないかを確認する。
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

// ローカル環境テスト用
if (process.env.NODE_ENV !== "production") {
  app.get("/", async (req, res) => {
    try {
      const response = await getKintone(KINTONE_API_URL, KINTONE_API_TOKEN);
      const zoomData = await getZoomData(response.data);

      if (zoomData) {
        const bookingResult = await getUserData(zoomData);
        if (!bookingResult) {
          console.log(
            "🚨既存のミーティングと時間帯が重複しているためZOOM会議予約処理を中止しました。"
          );
        } else {
          console.log("🚀ZOOMの会議予約が完了しました！😀");
        }
        res.status(200).json(response.data);
      } else {
        console.log(new Date().toLocaleString({ timeZone: "Asia/Tokyo" }));
        console.log("KintoneからZOOMに関する情報はありませんでした。");
        res.status(200).json(response.data);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("エラー: サーバー内で問題が発生しました。");
    }
  });
}

app.post("/webhook", async (req, res) => {
  try {
    const response = await getKintone(KINTONE_API_URL, KINTONE_API_TOKEN);
    const zoomData = await getZoomData(response.data);

    if (zoomData) {
      await getUserData(zoomData);
      console.log("ZOOMの会議予約が完了しました！😀");
      res.status(200).json(response.data);
    } else {
      console.log(new Date().toLocaleString({ timeZone: "Asia/Tokyo" }));
      console.log("KintoneからZOOMに関する情報はありませんでした。");
      res.status(200).json(response.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("エラー: サーバー内で問題が発生しました。");
  }
});

app.listen(port, () => {
  console.log(`サーバー起動🚀：${port}`);
});
