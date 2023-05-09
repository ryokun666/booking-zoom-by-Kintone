const express = require("express");
const bodyParser = require("./middleware/bodyParser");
const routes = require("./routes");
require("dotenv").config();

const app = express();
const port = 80;

app.use(bodyParser.json());
app.use("/", routes);

app.listen(port, () => {
  console.log(`サーバー起動🚀：${port}`);
});
