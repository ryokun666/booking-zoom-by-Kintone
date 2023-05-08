const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const { zonedTimeToUtc, utcToZonedTime, format } = require("date-fns-tz");
const createZoomMeeting = require("./zoomClient");
require("dotenv").config();

const app = express();
const port = 3003;

// Kintone用
const KINTONE_API_URL = "https://dwp33.cybozu.com/k/v1/records.json";
const KINTONE_API_TOKEN = "gn5iRmkA2ENCmNua99k7GF1ZYjXYtFj6AGF8sT5g";
// ZOOM用
const ZOOM_API_KEY = "hSilPVNpRvSqCcaIy1-Ruw";
const ZOOM_API_SECRET = "mb3mapc8U7Y2LEE0HEOxwoFZXry2bZF45CX9";

// JSONファイル整形
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
    // "Zoomアカウント" の "value" を取得
    const zoomAccountValue = data.records[0]["Zoomアカウント"].value;

    if (!zoomAccountValue) {
      console.log("KintoneカレンダーにZOOM予約情報はありませんでした。");
      return;
    }
    // ZOOM会議情報がある場合は、ZOOM会議URLを発行する。
    getUserData(data);

    return;
  } catch (error) {
    console.error(error);
  }
}

// ZOOM予約を入れたユーザーの情報を取得する。
function getUserData(data) {
  const userName = data.records[0]["担当者"].value[0].name ?? "なし";
  const customerName = data.records[0]["顧客名"].value[0] ?? "お客";
  const bookingStartDatea = data.records[0]["開始日時"].value;
  const bookingStartDate = new Date(bookingStartDatea);

  const bookingEndDate = data.records[0]["終了日時"].value;

  console.log("-------------------------");
  console.log("担当営業：" + userName);
  console.log("打ち合わせ先：" + customerName);
  console.log("開始時間：" + convertToJapanTime(bookingStartDate));
  console.log("終了時間：" + convertToJapanTime(bookingEndDate));
  console.log("-------------------------");
  const bookingData = {
    userName, // 担当営業
    customerName, // 打ち合わせ先
    bookingStartDate, // 開始時間
    bookingEndDate, // 終了時間
  };

  bookingZoomMeeting(bookingStartDate, bookingEndDate, bookingData);
  console.log("bookingStartDate:", bookingStartDate);

  return;
}

// 終了時間と開始時間の差分を計算する
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
  const timeZoneDate = format(
    zonedTimeToUtc(bookingStartDate, timeZone),
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    { timeZone: timeZone }
  );

  console.log(timeZoneDate);
  try {
    const meetingConfig = {
      topic: `${bookingData.customerName}様お打ち合わせ(${bookingData.userName})`,
      type: 2,
      start_time: timeZoneDate,
      duration: duration,
      timezone: timeZone,
      pre_schedule: true,
    };

    const meeting = await createZoomMeeting(ZOOM_API_KEY, ZOOM_API_SECRET, meetingConfig);
    console.log("トピック:", meeting.topic);
    console.log("開始時間:", convertToJapanTime(meeting.start_time));
    console.log("終了時間:", convertToJapanTime(bookingEndDate));
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

// 日本時間フォーマット用
function convertToJapanTime(utcDateString) {
  // 日本のタイムゾーンを指定
  const timeZone = "Asia/Tokyo";

  // UTCの日付文字列を Date オブジェクトに変換
  const utcDate = zonedTimeToUtc(utcDateString, timeZone);
  // Date オブジェクトを日本時間に変換
  const japanDate = utcToZonedTime(utcDate, timeZone);

  // 日付を文字列にフォーマット
  const formattedDate = format(japanDate, "yyyy-MM-dd-HH:mm", {
    timeZone: timeZone,
  });

  return formattedDate;
}

// ZOOM用に時間フォーマット修正
function convertUtcToTimeZoneDate(utcDateString, timeZone) {
  const utcDate = new Date(utcDateString);
  const timeZoneDate = dateFnsTz.utcToZonedTime(utcDate, timeZone);
  return timeZoneDate;
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
  const response = await getKintone(KINTONE_API_URL, KINTONE_API_TOKEN);
  console.log(response.data);

  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`サーバー起動🚀：${port}`);
});
