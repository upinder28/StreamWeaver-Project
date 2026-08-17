import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { FixedSizeList as List } from "react-window";
import {
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Gauge,
  Rows3,
  Columns3,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Table2,
  Waypoints,
  ArrowRight,
  Copy,
  Check,
  Code2,
} from "lucide-react";


const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 40;
const PREVIEW_LIMIT = 1000;
const OVERSCAN = 6;
const MIN_COL_WIDTH = 130;
const MAX_COL_WIDTH = 260;

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function colWidthFor(headerText, sampleValues) {
  let longest = (headerText || "").length;
  for (const v of sampleValues) {
    const len = (v || "").length;
    if (len > longest) longest = len;
  }
  return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, longest * 8.2 + 28));
}

function suggestFieldName(header, index) {
  const cleaned = (header || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `field_${index + 1}`;
}

// Runs a user-typed JS expression against a single sample value, purely for
// live preview inside this tab. Wrapped in try/catch so a bad expression
// just shows an error chip instead of breaking the UI.
function applyTransformPreview(rawValue, transformStr) {
  if (!transformStr || !transformStr.trim()) return { ok: true, value: rawValue };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("value", `"use strict"; return (${transformStr});`);
    const result = fn(rawValue);
    return { ok: true, value: result === undefined || result === null ? "" : String(result) };
  } catch (e) {
    return { ok: false, value: e.message || "invalid expression" };
  }
}

export default function StreamWeaverPreview() {
  const [status, setStatus] = useState("idle"); // idle | parsing | ready | error
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rowsSeen, setRowsSeen] = useState(0);
  const [rate, setRate] = useState(0);
  const [columns, setColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [errorRowCount, setErrorRowCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [gridHeight, setGridHeight] = useState(520);
  const [mountedRange, setMountedRange] = useState({ start: 0, end: 0 });

  const [viewMode, setViewMode] = useState("grid"); // grid | mapping
  const [mappings, setMappings] = useState([]);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const bufferRef = useRef([]);
  const headerRef = useRef(null);
  const rowCountRef = useRef(0);
  const errCountRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastTickRowsRef = useRef(0);
  const parserRef = useRef(null);
  const gridWrapRef = useRef(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setFileName("");
    setFileSize(0);
    setProgress(0);
    setRowsSeen(0);
    setRate(0);
    setColumns([]);
    setPreviewRows([]);
    setErrorRowCount(0);
    setErrorMsg("");
    setMountedRange({ start: 0, end: 0 });
    setViewMode("grid");
    setMappings([]);
    setCopied(false);
    bufferRef.current = [];
    headerRef.current = null;
    rowCountRef.current = 0;
    errCountRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const beginParse = useCallback(
    (file) => {
      reset();
      setStatus("parsing");
      setFileName(file.name);
      setFileSize(file.size);
      bufferRef.current = [];
      headerRef.current = null;
      rowCountRef.current = 0;
      errCountRef.current = 0;
      lastTickRef.current = performance.now();
      lastTickRowsRef.current = 0;

      Papa.parse(file, {
        worker: false,
        skipEmptyLines: true,
        step: (results, parser) => {
          parserRef.current = parser;
          const row = results.data;

          if (!headerRef.current) {
            headerRef.current = row;
          } else {
            rowCountRef.current += 1;
            if (row.length !== headerRef.current.length) {
              errCountRef.current += 1;
            }
            if (bufferRef.current.length < PREVIEW_LIMIT) {
              bufferRef.current.push(row);
            }
          }

          const now = performance.now();
          if (now - lastTickRef.current > 120) {
            const dt = (now - lastTickRef.current) / 1000;
            const dRows = rowCountRef.current - lastTickRowsRef.current;
            setRate(dt > 0 ? dRows / dt : 0);
            setRowsSeen(rowCountRef.current);
            setErrorRowCount(errCountRef.current);
            const cursor = results.meta && results.meta.cursor ? results.meta.cursor : 0;
            setProgress(file.size > 0 ? Math.min(100, (cursor / file.size) * 100) : 0);
            lastTickRef.current = now;
            lastTickRowsRef.current = rowCountRef.current;
          }
        },
        complete: () => {
          const header = headerRef.current || [];
          const sample = bufferRef.current.slice(0, 50);
          const cols = header.map((h, i) => ({
            key: `c${i}`,
            label: h && h.trim() ? h : `Column ${i + 1}`,
            width: colWidthFor(h, sample.map((r) => r[i])),
          }));
          setColumns(cols);
          setPreviewRows(bufferRef.current);
          setMappings(
            cols.map((c, i) => ({
              key: c.key,
              sourceIndex: i,
              source: c.label,
              destination: suggestFieldName(c.label, i),
              transform: "",
              include: true,
            }))
          );
          setRowsSeen(rowCountRef.current);
          setErrorRowCount(errCountRef.current);
          setProgress(100);
          setRate(0);
          setStatus("ready");
        },
        error: (err) => {
          setErrorMsg(err && err.message ? err.message : "Could not parse this file.");
          setStatus("error");
        },
      });
    },
    [reset]
  );

  const handleFiles = useCallback(
    (files) => {
      const file = files && files[0];
      if (!file) return;
      if (!/\.csv$/i.test(file.name)) {
        setErrorMsg("StreamWeaver preview only reads .csv files right now.");
        setStatus("error");
        return;
      }
      beginParse(file);
    },
    [beginParse]
  );

  // Fixed: this handler existed in the design but was missing from the file
  // that was wired up — onDrop was referenced in JSX with nothing behind it.
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const dropTargetActive = status === "idle" || status === "error";

  // ---- measure grid viewport so react-window knows its pixel height ------
  useEffect(() => {
    if (status !== "ready" || viewMode !== "grid" || !gridWrapRef.current) return;
    const el = gridWrapRef.current;
    const update = () => setGridHeight(el.clientHeight || 520);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [status, viewMode]);

  const totalRows = previewRows.length;
  const totalGridWidth = useMemo(
    () => Math.max(columns.reduce((sum, c) => sum + c.width, 0), 640),
    [columns]
  );

  // react-window calls this every time the mounted window of rows changes —
  // it's how we know, at any moment, exactly how many DOM rows actually exist.
  const handleItemsRendered = useCallback(({ overscanStartIndex, overscanStopIndex }) => {
    setMountedRange({ start: overscanStartIndex, end: overscanStopIndex });
  }, []);

  const Row = useCallback(
    ({ index, style }) => {
      const row = previewRows[index];
      return (
        <div
          style={{
            ...style,
            display: "flex",
            background: index % 2 === 0 ? "#0E1420" : "#111826",
            borderBottom: "1px solid #161D28",
          }}
        >
          {columns.map((c, ci) => (
            <div key={c.key} style={{ ...styles.dataCell, width: c.width }}>
              {row && row[ci] !== undefined ? row[ci] : ""}
            </div>
          ))}
        </div>
      );
    },
    [previewRows, columns]
  );

  useEffect(() => {
    return () => {
      if (parserRef.current) parserRef.current.abort();
    };
  }, []);

  // ---- mapping helpers -----------------------------------------------------
  const updateMapping = useCallback((key, patch) => {
    setMappings((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }, []);

  const mappedCount = mappings.filter((m) => m.include).length;

  const mappingPayload = useMemo(
    () =>
      mappings
        .filter((m) => m.include)
        .map((m) => ({
          source: m.source,
          sourceIndex: m.sourceIndex,
          destination: m.destination || suggestFieldName(m.source, m.sourceIndex),
          transform: m.transform || null,
        })),
    [mappings]
  );

  const copyMappingJSON = useCallback(async () => {
    const text = JSON.stringify(mappingPayload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail in insecure contexts; fail silently, the
      // button just won't show the "copied" confirmation.
    }
  }, [mappingPayload]);

  const firstRow = previewRows[0];

  return (
    <div
      style={styles.app}
      onDragOver={
        dropTargetActive
          ? (e) => {
              e.preventDefault();
              setDragActive(true);
            }
          : undefined
      }
      onDragLeave={dropTargetActive ? () => setDragActive(false) : undefined}
      onDrop={dropTargetActive ? onDrop : undefined}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        html, body, #root { height: 100%; width: 100%; margin: 0; padding: 0; }
        #root { max-width: none !important; text-align: left; display: block; }
        body { background: #0B0F14; display: block; place-items: unset; }
        * { box-sizing: border-box; }
        .sw-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .sw-scroll::-webkit-scrollbar-track { background: #10161F; }
        .sw-scroll::-webkit-scrollbar-thumb { background: #2A3341; border-radius: 6px; }
        .sw-scroll::-webkit-scrollbar-thumb:hover { background: #3A4557; }
        @keyframes sw-thread {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -48; }
        }
        @keyframes sw-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sw-thread-line { stroke-dasharray: 6 6; animation: sw-thread 1.4s linear infinite; }
        .sw-ring { transition: border-color 0.18s ease, background 0.18s ease; }
        .sw-ring.drag { border-color: #E8A33D !important; background: rgba(232,163,61,0.05) !important; }
        .sw-hero { animation: sw-fade-up 0.4s ease both; }
        .sw-map-input {
          background: #0E1420;
          border: 1px solid #232B38;
          color: #E8ECF1;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          border-radius: 6px;
          padding: 7px 9px;
          outline: none;
          width: 100%;
        }
        .sw-map-input:focus { border-color: #E8A33D; }
        .sw-map-input::placeholder { color: #4A5361; }
        .sw-seg-btn {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: none; color: #7C8798;
          font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600;
          padding: 7px 13px; border-radius: 6px; cursor: pointer;
        }
        .sw-seg-btn.active { background: #1B222D; color: #E8ECF1; }
      `}</style>

      <WeaveBackdrop active={status === "parsing"} />

      <header style={styles.header}>
        <div style={styles.brandRow}>
          <LoomMark />
          <div>
            <div style={styles.brandName}>StreamWeaver</div>
            <div style={styles.brandTag}>No-code ETL that never runs out of memory</div>
          </div>
        </div>
        {status === "ready" && (
          <button style={styles.resetBtn} onClick={reset}>
            <RotateCcw size={14} />
            New file
          </button>
        )}
      </header>

      {dropTargetActive && (
        <div style={styles.heroWrap}>
          <div className={`sw-ring${dragActive ? " drag" : ""}`} style={styles.dropRing} />
          <div className="sw-hero" style={styles.hero}>
            <Upload size={30} color="#E8A33D" strokeWidth={1.6} />
            <div style={styles.dropTitle}>Drop a CSV to preview the first 1,000 rows</div>
            <div style={styles.dropSub}>
              Parsed in chunks as it streams in — a 5&nbsp;GB file won't freeze this tab.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button style={styles.browseBtn} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              Browse files
            </button>
            <div style={styles.dropHint}>or drop it anywhere on this page</div>
            {status === "error" && (
              <div style={styles.errorLine}>
                <AlertTriangle size={14} color="#E85D5D" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "parsing" && (
        <div style={styles.heroWrap}>
          <div className="sw-hero" style={styles.hero}>
            <div style={styles.dropTitle}>Weaving through {fileName}…</div>
            <div style={styles.dropSub}>{formatBytes(fileSize)} total</div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <div style={styles.parsingStats}>
              <span>{formatNumber(progress)}% streamed</span>
              <span>·</span>
              <span>{formatNumber(rowsSeen)} rows seen</span>
              <span>·</span>
              <span>{formatNumber(rate)} rows/sec</span>
            </div>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div style={styles.readyWrap}>
          <div style={styles.statsBar}>
            <Stat icon={<Rows3 size={15} color="#7C8798" />} label="rows parsed" value={formatNumber(rowsSeen)} />
            <Stat icon={<Columns3 size={15} color="#7C8798" />} label="columns" value={formatNumber(columns.length)} />
            <Stat icon={<HardDrive size={15} color="#7C8798" />} label="file size" value={formatBytes(fileSize)} />
            <Stat
              icon={
                errorRowCount > 0 ? (
                  <AlertTriangle size={15} color="#E8A33D" />
                ) : (
                  <CheckCircle2 size={15} color="#57C278" />
                )
              }
              label="malformed rows"
              value={formatNumber(errorRowCount)}
              tone={errorRowCount > 0 ? "warn" : "ok"}
            />

            <div style={styles.statsSpacer} />

            <div style={styles.segControl}>
              <button
                className={`sw-seg-btn${viewMode === "grid" ? " active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <Table2 size={14} />
                Grid
              </button>
              <button
                className={`sw-seg-btn${viewMode === "mapping" ? " active" : ""}`}
                onClick={() => setViewMode("mapping")}
              >
                <Waypoints size={14} />
                Mapping
              </button>
            </div>
          </div>

          {viewMode === "grid" && (
            <>
              <div ref={gridWrapRef} style={styles.gridWrap}>
                <div className="sw-scroll" style={styles.gridScrollX}>
                  <div style={{ width: totalGridWidth }}>
                    <div style={{ ...styles.headerRow, width: totalGridWidth }}>
                      {columns.map((c) => (
                        <div key={c.key} style={{ ...styles.headerCell, width: c.width }}>
                          {c.label}
                        </div>
                      ))}
                    </div>
                    {gridHeight > HEADER_HEIGHT && (
                      <List
                        className="sw-scroll"
                        height={gridHeight - HEADER_HEIGHT}
                        width={totalGridWidth}
                        itemCount={totalRows}
                        itemSize={ROW_HEIGHT}
                        overscanCount={OVERSCAN}
                        onItemsRendered={handleItemsRendered}
                        style={{ overflowX: "hidden" }}
                      >
                        {Row}
                      </List>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.footNote}>
                <FileSpreadsheet size={13} color="#5A6472" />
                {fileName} · react-window has only {formatNumber(mountedRange.end - mountedRange.start + 1)} of{" "}
                {formatNumber(totalRows)} preview rows mounted to the DOM right now
              </div>
            </>
          )}

          {viewMode === "mapping" && (
            <>
              <div style={styles.mapToolbar}>
                <div style={styles.mapToolbarText}>
                  {formatNumber(mappedCount)} of {formatNumber(columns.length)} columns will be sent
                </div>
                <button style={styles.copyBtn} onClick={copyMappingJSON}>
                  {copied ? <Check size={14} color="#57C278" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy mapping JSON"}
                </button>
              </div>

              <div className="sw-scroll" style={styles.mapWrap}>
                <div style={styles.mapHeaderRow}>
                  <div style={{ ...styles.mapHeadCell, width: 34 }}></div>
                  <div style={{ ...styles.mapHeadCell, width: 180 }}>Source column</div>
                  <div style={{ ...styles.mapHeadCell, width: 24 }}></div>
                  <div style={{ ...styles.mapHeadCell, width: 190 }}>Destination field</div>
                  <div style={{ ...styles.mapHeadCell, flex: 1, minWidth: 220 }}>Transform (optional JS)</div>
                  <div style={{ ...styles.mapHeadCell, width: 170 }}>Preview</div>
                </div>

                {mappings.map((m) => {
                  const rawSample = firstRow ? firstRow[m.sourceIndex] : "";
                  const preview = applyTransformPreview(rawSample, m.transform);
                  return (
                    <div
                      key={m.key}
                      style={{ ...styles.mapRow, opacity: m.include ? 1 : 0.4 }}
                    >
                      <div style={{ width: 34, display: "flex", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={m.include}
                          onChange={(e) => updateMapping(m.key, { include: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: "#E8A33D", cursor: "pointer" }}
                        />
                      </div>
                      <div style={{ width: 180, ...styles.mapSourceLabel }} title={m.source}>
                        {m.source}
                      </div>
                      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
                        <ArrowRight size={14} color="#4A5361" />
                      </div>
                      <div style={{ width: 190 }}>
                        <input
                          className="sw-map-input"
                          value={m.destination}
                          disabled={!m.include}
                          onChange={(e) => updateMapping(m.key, { destination: e.target.value })}
                          placeholder="destination_field"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                        <Code2
                          size={13}
                          color="#4A5361"
                          style={{ position: "absolute", left: 9, top: 9.5, pointerEvents: "none" }}
                        />
                        <input
                          className="sw-map-input"
                          style={{ paddingLeft: 28, fontStyle: m.transform ? "normal" : "italic" }}
                          value={m.transform}
                          disabled={!m.include}
                          onChange={(e) => updateMapping(m.key, { transform: e.target.value })}
                          placeholder="e.g. value.toUpperCase()"
                        />
                      </div>
                      <div style={{ width: 170, ...styles.mapPreviewCell, color: preview.ok ? "#7C8798" : "#E85D5D" }}>
                        {String(preview.value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.footNote}>
                <Waypoints size={13} color="#5A6472" />
                Preview only — transforms run safely against the full file on the backend in Week 3, not here in the
                browser.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
