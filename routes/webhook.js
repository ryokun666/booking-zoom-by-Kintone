const express = require("express");
const router = express.Router();
const {
  getKintone,
  getZoomData,
  getUserData,
} = require("../controllers/kintoneController");
const { KINTONE_API_URL, KINTONE_API_TOKEN } = require("../config");

router.get("/", async (req, res) => {
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

router.post("/webhook", async (req, res) => {
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

module.exports = router;
