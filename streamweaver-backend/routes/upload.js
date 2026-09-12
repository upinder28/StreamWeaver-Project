const express = require("express");
const busboy = require("busboy");
const csv = require("csv-parser");
const CSVTransform = require("../transforms/CSVTransform");
const Record = require("../models/Record");

const router = express.Router();
const BATCH_SIZE = 5000;

router.post("/", (req, res) => {
  const bb = busboy({ headers: req.headers });
  const fileSize = parseInt(req.headers["x-file-size"] || "0");
  const uploadId = req.headers["x-upload-id"] || null;
  const wsClient = uploadId ? req.wsClients?.get(uploadId) : null;

  const sendProgress = (data) => {
    const payload = JSON.stringify(data);
    res.write(`data: ${payload}\n\n`);
    if (wsClient && wsClient.readyState === 1) wsClient.send(payload);
  };

  // Parse mapping rules from header: JSON array of { sourceIndex, destination, transform, include }
  let mappingRules = [];
  try {
    const raw = req.headers["x-mapping-rules"];
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        mappingRules = parsed.filter(
          (r) => r && typeof r === "object" && typeof r.sourceIndex === "number"
        );
      }
    }
  } catch { /* use empty rules — identity transform */ }
  console.log("[DEBUG] mappingRules:", JSON.stringify(mappingRules.slice(0, 2)));

  let rows = 0;
  let bytesRead = 0;
  let batch = [];
  let transformer;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const flushBatch = async () => {
    if (batch.length === 0) return;
    const ops = batch.map((doc) => ({ insertOne: { document: doc } }));
    batch = [];
    try {
      console.log("[DEBUG] bulkWrite batch size:", ops.length, "sample:", ops[0]);
      const result = await Record.bulkWrite(ops, { ordered: false });
      console.log("[DEBUG] bulkWrite result:", result.insertedCount);
    } catch (err) {
      console.error("[DEBUG] bulkWrite error:", err.message);
      sendProgress({ warning: `bulkWrite error: ${err.message}` });
    }
  };

  bb.on("file", (field, stream) => {
    const startTime = Date.now();

    stream.on("data", (chunk) => { bytesRead += chunk.length; });

    const csvParser = csv();

    csvParser.on("headers", (headerList) => {
      console.log("[DEBUG] headers:", headerList);
      transformer = new CSVTransform(headerList, mappingRules);

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
    });

    csvParser.on("data", (row) => {
      if (!transformer) return;
      // csv-parser already gives us a keyed object — pass it directly
      transformer.write(row);
    });

    csvParser.on("end", () => transformer.end());

    csvParser.on("error", (err) => {
      sendProgress({ error: `CSV parse error: ${err.message}` });
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
