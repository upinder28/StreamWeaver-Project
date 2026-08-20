const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const uploadRoute = require("./routes/upload");

const app = express();

connectDB();

app.use(cors({ origin: "http://localhost:5173" }));
app.use("/upload", uploadRoute);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
