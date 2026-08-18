const express = require("express");
const busboy = require("busboy");
const csv = require("csv-parser");
const CSVTransform = require("../transforms/CSVTransform");

const router = express.Router();

router.post("/", (req, res) => {
  const bb = busboy({ headers: req.headers });
  const fileSize = parseInt(req.headers["x-file-size"] || "0");
  let rows = 0;
  let bytesRead = 0;
  let headers = [];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  bb.on("file", (field, stream) => {
    const startTime = Date.now();
    let isFirstRow = true;

    stream.on("data", (chunk) => {
      bytesRead += chunk.length;
    });

    const csvParser = csv();

    csvParser.on("headers", (headerList) => {
      headers = headerList;
    });

    const transformer = new CSVTransform(headers);

    csvParser.on("data", (row) => {
      if (isFirstRow) {
        transformer.setHeaders(Object.keys(row));
        isFirstRow = false;
      }
      transformer.write(Object.values(row));
    });

    csvParser.on("end", () => {
      transformer.end();
    });

    transformer.on("data", (jsonObj) => {
      rows++;

      if (rows % 500 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = elapsed > 0 ? Math.round(rows / elapsed) : 0;
        const progress = fileSize > 0 ? Math.min(99, Math.round((bytesRead / fileSize) * 100)) : 0;
        sendProgress({ rows, progress, rate });
      }
    });

    transformer.on("end", () => {
      sendProgress({ rows, progress: 100, rate: 0, done: true });
      res.end();
    });

    transformer.on("error", (err) => {
      sendProgress({ error: err.message });
      res.end();
    });

    stream.pipe(csvParser);
  });

  bb.on("error", (err) => {
    sendProgress({ error: err.message });
    res.end();
  });

  req.pipe(bb);
});

module.exports = router;
