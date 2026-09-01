const { Transform } = require("stream");
const ivm = require("isolated-vm");

// Runs user expression inside an isolated V8 sandbox — no Node globals exposed.
function applyExpression(value, expression) {
  if (!expression || !expression.trim()) return value;
  const isolate = new ivm.Isolate({ memoryLimit: 8 });
  try {
    const context = isolate.createContextSync();
    context.global.setSync("value", new ivm.ExternalCopy(value).copyInto());
    const result = isolate.compileScriptSync(`(${expression})`).runSync(context);
    return result === undefined || result === null ? "" : String(result);
  } catch {
    return value;
  } finally {
    isolate.dispose();
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
    // If mapping rules provided, apply them; otherwise fall back to identity map.
    if (this.mappingRules.length > 0) {
      const obj = {};
      for (const rule of this.mappingRules) {
        if (!rule.include) continue;
        const raw = row[rule.sourceIndex] !== undefined ? row[rule.sourceIndex] : "";
        obj[rule.destination] = applyExpression(raw, rule.transform);
      }
      this.push(obj);
    } else {
      const obj = {};
      this.headers.forEach((header, i) => {
        obj[header] = row[i] !== undefined ? row[i] : "";
      });
      this.push(obj);
    }
    callback();
  }
}

module.exports = CSVTransform;
