const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullName: { type: String },
    email: { type: String, unique: true, lowercase: true },
    password: { type: String },
    refreshToken: { type: String, default: null },
    createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
