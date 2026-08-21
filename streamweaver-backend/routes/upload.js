const express = require("express");
const busboy = require("busboy");
const csv = require("csv-parser");
const CSVTransform = require("../transforms/CSVTransform");
const Record = require("../models/Record");

const router = express.Router();
const BATCH_SIZE = 500;

router.post("/", (req, res) => {
  const bb = busboy({ headers: req.headers });
  const fileSize = parseInt(req.headers["x-file-size"] || "0");

  // Parse mapping rules from header: JSON array of { sourceIndex, destination, transform, include }
  let mappingRules = [];
  try {
    const raw = req.headers["x-mapping-rules"];
    if (raw) mappingRules = JSON.parse(decodeURIComponent(raw));
  } catch { /* use empty rules — identity transform */ }

  let rows = 0;
  let bytesRead = 0;
  let headers = [];
  let batch = [];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendProgress = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const flushBatch = async () => {
    if (batch.length === 0) return;
    const ops = batch.map((doc) => ({ insertOne: { document: doc } }));
    batch = [];
    try {
      await Record.bulkWrite(ops, { ordered: false });
    } catch (err) {
      sendProgress({ warning: `bulkWrite error: ${err.message}` });
    }
  };

  bb.on("file", (field, stream) => {
    const startTime = Date.now();
    let isFirstRow = true;

    stream.on("data", (chunk) => { bytesRead += chunk.length; });

    const csvParser = csv();

    csvParser.on("headers", (headerList) => { headers = headerList; });

    const transformer = new CSVTransform(headers, mappingRules);

    csvParser.on("data", (row) => {
      if (isFirstRow) {
        transformer.setHeaders(Object.keys(row));
        isFirstRow = false;
      }
      transformer.write(Object.values(row));
    });

    csvParser.on("end", () => transformer.end());

    transformer.on("data", (jsonObj) => {
      rows++;
      batch.push(jsonObj);

      if (batch.length >= BATCH_SIZE) {
        csvParser.pause();
        flushBatch().then(() => csvParser.resume());
      }

      if (rows % 500 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = elapsed > 0 ? Math.round(rows / elapsed) : 0;
        const progress = fileSize > 0 ? Math.min(99, Math.round((bytesRead / fileSize) * 100)) : 0;
        sendProgress({ rows, progress, rate });
      }
    });

    transformer.on("end", async () => {
      await flushBatch();
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
