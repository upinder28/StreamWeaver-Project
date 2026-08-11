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
}