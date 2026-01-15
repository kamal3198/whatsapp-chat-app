import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !password) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post("http://localhost:5000/auth/register", { username, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
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
      <h2>Signup</h2>
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
        onClick={handleSignup}
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
        {loading ? "Signing up..." : "Signup"}
      </button>
      <p>Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Login</a></p>
    </div>
  );
}
