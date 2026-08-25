const { Transform } = require("stream");
const ivm = require("isolated-vm");

// Safely run a user-supplied JS expression against a single value.
// Returns transformed string or original value on error.
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

// Week 3
function applySandboxedExpression(value, expression) {
  if (!expression || !expression.trim()) return value;

  let isolate;

  try {
    isolate = new ivm.Isolate({
      memoryLimit: 16,
    });

    const context = isolate.createContextSync();

    context.global.setSync("value", value);

    const script = isolate.compileScriptSync(
      `"use strict"; (${expression})`
    );

    const result = script.runSync(context, {
      timeout: 100,
    });

    return result === undefined || result === null
      ? ""
      : String(result);
  } catch {
    return value;
  } finally {
    if (isolate) {
      isolate.dispose();
    }
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
        // obj[rule.destination] = applyExpression(raw, rule.transform);

        obj[rule.destination] = applySandboxedExpression(
  raw,
  rule.transform
);
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
