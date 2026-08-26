const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

module.exports = mongoose.model("Record", recordSchema);
