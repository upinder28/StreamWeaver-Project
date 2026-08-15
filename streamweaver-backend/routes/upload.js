const express = require("express");
const busboy = require("busboy");
const csv = require("csv-parser");

const router = express.Router();

router.post("/", (req, res) => {
  const bb = busboy({ headers: req.headers });
  const fileSize = parseInt(req.headers["x-file-size"] || "0");
  let rows = 0;
  let bytesRead = 0;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  bb.on("file", (field, stream) => {
    const startTime = Date.now();

    stream.on("data", (chunk) => {
      bytesRead += chunk.length;
    });

    stream.pipe(csv()).on("data", () => {
      rows++;

      if (rows % 500 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = elapsed > 0 ? Math.round(rows / elapsed) : 0;
        const progress = fileSize > 0 ? Math.min(99, Math.round((bytesRead / fileSize) * 100)) : 0;

        sendProgress({ rows, progress, rate });
      }
    }).on("end", () => {
      sendProgress({ rows, progress: 100, rate: 0, done: true });
      res.end();
    }).on("error", (err) => {
      sendProgress({ error: err.message });
      res.end();
    });
  });

  bb.on("error", (err) => {
    sendProgress({ error: err.message });
    res.end();
  });

  req.pipe(bb);
});

module.exports = router;
