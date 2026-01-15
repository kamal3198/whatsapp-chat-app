import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "./Chat.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export default function Chat() {
  // ----- STATE -----
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userTyping, setUserTyping] = useState(null);

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
      const newMessage = {
        _id: data._id,
        sender: senderId,
        receiver: receiverId,
        text,
        timestamp,
        status
      };

      setMessages(prev => [...prev, newMessage]);

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
          Chats
          <button onClick={handleLogout} style={{
            float: "right",
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: "14px"
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{u.username}</span>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: u.online ? "#4CAF50" : "#ccc"
                  }}></span>
                </div>
                {!u.online && u.lastSeen && (
                  <small style={{ color: "#666", fontSize: "12px" }}>
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
            <div>
              {activeUser.username}
              {activeUser.online ? (
                <span style={{ color: "#4CAF50", marginLeft: 10 }}>Online</span>
              ) : (
                <span style={{ color: "#666", marginLeft: 10 }}>
                  Last seen {activeUser.lastSeen ? new Date(activeUser.lastSeen).toLocaleString() : "never"}
                </span>
              )}
            </div>
          ) : "Select a user"}
        </div>

        <div className="chat-messages">
          {activeUser ? (
            messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`message ${msg.sender === user.id ? "sent" : "received"}`}
                >
                  <div>{msg.text}</div>
                  <small style={{ fontSize: "11px", opacity: 0.7, marginTop: 2 }}>
                    {formatTime(msg.timestamp)}
                    {msg.sender === user.id && (
                      <span style={{ marginLeft: 5 }}>
                        {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓" : ""}
                      </span>
                    )}
                  </small>
                </div>
              ))
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
          <button onClick={handleSend} disabled={!activeUser || !text.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
