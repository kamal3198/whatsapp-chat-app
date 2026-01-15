const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, "secret123");
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get messages between two users
router.get("/:otherUserId", verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).populate("sender", "username").sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put("/read/:otherUserId", verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.userId;

    await Message.updateMany(
      { sender: otherUserId, receiver: userId, status: { $ne: "read" } },
      { status: "read" }
    );

    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
