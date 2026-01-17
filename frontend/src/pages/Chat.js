import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "./Chat.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "emoji-picker-element";

export default function Chat() {
  // ----- STATE -----
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userTyping, setUserTyping] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ----- SOCKET REF -----
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ----- LOGGED-IN USER -----
  const token = localStorage.getItem("token");
  const user = token ? jwtDecode(token) : null;
  const navigate = useNavigate();

  // ----- FETCH USERS -----
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/users", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.log("Error fetching users:", err);
      }
    };

    if (token) fetchUsers();
  }, [token]);

  // ----- INIT SOCKET -----
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current = socket;
    console.log("Socket connected:", socket.id);

    return () => {
      socket.disconnect();
      console.log("Socket disconnected:", socket.id);
    };
  }, []);

  // ----- REGISTER USER -----
  useEffect(() => {
    if (!socketRef.current || !user?.id) return;

    socketRef.current.emit("registerUser", user.id);
    console.log("Registering user:", user.id);
  }, [user]);

  // ----- LOAD MESSAGES -----
  const loadMessages = async (otherUserId) => {
    try {
      const res = await axios.get(`http://localhost:5000/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.log("Error loading messages:", err);
    }
  };

  // ----- SELECT USER -----
  const handleUserSelect = async (user) => {
    setActiveUser(user);
    setMessages([]);
    setUserTyping(null);

    await loadMessages(user._id);

    // Mark messages as read
    if (socketRef.current) {
      socketRef.current.emit("markAsRead", {
        senderId: user._id,
        receiverId: user.id
      });
    }
  };

  // ----- RECEIVE MESSAGE -----
  useEffect(() => {
    if (!socketRef.current || !user?.id) return;

    const handler = (data) => {
      const { senderId, receiverId, text, timestamp, status } = data;

      // Only add to messages if it belongs to the active chat
      if (activeUser && (senderId === activeUser._id || receiverId === activeUser._id)) {
        const newMessage = {
          _id: data._id,
          sender: senderId,
          receiver: receiverId,
          text,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          timestamp,
          status
        };
        setMessages(prev => [...prev, newMessage]);
      }

      // If message is for current chat, mark as read
      if (activeUser && senderId === activeUser._id) {
        socketRef.current.emit("markAsRead", {
          senderId: activeUser._id,
          receiverId: user.id
        });
      }
    };

    socketRef.current.on("receiveMessage", handler);

    return () => {
      socketRef.current.off("receiveMessage", handler);
    };
  }, [user, activeUser]);

  // ----- MESSAGE SENT -----
  useEffect(() => {
    if (!socketRef.current) return;

    const handler = (data) => {
      // Update the sending message with real _id and status
      setMessages(prev => prev.map(msg =>
        msg.status === "sending" && msg.sender === user.id && msg.receiver === activeUser?._id
          ? { ...msg, _id: data._id, status: data.status }
          : msg
      ));
    };

    socketRef.current.on("messageSent", handler);

    return () => {
      socketRef.current.off("messageSent", handler);
    };
  }, [user, activeUser]);

  // ----- TYPING -----
  useEffect(() => {
    if (!socketRef.current) return;

    const handler = ({ senderId, isTyping }) => {
      if (activeUser && senderId === activeUser._id) {
        setUserTyping(isTyping ? activeUser.username : null);
      }
    };

    socketRef.current.on("userTyping", handler);

    return () => {
      socketRef.current.off("userTyping", handler);
    };
  }, [activeUser]);

  // ----- MESSAGES READ -----
  useEffect(() => {
    if (!socketRef.current) return;

    const handler = ({ readerId }) => {
      // Update all messages to this reader as read
      setMessages(prev => prev.map(msg =>
        msg.receiver === readerId ? { ...msg, status: "read" } : msg
      ));
    };

    socketRef.current.on("messagesRead", handler);

    return () => {
      socketRef.current.off("messagesRead", handler);
    };
  }, []);

  // ----- SEND MESSAGE -----
  const handleSend = () => {
    if (!text.trim() || !activeUser || !socketRef.current || !user?.id) return;

    const messageData = {
      senderId: user.id,
      receiverId: activeUser._id.toString(),
      text: text.trim(),
    };

    // Add to local state immediately
    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      sender: user.id,
      receiver: activeUser._id,
      text: text.trim(),
      timestamp: new Date(),
      status: "sending"
    };

    setMessages(prev => [...prev, tempMessage]);

    // Send to backend
    socketRef.current.emit("sendMessage", messageData);

    setText("");
    setShowEmojiPicker(false);
  };

  // ----- FILE UPLOAD -----
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUser || !token) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiverId", activeUser._id);
    formData.append("text", `Sent a file: ${file.name}`);

    try {
      const res = await axios.post("http://localhost:5000/messages/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const newMessage = res.data;
      // Add real ID sender/receiver mapping for consistency
      const formattedMsg = {
        ...newMessage,
        sender: newMessage.sender._id || newMessage.sender,
        receiver: newMessage.receiver._id || newMessage.receiver
      };
      
      setMessages((prev) => [...prev, formattedMsg]);

      // Notify recipient via socket
      socketRef.current.emit("sendMessage", {
        senderId: user.id,
        receiverId: activeUser._id,
        text: formattedMsg.text,
        fileUrl: formattedMsg.fileUrl,
        fileName: formattedMsg.fileName,
        fileType: formattedMsg.fileType,
      });
    } catch (err) {
      console.log("File upload error:", err);
      alert("Failed to upload file");
    }
  };

  // ----- TYPING INDICATOR -----
  const handleTyping = () => {
    if (!socketRef.current || !activeUser) return;

    socketRef.current.emit("typing", {
      senderId: user.id,
      receiverId: activeUser._id,
      isTyping: true
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("typing", {
        senderId: user.id,
        receiverId: activeUser._id,
        isTyping: false
      });
    }, 1000);
  };

  // ----- LOGOUT -----
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ----- EMOJI PICKER -----
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelect = (event) => {
    const emoji = event.detail.unicode;
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (showEmojiPicker) {
      // Small delay to ensure the emoji picker is rendered
      const timeoutId = setTimeout(() => {
        const picker = document.querySelector('emoji-picker');
        if (picker) {
          picker.addEventListener('emoji-click', handleEmojiSelect);
          return () => picker.removeEventListener('emoji-click', handleEmojiSelect);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [showEmojiPicker]);

  // ----- SCROLL TO BOTTOM -----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----- FORMAT TIME -----
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="chat-container">
      {/* ----- SIDEBAR ----- */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-title">Chats</div>
          <button onClick={handleLogout} style={{
            background: "none",
            border: "none",
            color: "#54656f",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}>Logout</button>
        </div>

        <div className="sidebar-users">
          {users
            .filter((u) => u._id !== user?.id)
            .map((u) => (
              <div
                key={u._id}
                className={`user-item ${activeUser?._id === u._id ? "active" : ""}`}
                onClick={() => handleUserSelect(u)}
              >
                <div className="user-main-info">
                  <span className="user-name">{u.username}</span>
                  <span 
                    className="online-indicator"
                    style={{ background: u.online ? "#1fa855" : "#aebac1" }}
                  ></span>
                </div>
                {!u.online && u.lastSeen && (
                  <small style={{ color: "#667781", fontSize: "12px" }}>
                    Last seen {new Date(u.lastSeen).toLocaleDateString()}
                  </small>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* ----- CHAT WINDOW ----- */}
      <div className="chat-window">
        <div className="chat-header">
          {activeUser ? (
            <div className="chat-header-info">
              <div className="chat-header-name">{activeUser.username}</div>
              <div className="chat-header-status">
                {activeUser.online ? "online" : 
                  `last seen ${activeUser.lastSeen ? new Date(activeUser.lastSeen).toLocaleString() : "never"}`}
              </div>
            </div>
          ) : <div className="chat-header-name">Select a user</div>}
        </div>

        <div className="chat-messages">
          {activeUser ? (
            messages.length > 0 ? (
      messages.map((msg) => {
                const senderId = msg.sender?._id || msg.sender;
                const isMe = String(senderId) === String(user.id);
                return (
                  <div
                    key={msg._id}
                    className={`message ${isMe ? "sent" : "received"}`}
                  >
                    <div className="message-content">
                      {msg.fileUrl ? (
                        <a href={`http://localhost:5000${msg.fileUrl}`} target="_blank" rel="noreferrer" className="file-message">
                          <div className="file-info">
                            <span className="file-icon">📄</span>
                            <span>{msg.fileName || "File"}</span>
                          </div>
                          {msg.text && <div style={{marginTop: 8}}>{msg.text}</div>}
                        </a>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <div className="message-info">
                      <span>{formatTime(msg.timestamp)}</span>
                      {isMe && (
                        <span style={{ color: msg.status === "read" ? "#53bdeb" : "inherit" }}>
                          {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 20, opacity: 0.5, textAlign: "center" }}>
                No messages yet. Say Hi 👋
              </div>
            )
          ) : (
            <div style={{ padding: 20, opacity: 0.5, textAlign: "center" }}>
              Select a chat to start messaging
            </div>
          )}
          {userTyping && (
            <div style={{ padding: 10, opacity: 0.5, fontStyle: "italic" }}>
              {userTyping} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <button className="emoji-button" onClick={toggleEmojiPicker} disabled={!activeUser}>
            😀
          </button>
          <label className="file-button">
            📎
            <input type="file" style={{ display: "none" }} onChange={handleFileChange} disabled={!activeUser} />
          </label>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={!activeUser}
            placeholder={activeUser ? "Type a message..." : "Select a chat first"}
          />
          <button className="send-button" onClick={handleSend} disabled={!activeUser || !text.trim()}>
            <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <emoji-picker></emoji-picker>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
