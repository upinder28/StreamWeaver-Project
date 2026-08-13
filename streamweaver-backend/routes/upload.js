const express = require("express");
const busboy = require("busboy");
const csv = require("csv-parser");

const router = express.Router();

router.post("/", (req, res) => {
  const bb = busboy({ headers: req.headers });
  let rows = 0;

  bb.on("file", (field, stream) => {
    stream.pipe(csv()).on("data", () => {
      rows++;
    }).on("end", () => {
      res.json({ success: true, totalRows: rows });
    });
  });

  req.pipe(bb);
});

module.exports = router;
