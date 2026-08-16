StreamWeaver: High-Throughput No-Code ETL Pipeline

![StreamWeaver](https://img.shields.io/badge/StreamWeaver-v1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18.2+-blue)
![Vite](https://img.shields.io/badge/Vite-4.4+-purple)

. Project Overview

"StreamWeaver" is a high-throughput, no-code ETL pipeline designed to process large CSV datasets efficiently without requiring users to write code.

The project focuses on:

* Memory-efficient data processing
* Streaming large file uploads
* Real-time processing statistics
* Virtualized data preview
* Data transformation and mapping
* Scalable backend processing

The development is being completed incrementally through a week-wise implementation plan.


. Problem Statement

Uploading and processing massive datasets such as multi-GB CSV files can cause browser freezing or Node.js heap memory issues when the entire file is loaded into memory.

StreamWeaver aims to solve this problem by using **stream-based processing** and **virtualized visualization**, allowing users to work with large datasets without loading the entire file into memory at once.



. Current Architecture


                    StreamWeaver
                         │
          ┌──────────────┴──────────────┐
          │                             │
      Frontend                       Backend
     React + Vite                Node.js + Express
          │                             │
      Papa Parse                     Busboy
          │                             │
   1,000-row Preview               CSV Parser
          │                             │
   react-window                 Streaming Processing
          │
   Virtualized Grid


. Development Progress

# Week 1 — Streaming Upload & Virtualized Preview

. Backend — Completed ✅

The backend implements multipart file processing using **Busboy**.

Instead of loading the complete uploaded file into memory, the incoming request is piped into Busboy and the uploaded file stream is passed directly to the CSV parser.


Client
   ↓
Multipart Upload
   ↓
Busboy
   ↓
CSV Stream Parser
   ↓
Row-by-Row Processing


# Week 1 Backend Features

* ✅ Express.js backend
* ✅ Busboy multipart file handling
* ✅ Node.js stream-based file processing
* ✅ CSV parsing using `csv-parser`
* ✅ Row-by-row processing
* ✅ Total row counting
* ✅ Avoids loading the complete uploaded file into memory

The current `/upload` endpoint uses `req.pipe(bb)` and streams the uploaded file through `csv-parser`.



# Week 1 — Frontend — Completed ✅

The frontend provides an interactive CSV preview interface.

# Features

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
* ✅ Responsive preview area
* ✅ Animated StreamWeaver background

The current implementation limits the preview buffer to `1000` rows and uses `react-window` to virtualize the displayed rows.



#  Week 2 — ETL Transformation & Data Mapping

# Week 2 Objective

The goal of Week 2 is to move from simple streaming/preview functionality toward an actual "ETL transformation workflow".

### Backend — Planned / In Progress 

Week 2 backend development will introduce Node.js Transform streams.

The intended pipeline is:


Uploaded File
     ↓
Busboy
     ↓
CSV Parser
     ↓
Transform Stream
     ↓
Processed Data


# Planned Backend Features

1. Node.js `Transform` stream
2. Process rows without storing the complete dataset
3. Apply transformation rules while streaming
4. Support field-level transformations
5. Prepare transformed records for database insertion
6. Maintain low memory usage during transformation



# Week 2 — Frontend Mapping UI

The Week 2 frontend will provide a visual interface for mapping source columns to destination columns.

# Planned Workflow


CSV Columns
     ↓
Mapping Interface
     ↓
Select Source Column
     ↓
Select Destination Column
     ↓
Apply Transformation
     ↓
Preview Result


# Planned Features

1. Display uploaded CSV columns
2. Source-column selection
3. Destination-column selection
4. Visual column mapping
5. Mapping validation
6. Transformation preview
7. Prepare mapping rules for backend processing


# Week 1 & Week 2 Status

| Feature                                     |     Week | Status         |
| ------------------------------------------- | -------: | -------------- |
| Express backend setup                       |   Week 1 | ✅ Completed    |
| Large-file streaming with Busboy            |   Week 1 | ✅ Completed    |
| CSV parsing and row-by-row processing       |   Week 1 | ✅ Completed    |
| CSV upload interface                        |   Week 1 | ✅ Completed    |
| Preview of the first 1,000 rows             |   Week 1 | ✅ Completed    |
| Virtual scrolling with React                |   Week 1 | ✅ Completed    |
| Processing statistics and progress tracking |   Week 1 | ✅ Completed    |
| Malformed-row detection                     |   Week 1 | ✅ Completed    |
| Node.js Transform streams                   |   Week 2 | 🚧 In Progress |
| Streaming data transformations              |   Week 2 | 🚧 In Progress |
| Visual column mapping                       |   Week 2 | 🚧 In Progress |
| Transformation preview                      |   Week 2 | 🚧 In Progress |
| MongoDB batch operations (`bulkWrite`)      | Upcoming | ⏳ Planned      |
| Secure transformation sandbox               | Upcoming | ⏳ Planned      |
| WebSocket-based live progress               | Upcoming | ⏳ Planned      |




# Technology Stack

# Backend

* Node.js 18+
* Express.js
* Busboy
* csv-parser
* Nodemon

The current backend dependencies include Express, Busboy, csv-parser, CORS and Nodemon.

# Frontend

* React
* Vite
* Papa Parse
* react-window
* Lucide React



# Project Structure


StreamWeaver-Project/
│
├── streamweaver-backend/
│   ├── server.js
│   ├── package.json
│   └── routes/
│       └── upload.js
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


# Installation & Setup

# Prerequisites

* Node.js 18+
* npm
* Modern web browser


# Backend Setup

cd streamweaver-backend
npm install
npm run dev


The backend runs on:

http://localhost:3000


For production:

npm start


# Frontend Setup

Open another terminal:

cd streamweaver-frontend
npm install
npm run dev


The frontend runs on:

http://localhost:5173


To create a production build:

npm run build


To preview the production build:

npm run preview


#  Current Usage

1. Start the backend

cd streamweaver-backend
npm run dev


2. Start the frontend

cd streamweaver-frontend
npm run dev


3. Open the application

http://localhost:5173


4. Upload a CSV

The current frontend accepts CSV files and provides:

* File size
* Number of rows processed
* Processing rate
* Number of columns
* Malformed row count
* First 1,000-row preview
* Virtualized scrolling



#  Performance Approach

StreamWeaver is designed around two important techniques.

# Backend Streaming

Large files are processed through Node.js streams instead of loading the entire file into memory.


Large CSV
   ↓
Stream
   ↓
Parser
   ↓
Individual Rows


# Frontend Virtualization

The frontend does not render every preview row into the DOM.

Instead:


1,000 Preview Rows
       ↓
   react-window
       ↓
Only visible rows mounted


This keeps the interface responsive while scrolling through the preview.



# Upcoming Development

After Week 2, planned improvements include:

* MongoDB batch insertion using `bulkWrite`
* Secure JavaScript transformation sandbox
* WebSocket-based live processing updates
* Additional file formats
* Advanced data validation
* Transformation rule builder
* Large-file memory benchmarking
* Database integration



# Current Project Status

Week 1: Completed

Streaming upload and virtualized CSV preview are implemented.

Week 2: In Progress

The next development stage focuses on Node.js Transform streams and a visual column-mapping interface.

Future: Planned

MongoDB bulk operations, secure transformation execution and WebSocket-based live progress will be implemented in later development stages.



# Project

"StreamWeaver — High-Throughput No-Code ETL Pipeline"

Built to make large-scale data processing accessible without requiring users to write custom scripts.
