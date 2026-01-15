const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  avatar: { type: String, default: "" },
  lastSeen: { type: Date, default: Date.now },
  online: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", UserSchema);
