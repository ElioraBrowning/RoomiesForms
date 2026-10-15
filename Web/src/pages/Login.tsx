import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import "../index.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email);
      navigate("/dashboard");
    } catch {
      setError(
        "Couldn't reach the server. Make sure the backend is running on port 5000.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Backdrop: SELU green bracketed by the brand stripe, top and bottom. */}
      <div className="login-backdrop" aria-hidden="true">
        <div className="stripe" />
        <div className="login-backdrop-fill" />
        <div className="stripe" />
      </div>

      <div className="login-theme-toggle">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      <div className="login-container">
        <h1 className="login-app-title">Roomie&rsquo;s Forms</h1>

        <div className="login-panel">
          <div className="login-hero">
            <img
              className="login-hero-seal"
              src="/brand/selu-logo-white.png"
              alt="Southeastern Louisiana University"
              width={900}
              height={218}
            />
            <div className="login-mascot-wrapper">
              <img
                className="login-mascot"
                src="/brand/lion-192.webp"
                srcSet="/brand/lion-192.webp 1x, /brand/lion-420.webp 2x"
                alt="Roomie the Lion Mascot"
                width={192}
                height={224}
              />
            </div>
            <p className="login-hero-copy">
              Every form in one place. Draft and submit responses, then watch them
              move through the review process.
            </p>
          </div>

          <div className="login-form-side">
            <div className="login-form-header">
              <h2 className="login-title">Sign in</h2>
              <p className="login-sub">
                Use your Southeastern email. No password needed while we're
                testing.
              </p>
            </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Southeastern email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@selu.edu"
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={error ? true : undefined}
              />
            </div>

            {error && (
              <p className="login-error" id="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-card)" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.82rem", color: "var(--text-help)", fontWeight: 600 }}>
              Quick test accounts:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", padding: "6px 10px", textAlign: "left", display: "block", width: "100%" }}
                onClick={() => setEmail("eliora.browning@selu.edu")}
              >
                🎓 Student: <strong>Eliora Browning</strong> (eliora.browning@selu.edu)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", padding: "6px 10px", textAlign: "left", display: "block", width: "100%" }}
                onClick={() => setEmail("galkadi@selu.edu")}
              >
                👨‍🏫 Faculty: <strong>Dr. Ghassan Alkadi</strong> (galkadi@selu.edu)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", padding: "6px 10px", textAlign: "left", display: "block", width: "100%" }}
                onClick={() => setEmail("bonnie.achee@southeastern.edu")}
              >
                🏛️ Dept Head: <strong>Dr. Bonnie Achée</strong> (bonnie.achee@southeastern.edu)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
