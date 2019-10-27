const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const router = require("./router");

const app = express();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Listening at ${PORT} ...`);
});

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello world, where is my bus?");
});

// router
app.use("/station", router);
app.use("/bus", router);

// 404 handler
app.use((req, res) => {
  res.status(404);
  res.send("Page not found");
});
