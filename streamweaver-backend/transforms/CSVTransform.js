const { Transform } = require("stream");

class CSVTransform extends Transform {
  constructor(headers) {
    super({ objectMode: true });
    this.headers = headers;
  }

  _transform(row, encoding, callback) {
    const obj = {};
    this.headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i] : "";
    });
    this.push(obj);
    callback();
  }
}

module.exports = CSVTransform;
