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

  const handleQuickLogin = async (targetEmail: string) => {
    setError("");
    setLoading(true);
    try {
      await login(targetEmail);
      navigate("/dashboard");
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Redirects directly to Google OAuth consent screen
  const handleGoogleSignIn = () => {
    setError("");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError("Google Client ID is missing. Please check your Web/.env file.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = encodeURIComponent("openid email profile");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=online&prompt=select_account`;

    window.location.href = authUrl;
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
        "Couldn't reach Google Apps Script backend. Please check your network connection and try again."
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
                Sign in with your Southeastern Google account.
              </p>
            </div>

            {error && (
              <p className="login-error" id="login-error" role="alert">
                {error}
              </p>
            )}

            {/* Main Google Sign-In Button */}
            <button
              type="button"
              className="btn login-submit"
              onClick={handleGoogleSignIn}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "1.5rem",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "center",
                margin: "1rem 0",
                color: "var(--color-text-muted, #666)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ flex: 1, borderBottom: "1px solid var(--color-border, #ccc)" }} />
              <span style={{ padding: "0 10px" }}>or use test credentials</span>
              <div style={{ flex: 1, borderBottom: "1px solid var(--color-border, #ccc)" }} />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="login-email">Southeastern email</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@selu.edu"
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={error ? true : undefined}
                />
              </div>

              <button
                type="submit"
                className="btn login-submit"
                disabled={loading}
                style={{ marginTop: "0.5rem" }}
              >
                {loading ? "Signing in..." : "Sign in manually"}
              </button>
            </form>

            <div className="login-quick">
              <p className="login-quick-title">One-Click Demo Logins</p>
              <div className="login-quick-list">
                <button
                  type="button"
                  className="login-quick-btn"
                  onClick={() => handleQuickLogin("eliora.browning@selu.edu")}
                >
                  <span className="login-quick-role">Student</span>{" "}
                  <strong>Eliora Browning</strong>
                </button>
                <button
                  type="button"
                  className="login-quick-btn"
                  onClick={() => handleQuickLogin("alkadi@selu.edu")}
                >
                  <span className="login-quick-role">Faculty</span>{" "}
                  <strong>Dr. Ghassan Alkadi</strong>
                </button>
                <button
                  type="button"
                  className="login-quick-btn"
                  onClick={() => handleQuickLogin("bonnie.achee@selu.edu")}
                >
                  <span className="login-quick-role">Department Head</span>{" "}
                  <strong>Dr. Bonnie Achée</strong>
                </button>
              </div>
            </div>
            {/* ========================================================================= */}
          </div>
        </div>
      </div>
    </div>
  );
}
