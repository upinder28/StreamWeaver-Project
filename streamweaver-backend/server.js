const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const uploadRoute = require("./routes/upload");

const app = express();

connectDB();

app.use(cors({ origin: "http://localhost:5173" }));
app.use("/upload", uploadRoute);

// Memory audit endpoint — hit GET /memory to see current heap usage
app.get("/memory", (req, res) => {
  const m = process.memoryUsage();
  res.json({
    heapUsedMB: (m.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (m.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (m.rss / 1024 / 1024).toFixed(2),
    externalMB: (m.external / 1024 / 1024).toFixed(2),
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
