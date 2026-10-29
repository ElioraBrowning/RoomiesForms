import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";
import { BrandImage } from "../components/BrandImage";
import { brand } from "../brand";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const { theme, toggleTheme } = useTheme();

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
            <BrandImage
              className="login-hero-seal"
              light={brand.universityLogoOnGreen}
              dark={brand.universityLogoOnGreen}
              alt="Southeastern Louisiana University"
              width={900}
              height={218}
            />
            <div className="login-mascot-wrapper">
              <img
                className="login-mascot"
                src={brand.mascot}
                srcSet={brand.mascotSrcSet}
                alt="Roomie the lion"
                width={192}
                height={224}
              />
            </div>
            <p className="login-hero-copy">
              Fill out your department forms, save your progress as you go, and
              follow each one through review.
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

          <div className="login-quick">
            <p className="login-quick-title">Test accounts</p>
            <div className="login-quick-list">
              <button
                type="button"
                className="login-quick-btn"
                onClick={() => setEmail("eliora.browning@selu.edu")}
              >
                <span className="login-quick-role">Student</span> <strong>Eliora Browning</strong>
              </button>
              <button
                type="button"
                className="login-quick-btn"
                onClick={() => setEmail("galkadi@selu.edu")}
              >
                <span className="login-quick-role">Faculty</span> <strong>Dr. Ghassan Alkadi</strong>
              </button>
              <button
                type="button"
                className="login-quick-btn"
                onClick={() => setEmail("bonnie.achee@southeastern.edu")}
              >
                <span className="login-quick-role">Dept head</span> <strong>Dr. Bonnie Achée</strong>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}