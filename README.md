# StreamWeaver: High-Throughput No-Code ETL Pipeline

![StreamWeaver](https://img.shields.io/badge/StreamWeaver-v1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18.2+-blue)
![Vite](https://img.shields.io/badge/Vite-4.4+-purple)
![MongoDB](https://img.shields.io/badge/MongoDB-8+-brightgreen)

## Project Overview

**StreamWeaver** is a high-throughput, no-code ETL pipeline designed to process large CSV datasets efficiently without requiring users to write code.

The project focuses on:

* Memory-efficient data processing
* Streaming large file uploads
* Real-time processing statistics
* Virtualized data preview
* Visual data transformation and column mapping
* Streaming database writes via MongoDB

The development is being completed incrementally through a week-wise implementation plan.

## Problem Statement

Uploading and processing massive datasets such as multi-GB CSV files can cause browser freezing or Node.js heap memory issues when the entire file is loaded into memory.

StreamWeaver solves this using **stream-based processing** end to end — chunked parsing in the browser, a piped Node.js stream pipeline on the server, and batched writes into MongoDB — so users can work with large datasets without ever loading a full file into memory, on either side.

## Current Architecture

```
                         StreamWeaver
                              │
             ┌────────────────┴────────────────┐
             │                                  │
         Frontend                            Backend
       React + Vite                    Node.js + Express
             │                                  │
        Papa Parse                           Busboy
             │                                  │
    1,000-row Preview                      CSV Parser
             │                                  │
      react-window                    CSVTransform (stream.Transform)
             │                                  │
  Virtualized Grid                    Batched bulkWrite → MongoDB
             │                                  │
      Mapping UI  ─────── multipart POST ───────┘
     (source → dest,           + SSE progress
      transform, JSON)
```

## Development Progress

### Week 1 — Streaming Upload & Virtualized Preview

#### Backend — Completed ✅

The backend implements multipart file processing using **Busboy**.

Instead of loading the complete uploaded file into memory, the incoming request is piped into Busboy and the uploaded file stream is passed directly to the CSV parser.

```
Client
   ↓
Multipart Upload
   ↓
Busboy
   ↓
CSV Stream Parser
   ↓
Row-by-Row Processing
```

**Week 1 Backend Features**

* ✅ Express.js backend
* ✅ Busboy multipart file handling
* ✅ Node.js stream-based file processing
* ✅ CSV parsing using `csv-parser`
* ✅ Row-by-row processing
* ✅ Total row counting
* ✅ Avoids loading the complete uploaded file into memory

The `/upload` endpoint uses `req.pipe(bb)` and streams the uploaded file through `csv-parser`.

#### Frontend — Completed ✅

The frontend provides an interactive CSV preview interface.

**Features**

* ✅ CSV file selection
* ✅ Drag-and-drop upload interface
* ✅ CSV parsing using Papa Parse
* ✅ First 1,000 rows stored for preview
* ✅ Processing progress
* ✅ Rows processed counter
* ✅ Processing rate display
* ✅ Column count
* ✅ File size display
* ✅ Malformed row detection
* ✅ Virtualized grid using `react-window`
* ✅ Dynamic column sizing
* ✅ Only visible preview rows are mounted in the DOM
* ✅ Responsive, full-viewport layout
* ✅ Animated StreamWeaver background

The preview buffer is limited to `1000` rows and `react-window` (`FixedSizeList`) virtualizes the displayed rows so only rows in view are ever mounted to the DOM.

### Week 2 — ETL Transformation & Data Mapping

#### Backend — Completed ✅

Week 2 introduces a Node.js `Transform` stream sitting between CSV parsing and the database write step.

```
Uploaded File
     ↓
Busboy
     ↓
CSV Parser
     ↓
CSVTransform (stream.Transform, object mode)
     ↓
Batched bulkWrite
     ↓
MongoDB
```

**Backend Features**

* ✅ Custom `stream.Transform` subclass (`CSVTransform.js`) converting each row to a JSON object on the fly
* ✅ Applies column-mapping rules (source → destination field, optional transform expression) received from the frontend
* ✅ Falls back to identity mapping when no mapping rules are supplied
* ✅ Batches processed rows and writes via `Record.bulkWrite()` instead of one insert per row
* ✅ Mongoose connection (`db.js`) and schema (`models/Record.js`)
* ✅ Live progress (rows processed, % streamed, rows/sec) pushed to the client via Server-Sent Events
* ⚠️ Transform expressions currently run via plain `new Function(...)`, without process isolation — **not yet sandboxed**. Secure execution via `isolated-vm` is planned for Week 3, not yet implemented.

#### Frontend — Completed ✅

A visual interface for mapping source columns to destination fields, plus real integration with the backend above.

```
CSV Columns
     ↓
Mapping Interface
     ↓
Edit Destination Field  +  Optional JS Transform (live preview)
     ↓
Include / Exclude Columns
     ↓
Send Full File to Server (multipart POST + mapping rules header)
     ↓
Live Server-Reported Progress (via SSE)
```

**Features**

* ✅ Grid / Mapping toggle view
* ✅ Every source column listed with an editable, auto-suggested destination field name
* ✅ Optional inline JavaScript transform per column, with a live preview evaluated against a sample row in the browser
* ✅ Per-column include/exclude checkbox, with a running "N of M columns will be sent" count
* ✅ "Copy mapping JSON" — outputs the exact payload shape sent to the backend
* ✅ "Send full file to server" — POSTs the real file as `multipart/form-data` with mapping rules attached as a header, then reads the response as a Server-Sent Events stream (via the Fetch streaming API, since `EventSource` cannot send a POST body or custom headers) to render live, server-reported progress

### Week 1 & Week 2 Status

| Feature                                     |     Week | Status                        |
| -------------------------------------------- | -------: | ------------------------------ |
| Express backend setup                        |   Week 1 | ✅ Completed                    |
| Large-file streaming with Busboy              |   Week 1 | ✅ Completed                    |
| CSV parsing and row-by-row processing         |   Week 1 | ✅ Completed                    |
| CSV upload interface                          |   Week 1 | ✅ Completed                    |
| Preview of the first 1,000 rows               |   Week 1 | ✅ Completed                    |
| Virtual scrolling with `react-window`         |   Week 1 | ✅ Completed                    |
| Processing statistics and progress tracking   |   Week 1 | ✅ Completed                    |
| Malformed-row detection                       |   Week 1 | ✅ Completed                    |
| Node.js Transform streams                     |   Week 2 | ✅ Completed                    |
| Streaming data transformations                |   Week 2 | ✅ Completed                    |
| Visual column mapping                         |   Week 2 | ✅ Completed                    |
| Transformation preview                        |   Week 2 | ✅ Completed                    |
| MongoDB batch operations (`bulkWrite`)        |   Week 2 | ✅ Completed                    |
| Frontend ↔ backend upload wired end to end    |   Week 2 | ✅ Completed                    |
| Live progress via Server-Sent Events          |   Week 2 | ✅ Completed                    |
| Real-data pipeline re-verification            |   Week 2 | 🚧 In Progress *(see Known Issues)* |
| Secure transformation sandbox (`isolated-vm`) | Upcoming | ⏳ Planned — Week 3             |
| WebSocket-based live progress                 | Upcoming | ⏳ Planned — currently SSE, not WebSockets |
| 2GB file memory benchmarking                  | Upcoming | ⏳ Planned — endpoint ready, audit not yet run |

## Known Issues

* **Upload pipeline re-verification in progress.** An earlier version of the upload pipeline completed without error but processed 0 rows regardless of file size. The root cause was traced to `streamweaver-backend/routes/upload.js` — the CSV-parser-to-Transform-stream wiring — and the code has since been revised (explicit header-based row mapping, corrected batch pause/resume targeting the transform stream, added error handling on the CSV parser). This revision has not yet been fully re-tested against a large real-world file with the memory-audit checkpoint, so that audit is currently pending.
* **Transform sandboxing is not yet secure.** User-supplied transform expressions run via `new Function(...)` with no isolation. This is acceptable for the current development stage — real sandboxing via `isolated-vm` is a Week 3 deliverable — but should not be treated as production-safe yet.

## Technology Stack

### Backend

* Node.js 18+
* Express.js
* Busboy
* csv-parser
* Mongoose + MongoDB
* CORS
* Nodemon

### Frontend

* React
* Vite
* Papa Parse
* react-window (`1.8.10`)
* Lucide React

## Project Structure

```
StreamWeaver-Project/
│
├── streamweaver-backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── models/
│   │   └── Record.js
│   ├── routes/
│   │   └── upload.js
│   └── transforms/
│       └── CSVTransform.js
│
├── streamweaver-frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── components/
│   │       └── StreamWeaverPreview.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Installation & Setup

### Prerequisites

* Node.js 18+
* npm
* MongoDB running locally (or update `db.js` to point at your own connection string)
* Modern web browser

### Backend Setup

```
cd streamweaver-backend
npm install
npm run dev
```

The backend runs on:

```
http://localhost:3000
```

For production:

```
npm start
```

### Frontend Setup

Open another terminal:

```
cd streamweaver-frontend
npm install
npm run dev
```

The frontend runs on:

```
http://localhost:5173
```

To create a production build:

```
npm run build
```

To preview the production build:

```
npm run preview
```

## Current Usage

1. **Start MongoDB**, then the backend:
   ```
   cd streamweaver-backend
   npm run dev
   ```
   Confirm `MongoDB connected` and `Server running on http://localhost:3000` both print.

2. **Start the frontend**, in a separate terminal:
   ```
   cd streamweaver-frontend
   npm run dev
   ```

3. **Open the application**: `http://localhost:5173`

4. **Upload a CSV** — the frontend parses it client-side and shows:
   * File size, row count, column count
   * Processing rate
   * Malformed row count
   * First 1,000-row virtualized preview

5. **Switch to the Mapping tab** to edit destination field names and optional per-column JS transforms, with a live preview.

6. **Click "Send full file to server"** to stream the real file through the backend pipeline (Busboy → CSVTransform → MongoDB), with live server-reported progress.

## Performance Approach

StreamWeaver is designed around three techniques.

**Backend Streaming**

```
Large CSV
   ↓
Stream (Busboy)
   ↓
Parser (csv-parser)
   ↓
Transform (CSVTransform)
   ↓
Batched bulkWrite → MongoDB
```

**Frontend Virtualization**

```
1,000 Preview Rows
       ↓
   react-window
       ↓
Only visible rows mounted
```

**Live Feedback Without Blocking**

Progress (both client-side parsing and real server-side ingestion) is streamed incrementally via chunked parsing and Server-Sent Events, rather than the UI blocking until the whole file finishes.

## Upcoming Development

* Full memory benchmarking with a 2GB+ file (`GET /memory` endpoint already implemented, audit pending pipeline re-verification)
* Secure JavaScript transformation sandbox via `isolated-vm`
* WebSocket-based live processing updates (currently SSE)
* Additional file formats
* Advanced data validation
* Transformation rule builder

## Current Project Status

**Week 1: Completed**
Streaming upload and virtualized CSV preview are implemented on both frontend and backend.

**Week 2: Completed**
Node.js Transform streams, visual column mapping, MongoDB batch writes, and end-to-end frontend↔backend wiring are implemented. Final re-verification of the upload pipeline with large real-world files is in progress (see Known Issues).

**Future: Planned**
Secure `isolated-vm` transformation sandboxing, full 2GB memory audit, and WebSocket-based live progress will be implemented in later development stages.

## Project

**StreamWeaver — High-Throughput No-Code ETL Pipeline**

Built to make large-scale data processing accessible without requiring users to write custom scripts.
