const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const port = 3003;

require("dotenv").config();

const URL = "https://dwp33.cybozu.com/k/v1/records.json";
const API_TOKEN = "gn5iRmkA2ENCmNua99k7GF1ZYjXYtFj6AGF8sT5g";

// ミドルウェアを追加して、JSON形式のリクエストボディを解析できるようにします。
app.use(bodyParser.json());

async function getKintone(url, apiToken) {
  const headers = {
    "X-Cybozu-API-Token": apiToken,
  };
  const params = {
    app: 25,
    id: 100,
    query: "limit 500",
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

    if (zoomAccountValue) {
      getUserData(data);
    }
    return;
  } catch (error) {
    console.error(error);
  }
}

function getUserData(data) {
  console.log("うぇえええええい！！！");
}

app.get("/", async (req, res) => {
  const response = await getKintone(URL, API_TOKEN);
  res.send(response.data);
});

app.post("/webhook", async (req, res) => {
  // レコード更新時の処理をここに記述します

  const response = await getKintone(URL, API_TOKEN);
  console.log(response.data);

  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`サーバー起動🚀：${port}`);
});
