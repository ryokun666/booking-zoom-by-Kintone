const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

// const URL = "https://dwp33.cybozu.com/k/v1/records.json?app=25&id=100";
// const API_TOKEN = "gn5iRmkA2ENCmNua99k7GF1ZYjXYtFj6AGF8sT5g";

// ミドルウェアを追加して、JSON形式のリクエストボディを解析できるようにします。
app.use(bodyParser.json());

async function getKintone(url, apiToken) {
  const headers = { "X-Cybozu-API-Token": apiToken };
  try {
    const response = await axios.get(url, { headers });
    return response;
  } catch (error) {
    console.error(error);
  }
}

app.get("/", async (req, res) => {
  const response = await getKintone(URL, API_TOKEN);
  res.send(response.data);
});

app.post("/webhook", async (req, res) => {
  // レコード更新時の処理をここに記述します
    console.log("Webhook received");
    console.log(req);

  const response = await getKintone(URL, API_TOKEN);
  console.log(response.data);

  res.sendStatus(200);
});

app.listen(port, "192.168.0.65", () => {
  console.log(`Server is running at http://192.168.0.65:${port}`);
});
