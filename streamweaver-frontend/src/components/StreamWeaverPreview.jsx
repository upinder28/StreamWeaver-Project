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

   const dropTargetActive = status === "idle" || status === "error";

  // ---- measure grid viewport so react-window knows its pixel height ------
  useEffect(() => {
    if (status !== "ready" || !gridWrapRef.current) return;
    const el = gridWrapRef.current;
    const update = () => setGridHeight(el.clientHeight || 520);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

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

  // ---- drag handlers ----
  const onDragOver = (e) => { e.preventDefault(); if (dropTargetActive) setDragActive(true); };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e) => { e.preventDefault(); setDragActive(false); if (dropTargetActive) handleFiles(e.dataTransfer.files); };

  // ---- render ----
  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.topBar}>
        <FileSpreadsheet size={22} color="#6EE7B7" />
        <span style={styles.title}>StreamWeaver</span>
        {status !== "idle" && (
          <button style={styles.resetBtn} onClick={reset}>
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {/* Drop zone */}
      {(status === "idle" || status === "error") && (
        <div
          style={{ ...styles.dropZone, ...(dragActive ? styles.dropZoneActive : {}) }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <Upload size={36} color="#6EE7B7" />
          <p style={styles.dropText}>Drop a CSV here or <span style={styles.dropLink}>browse</span></p>
          <p style={styles.dropSub}>Previews up to 1,000 rows — streams the rest</p>
          {status === "error" && <p style={styles.errorText}><AlertTriangle size={14} /> {errorMsg}</p>}
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}

      {/* Parsing / progress */}
      {status === "parsing" && (
        <div style={styles.progressWrap}>
          <div style={styles.fileInfo}>
            <HardDrive size={14} color="#94A3B8" />
            <span style={styles.fileInfoText}>{fileName} — {formatBytes(fileSize)}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
          </div>
          <div style={styles.statsRow}>
            <span><Rows3 size={13} /> {formatNumber(rowsSeen)} rows</span>
            <span><Gauge size={13} /> {formatNumber(rate)} rows/sec</span>
            {errorRowCount > 0 && <span style={{ color: "#F87171" }}><AlertTriangle size={13} /> {errorRowCount} bad rows</span>}
          </div>
        </div>
      )}

      {/* Ready — stats + grid */}
      {status === "ready" && (
        <>
          <div style={styles.statsBar}>
            <span style={styles.statChip}><CheckCircle2 size={13} color="#6EE7B7" /> {formatNumber(rowsSeen)} rows</span>
            <span style={styles.statChip}><Columns3 size={13} color="#94A3B8" /> {columns.length} cols</span>
            <span style={styles.statChip}><HardDrive size={13} color="#94A3B8" /> {formatBytes(fileSize)}</span>
            {errorRowCount > 0 && <span style={{ ...styles.statChip, color: "#F87171" }}><AlertTriangle size={13} /> {errorRowCount} bad rows</span>}
            <span style={{ ...styles.statChip, marginLeft: "auto", color: "#64748B", fontSize: 11 }}>
              DOM rows: {mountedRange.end - mountedRange.start + 1} / {totalRows}
            </span>
          </div>

          {/* Sticky header + virtualized body */}
          <div style={styles.gridOuter}>
            {/* Sticky column headers */}
            <div style={{ ...styles.headerRow, width: totalGridWidth }}>
              {columns.map((c) => (
                <div key={c.key} style={{ ...styles.headerCell, width: c.width }}>{c.label}</div>
              ))}
            </div>
            {/* Virtualized rows */}
            <div ref={gridWrapRef} style={styles.gridBody}>
              <List
                height={gridHeight}
                itemCount={totalRows}
                itemSize={ROW_HEIGHT}
                width="100%"
                overscanCount={OVERSCAN}
                onItemsRendered={handleItemsRendered}
                innerElementType={({ children, style, ...rest }) => (
                  <div style={{ ...style, width: totalGridWidth }} {...rest}>{children}</div>
                )}
              >
                {Row}
              </List>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#080D14", color: "#CBD5E1", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" },
  topBar: { display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", borderBottom: "1px solid #161D28", background: "#0A1018" },
  title: { fontSize: 18, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.3px", flex: 1 },
  resetBtn: { display: "flex", alignItems: "center", gap: 5, background: "#1E293B", border: "1px solid #334155", color: "#94A3B8", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 13 },
  dropZone: { margin: "48px auto", width: "min(560px, 90%)", border: "2px dashed #1E293B", borderRadius: 16, padding: "52px 32px", textAlign: "center", cursor: "pointer", transition: "border-color .2s, background .2s", background: "#0A1018" },
  dropZoneActive: { borderColor: "#6EE7B7", background: "#0D1F1A" },
  dropText: { margin: "14px 0 4px", fontSize: 16, color: "#E2E8F0" },
  dropLink: { color: "#6EE7B7", textDecoration: "underline" },
  dropSub: { fontSize: 13, color: "#475569", margin: 0 },
  errorText: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", color: "#F87171", marginTop: 14, fontSize: 13 },
  progressWrap: { margin: "40px auto", width: "min(560px, 90%)", display: "flex", flexDirection: "column", gap: 12 },
  fileInfo: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#64748B" },
  fileInfoText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressTrack: { height: 6, background: "#1E293B", borderRadius: 99, overflow: "hidden" },
  progressBar: { height: "100%", background: "linear-gradient(90deg,#6EE7B7,#3B82F6)", borderRadius: 99, transition: "width .15s" },
  statsRow: { display: "flex", gap: 20, fontSize: 13, color: "#64748B", alignItems: "center" },
  statsBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #161D28", flexWrap: "wrap" },
  statChip: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#94A3B8" },
  gridOuter: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  headerRow: { display: "flex", background: "#0D1520", borderBottom: "2px solid #1E293B", minWidth: "100%" },
  headerCell: { padding: "0 12px", height: HEADER_HEIGHT, lineHeight: `${HEADER_HEIGHT}px`, fontSize: 12, fontWeight: 600, color: "#6EE7B7", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #161D28" },
  dataCell: { padding: "0 12px", height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, fontSize: 13, color: "#CBD5E1", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid #161D28" },
  gridBody: { flex: 1, overflow: "hidden" },
};