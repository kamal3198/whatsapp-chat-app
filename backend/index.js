require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const Message = require("./models/message");
const User = require("./models/user");
const path = require("path");
const fs = require("fs");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/messages", messageRoutes);

// ----- MongoDB -----
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/whatsapp_clone")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ----- Socket.IO -----
const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Map: userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ----- REGISTER USER -----
  socket.on("registerUser", async (userId) => {
    if (!userId) {
      console.log("❌ registerUser called with invalid userId:", userId);
      return;
    }

    onlineUsers.set(userId, socket.id);

    // Update user online status
    await User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() });

    console.log("✅ User registered:", userId, socket.id);
  });

  // ----- SEND MESSAGE -----
  socket.on("sendMessage", async ({ senderId, receiverId, text, fileUrl, fileName, fileType }) => {
    if (!senderId || !receiverId || (!text && !fileUrl)) {
      console.log("❌ Invalid sendMessage payload");
      return;
    }

    try {
      // Save message to DB
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text: text || "",
        fileUrl: fileUrl || "",
        fileName: fileName || "",
        fileType: fileType || "",
      });

      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        // Update status to delivered
        await Message.findByIdAndUpdate(message._id, { status: "delivered" });

        io.to(receiverSocket).emit("receiveMessage", {
          _id: message._id,
          senderId,
          receiverId,
          text: message.text,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileType: message.fileType,
          timestamp: message.timestamp,
          status: "delivered"
        });
      } else {
        console.log("⚠️ Receiver not online:", receiverId);
      }

      // Emit back to sender
      socket.emit("messageSent", {
        _id: message._id,
        senderId,
        receiverId,
        text: message.text,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        timestamp: message.timestamp,
        status: receiverSocket ? "delivered" : "sent"
      });

    } catch (err) {
      console.log("❌ Error sending message:", err);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });

  // ----- DISCONNECT -----
  socket.on("disconnect", async () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        // Update user offline status
        await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
        console.log("🧹 User removed:", userId);
      }
    }
    console.log("🔌 Socket disconnected:", socket.id);
  });

  // ----- TYPING -----
  socket.on("typing", ({ senderId, receiverId, isTyping }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("userTyping", { senderId, isTyping });
    }
  });

  // ----- MARK AS READ -----
  socket.on("markAsRead", async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, status: { $ne: "read" } },
        { status: "read" }
      );
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) {
        io.to(senderSocket).emit("messagesRead", { readerId: receiverId });
      }
    } catch (err) {
      console.log("❌ Error marking as read:", err);
    }
  });
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
