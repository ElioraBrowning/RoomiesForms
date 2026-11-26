import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { readApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { isExitSurveyOnly } from "../utils/roles";

interface CallbackParams {
  accessToken: string;
  code: string;
  state: string;
  errorParam: string;
  stateMismatch: boolean;
}

function parseCallbackParams(): CallbackParams {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  const accessToken = hash.get("access_token") || "";
  const code = query.get("code") || "";
  const state = hash.get("state") || query.get("state") || "";
  const errorParam = hash.get("error") || query.get("error") || "";

  let stateMismatch = false;
  try {
    const expectedState = sessionStorage.getItem("google_oauth_state");
    if (expectedState && (!state || state !== expectedState)) {
      stateMismatch = true;
    }
  } catch {
    // Ignore storage access errors
  }

  return { accessToken, code, state, errorParam, stateMismatch };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [params] = useState<CallbackParams>(parseCallbackParams);
  const [asyncError, setAsyncError] = useState("");
  const exchangeAttempted = useRef(false);

  const { accessToken, code, errorParam, stateMismatch } = params;

  const paramError = errorParam
    ? `Google sign-in was denied: ${errorParam}`
    : stateMismatch
      ? "Google sign-in could not be verified (state mismatch). Please try again."
      : !accessToken && !code
        ? "No authorization response was returned from Google."
        : "";

  const error = paramError || asyncError;

  useEffect(() => {
    // Remove OAuth token/code from the browser address bar immediately
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    try {
      sessionStorage.removeItem("google_oauth_state");
    } catch {
      // Ignore storage access errors
    }

    if (exchangeAttempted.current || errorParam || stateMismatch || (!accessToken && !code)) {
      return;
    }
    exchangeAttempted.current = true;

    const finishGoogleAuth = async () => {
      try {
        const res = accessToken
          ? await api.post("/auth/google", { accessToken })
          : await api.post("/auth/google", {
              code,
              redirectUri: `${window.location.origin}/auth/callback`,
            });

        const loggedInUser = completeLogin(res.data.token, res.data.user);
        const target = isExitSurveyOnly(loggedInUser.roles)
          ? "/exit-survey-results"
          : "/dashboard";

        navigate(target, { replace: true });
      } catch (err: any) {
        const { message } = readApiError(err, "Google sign-in failed.");
        setAsyncError(message);
      }
    };

    void finishGoogleAuth();
  }, [accessToken, code, errorParam, stateMismatch, completeLogin, navigate]);

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
