import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { readApiError } from "../services/api";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Avoid double-firing in React 18 Strict Mode
    if (exchangeAttempted.current) return;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Google sign-in was denied: ${errorParam}`);
      return;
    }

    if (!code) {
      setError("No authorization code was returned from Google.");
      return;
    }

    exchangeAttempted.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const res = await api.post("/auth/google", { code, redirectUri });

        // Save session credentials
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Navigate to the dashboard
        navigate("/dashboard", { replace: true });
        window.location.reload(); // Re-initialize AuthContext with stored token
      } catch (err: any) {
        const { message } = readApiError(err, "Google sign-in failed.");
        setError(message);
      }
    };

    void exchangeCode();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="card page-message" style={{ margin: "3rem auto", maxWidth: "480px" }}>
        <h1>Sign-in Failed</h1>
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/login", { replace: true })}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="card page-message" style={{ margin: "3rem auto", maxWidth: "480px", textAlign: "center" }}>
      <h1>Signing in...</h1>
      <p>Validating your university credentials with Google, please wait.</p>
    </div>
  );
}