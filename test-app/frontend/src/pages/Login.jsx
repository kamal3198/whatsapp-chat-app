import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:5001/auth/login", { username, password });
      localStorage.setItem("token", res.data.token);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 400,
      margin: "50px auto",
      fontFamily: "Arial, sans-serif"
    }}>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        placeholder="username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "10px 0", border: "1px solid #ccc", borderRadius: 4 }}
      /><br/>
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "10px 0", border: "1px solid #ccc", borderRadius: 4 }}
      /><br/>
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: "100%",
          padding: 10,
          margin: "10px 0",
          background: "#008069",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
      <p>Don't have an account? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Signup</a></p>
    </div>
  );
}
