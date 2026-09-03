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
* End-to-end frontend-to-backend processing

The project is being developed incrementally through a week-wise implementation plan.

---

## Problem Statement

Uploading and processing massive datasets such as multi-GB CSV files can cause browser freezing or Node.js heap memory issues when the entire file is loaded into memory.

StreamWeaver addresses this problem using **stream-based processing**:

* The frontend parses CSV files incrementally.
* Only the first 1,000 rows are retained for browser preview.
* `react-window` virtualizes the preview table.
* The backend streams uploaded files through Busboy and CSV parsing.
* Transformation is performed through Node.js streams.
* Records are written to MongoDB in batches.

The goal is to process large datasets without loading the entire file into memory on either side.

---

# Current Architecture

```text
                         StreamWeaver
                              │
              ┌───────────────┴───────────────┐
              │                               │
          Frontend                         Backend
        React + Vite                  Node.js + Express
              │                               │
          Papa Parse                       Busboy
              │                               │
      1,000-row Preview                  CSV Parser
              │                               │
        react-window                 CSVTransform
              │                      (stream.Transform)
              │                               │
      Virtualized Grid                Batched bulkWrite
              │                               │
       Mapping UI  ───── multipart POST ──────┘
      source → destination       │
      transform + JSON           │
                                 ↓
                              MongoDB
                                 │
                                 ↓
                       Live Progress Updates
```

---

# Development Progress

## Week 1 — Streaming Upload & Virtualized Preview

### Backend — Completed ✅

The backend implements multipart file processing using **Busboy**.

Instead of loading the complete uploaded file into memory, the incoming request is streamed through Busboy and passed to the CSV parser.

```text
Client
   ↓
Multipart Upload
   ↓
Busboy
   ↓
CSV Stream Parser
   ↓
Row-by-Row Processing
   ↓
Batch Processing
```

### Week 1 Backend Features

* ✅ Express.js backend
* ✅ Busboy multipart file handling
* ✅ Node.js stream-based file processing
* ✅ CSV parsing using `csv-parser`
* ✅ Row-by-row processing
* ✅ Total row counting
* ✅ CSV parser error handling
* ✅ Header-based column mapping
* ✅ Batch pause/resume flow control
* ✅ Avoids loading the complete uploaded file into memory

The `/upload` endpoint uses a streaming request pipeline rather than reading the complete uploaded file into a single buffer.

### Frontend — Completed ✅

The frontend provides an interactive CSV preview interface.

### Features

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
* ✅ Only visible preview rows mounted in the DOM
* ✅ Responsive full-viewport layout
* ✅ Animated StreamWeaver background

The frontend limits the preview buffer to **1,000 rows**, while `react-window` ensures that only the rows required for the visible viewport are mounted in the DOM.

---

# Week 2 — ETL Transformation & Data Mapping

## Backend — Completed ✅

Week 2 introduces a Node.js `Transform` stream between CSV parsing and database writing.

```text
Uploaded File
     ↓
  Busboy
     ↓
 CSV Parser
     ↓
CSVTransform
(stream.Transform)
     ↓
Batched bulkWrite
     ↓
 MongoDB
```

### Backend Features

* ✅ Custom `stream.Transform` implementation
* ✅ Converts CSV rows to JSON objects on the fly
* ✅ Applies column-mapping rules
* ✅ Supports source → destination field mapping
* ✅ Supports optional transformation expressions
* ✅ Identity mapping fallback
* ✅ Batched MongoDB writes using `bulkWrite`
* ✅ Mongoose connection
* ✅ MongoDB `Record` model
* ✅ Processing progress reporting
* ✅ Rows processed tracking
* ✅ Processing rate tracking

### Frontend — Completed ✅

The frontend provides a visual mapping interface.

```text
CSV Columns
     ↓
Mapping Interface
     ↓
Destination Field
     +
Optional JS Transform
     ↓
Include / Exclude Columns
     ↓
Mapping JSON
     ↓
Full File Upload
```

### Features

* ✅ Grid / Mapping toggle
* ✅ Source columns displayed
* ✅ Auto-suggested destination field names
* ✅ Editable destination fields
* ✅ Optional JavaScript transformations
* ✅ Live transformation preview
* ✅ Include/exclude columns
* ✅ Running selected-column count
* ✅ Copy mapping JSON
* ✅ Full-file upload to backend

---

# Week 3 — Transformation Preview & Pipeline Integration

## Frontend — Completed ✅

Week 3 focuses on making the transformation workflow more interactive and usable.

### Transformation Features

* ✅ Per-column transformation expressions
* ✅ Live preview using a sample row
* ✅ Error handling for invalid expressions
* ✅ Destination field editing
* ✅ Column inclusion/exclusion
* ✅ Mapping payload generation
* ✅ Mapping JSON copy functionality

Example transformation:

```javascript
value.toUpperCase()
```

The interface evaluates the expression against a sample value for preview purposes.

Invalid expressions are caught and displayed as preview errors instead of breaking the application.

### Mapping Payload

The frontend generates a structured mapping payload similar to:

```json
[
  {
    "source": "first_name",
    "sourceIndex": 0,
    "destination": "first_name",
    "transform": "value.toUpperCase()"
  }
]
```

Only columns selected by the user are included in the final mapping payload.

### Backend Integration

The mapping rules are sent together with the actual CSV file during the full upload request.

The backend can then apply the mapping and transformation rules while streaming the file instead of first loading the complete dataset.

---

# Week 4 — Full-File Streaming & MongoDB Integration

## Status — Completed ✅

Week 4 connects the complete frontend workflow with the backend ingestion pipeline.

The application now supports the complete flow:

```text
CSV File
   ↓
Frontend Streaming Preview
   ↓
User Mapping
   ↓
Transformation Rules
   ↓
Send Full File
   ↓
Multipart POST
   ↓
Busboy
   ↓
CSV Parser
   ↓
CSVTransform
   ↓
MongoDB bulkWrite
   ↓
Live Progress
   ↓
Upload Complete
```

## Frontend — Completed ✅

The Mapping interface contains a **Send full file to server** action.

When triggered:

1. The original uploaded `File` object is retrieved.
2. A `FormData` object is created.
3. The full CSV file is attached to the request.
4. Mapping rules are attached to the request.
5. The request is sent to the backend `/upload` endpoint.
6. The frontend reads the streaming response.
7. Progress information is displayed while the server processes the file.
8. The UI displays the final MongoDB write result.

### Week 4 Frontend Features

* ✅ Full CSV file upload
* ✅ Multipart/form-data request
* ✅ Mapping rules sent with upload
* ✅ Server-side processing status
* ✅ Streaming response handling
* ✅ Upload progress
* ✅ Rows inserted counter
* ✅ Rows/second rate
* ✅ Error state
* ✅ Upload completion state
* ✅ MongoDB bulk-write completion message

The frontend upload endpoint is:

```text
http://localhost:3000/upload
```

## Backend — Completed ✅

The backend is designed to process the complete CSV through a streaming pipeline:

```text
HTTP Request
     ↓
   Busboy
     ↓
CSV Parser
     ↓
CSVTransform
     ↓
Batch Buffer
     ↓
MongoDB bulkWrite
```

The full dataset does not need to be loaded into memory before processing begins.

### MongoDB Integration

Records are written in batches using MongoDB/Mongoose `bulkWrite()` operations rather than performing an individual database operation for every row.

This reduces database overhead and allows large datasets to be processed more efficiently.

### Live Processing Feedback

The frontend displays server-reported processing information including:

* Percentage streamed
* Rows inserted
* Rows per second
* Upload state
* Completion status
* Server errors

---

# Week 1–4 Status

| Feature                               |   Week | Status      |
| ------------------------------------- | -----: | ----------- |
| Express backend setup                 | Week 1 | ✅ Completed |
| Busboy multipart upload               | Week 1 | ✅ Completed |
| Large-file streaming                  | Week 1 | ✅ Completed |
| CSV parsing                           | Week 1 | ✅ Completed |
| Row-by-row processing                 | Week 1 | ✅ Completed |
| CSV upload interface                  | Week 1 | ✅ Completed |
| Drag-and-drop upload                  | Week 1 | ✅ Completed |
| First 1,000-row preview               | Week 1 | ✅ Completed |
| Virtual scrolling with `react-window` | Week 1 | ✅ Completed |
| Processing statistics                 | Week 1 | ✅ Completed |
| Malformed-row detection               | Week 1 | ✅ Completed |
| Dynamic column sizing                 | Week 1 | ✅ Completed |
| Node.js Transform streams             | Week 2 | ✅ Completed |
| Streaming transformations             | Week 2 | ✅ Completed |
| Visual column mapping                 | Week 2 | ✅ Completed |
| Destination field editing             | Week 2 | ✅ Completed |
| Include/exclude columns               | Week 2 | ✅ Completed |
| Transformation preview                | Week 3 | ✅ Completed |
| Mapping JSON generation               | Week 3 | ✅ Completed |
| Full-file upload                      | Week 4 | ✅ Completed |
| MongoDB batch operations              | Week 4 | ✅ Completed |
| Frontend ↔ backend integration        | Week 4 | ✅ Completed |
| Server processing progress            | Week 4 | ✅ Completed |
| Upload completion/error states        | Week 4 | ✅ Completed |

---

# Known Limitations

### Transformation Security

User-supplied JavaScript transformation expressions currently use JavaScript function evaluation for the browser-side preview.

For example:

```javascript
value.toUpperCase()
```

This preview mechanism should **not** be considered a secure sandbox for executing arbitrary untrusted code.

A production implementation should use an isolated execution environment such as `isolated-vm` or another properly sandboxed transformation engine.

### Large-File Benchmarking

The application is designed for large CSV files, but a formal memory benchmark using a 2GB+ dataset should be performed before claiming a specific production performance guarantee.

### SSE vs WebSockets

The current implementation uses streaming HTTP/SSE-style progress handling rather than WebSockets.

WebSockets can be considered as a future enhancement if bidirectional real-time communication becomes necessary.

---

# Technology Stack

## Backend

* Node.js 18+
* Express.js
* Busboy
* csv-parser
* Mongoose
* MongoDB
* CORS
* Nodemon

## Frontend

* React
* Vite
* Papa Parse
* react-window `1.8.10`
* Lucide React

---

# Project Structure

```text
StreamWeaver-Project/
│
├── streamweaver-backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   │
│   ├── models/
│   │   └── Record.js
│   │
│   ├── routes/
│   │   └── upload.js
│   │
│   └── transforms/
│       └── CSVTransform.js
│
├── streamweaver-frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   │
│   │   └── components/
│   │       └── StreamWeaverPreview.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Installation & Setup

## Prerequisites

* Node.js 18+
* npm
* MongoDB running locally or an accessible MongoDB connection
* Modern web browser

---

## Backend Setup

Open a terminal:

```bash
cd streamweaver-backend
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:3000
```

For production:

```bash
npm start
```

---

## Frontend Setup

Open another terminal:

```bash
cd streamweaver-frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

# Current Usage

### 1. Start MongoDB

Make sure MongoDB is running.

### 2. Start the backend

```bash
cd streamweaver-backend
npm run dev
```

Confirm that the backend starts successfully on:

```text
http://localhost:3000
```

### 3. Start the frontend

In another terminal:

```bash
cd streamweaver-frontend
npm run dev
```

### 4. Open the application

Open:

```text
http://localhost:5173
```

### 5. Upload a CSV

Drag and drop a CSV file or use **Browse files**.

The application displays:

* File size
* Row count
* Column count
* Processing percentage
* Processing rate
* Malformed row count
* First 1,000 rows

### 6. Open Mapping

Switch from **Grid** to **Mapping**.

You can:

* Change destination field names
* Include/exclude columns
* Add optional transformations
* Preview transformations
* Copy mapping JSON

### 7. Send the Full File

Click:

```text
Send full file to server
```

The complete file is then sent through:

```text
Busboy
   ↓
CSV Parser
   ↓
CSVTransform
   ↓
MongoDB bulkWrite
```

The interface displays live processing information until the upload is complete.

---

# Performance Approach

StreamWeaver uses three main techniques to handle large datasets.

## 1. Backend Streaming

```text
Large CSV
   ↓
Busboy Stream
   ↓
CSV Parser
   ↓
CSVTransform
   ↓
Batch Processing
   ↓
MongoDB bulkWrite
```

The backend processes records incrementally instead of loading the complete CSV into memory.

---

## 2. Frontend Preview Limiting

```text
Large CSV
   ↓
Papa Parse
   ↓
First 1,000 Rows
   ↓
react-window
   ↓
Virtualized Grid
   ↓
Only Visible Rows Mounted
```

The browser keeps the preview limited to 1,000 rows.

`react-window` then virtualizes those rows so that only the currently required rows are mounted in the DOM.

---

## 3. Streaming Progress

Processing feedback is updated incrementally instead of waiting for the complete dataset to finish.

The UI can display:

```text
Percentage
Rows Processed
Rows/Second
Upload State
Completion/Error
```

This provides continuous feedback while a large file is being processed.

---

# Week 1–4 Overall Status

## Week 1 — Completed ✅

Streaming upload, CSV parsing, drag-and-drop upload, 1,000-row preview, processing statistics, malformed-row detection, and virtualized rendering are implemented.

## Week 2 — Completed ✅

Node.js Transform processing, column mapping, destination fields, include/exclude functionality, MongoDB batch writing, and frontend/backend integration are implemented.

## Week 3 — Completed ✅

Transformation preview, mapping payload generation, optional JavaScript transformations, and interactive mapping functionality are implemented.

## Week 4 — Completed ✅

Full-file streaming from the frontend to the backend, mapping-rule transmission, backend processing, MongoDB batch ingestion, streaming progress updates, and upload completion/error states are implemented.

---

# Future Development

The following features can be added after Week 4:

* Secure JavaScript transformation sandbox
* Formal 2GB+ memory benchmarking
* WebSocket-based live updates
* Additional file formats
* Advanced data validation
* Transformation rule builder
* Data-quality reporting
* Authentication and authorization
* Production deployment
* Improved error recovery and retry handling

---

# Project Status

**StreamWeaver — Week 1 through Week 4 completed ✅**

The current implementation provides an end-to-end no-code CSV ETL workflow:

```text
Upload
  ↓
Stream
  ↓
Preview
  ↓
Virtualize
  ↓
Map
  ↓
Transform
  ↓
Send Full File
  ↓
Process on Server
  ↓
Batch Write
  ↓
MongoDB
  ↓
Live Progress
  ↓
Complete
```

StreamWeaver is designed to make large-scale CSV processing accessible without requiring users to write custom ETL scripts.
