const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const port = 3003;

require("dotenv").config();

// const env = process.env;
// const URL = env.URL;
// const API_TOKEN = env.API_TOKEN;
console.log("わわわわ")
console.log(URL);
console.log(API_TOKEN);
console.log("あああああ")
console.log(process.env.URL);
console.log(process.env.API_TOKEN);

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

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
