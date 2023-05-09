const axios = require("axios");
const { convertUtcToJapanTimeDate } = require("../utils/date");
const { bookingZoomMeeting } = require("../controllers/zoomController");

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

module.exports = { getKintone, getZoomData, getUserData };
