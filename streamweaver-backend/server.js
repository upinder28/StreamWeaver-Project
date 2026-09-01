const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const connectDB = require("./db");
const uploadRoute = require("./routes/upload");

const app = express();
const server = http.createServer(app);

// Map of uploadId -> WebSocket client
const wsClients = new Map();

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const uploadId = new URL(req.url, "http://localhost").searchParams.get("uploadId");
  if (!uploadId) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    wsClients.set(uploadId, ws);
    ws.on("close", () => wsClients.delete(uploadId));
  });
});

connectDB();

app.use(cors({ origin: "http://localhost:5173" }));
app.use("/upload", (req, res, next) => {
  req.wsClients = wsClients;
  next();
}, uploadRoute);

app.get("/memory", (req, res) => {
  const m = process.memoryUsage();
  res.json({
    heapUsedMB: (m.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (m.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (m.rss / 1024 / 1024).toFixed(2),
    externalMB: (m.external / 1024 / 1024).toFixed(2),
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
