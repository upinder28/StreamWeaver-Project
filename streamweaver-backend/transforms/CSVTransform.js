const { Transform } = require("stream");

// TODO Week 3: replace with isolated-vm sandbox
function applyExpression(value, expression) {
  if (!expression || !expression.trim()) return value;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("value", `"use strict"; return (${expression});`);
    const result = fn(value);
    return result === undefined || result === null ? "" : String(result);
  } catch {
    return value;
  }
}

class CSVTransform extends Transform {
  // mappingRules: array of { sourceIndex, destination, transform, include }
  constructor(headers = [], mappingRules = []) {
    super({ objectMode: true });
    this.headers = headers;
    this.mappingRules = mappingRules;
  }

  setHeaders(headers) {
    this.headers = headers;
  }

  _transform(row, encoding, callback) {
    const obj = {};
    if (this.mappingRules.length > 0) {
      for (const rule of this.mappingRules) {
        if (rule.include === false) continue;
        const raw = row[rule.source] !== undefined ? row[rule.source] : "";
        obj[rule.destination] = applyExpression(raw, rule.transform);
      }
    } else {
      // identity: pass all fields through as-is
      Object.assign(obj, row);
    }
    this.push(obj);
    callback();
  }
}

module.exports = CSVTransform;
