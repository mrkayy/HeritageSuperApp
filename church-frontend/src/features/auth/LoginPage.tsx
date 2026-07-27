import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import Logo from "../../shared/components/Logo";
import "./LoginPage.css";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth redirect errors
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "not_profiled") {
      setError("This email is not registered in the church directory. Please contact your church admin.");
    } else if (err === "auth_failed") {
      setError("Google authentication failed. Please try again.");
    } else if (err === "email_required") {
      setError("Email is required to sign in with Google.");
    }
  }, [searchParams]);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  function handleGoogleSignIn() {
    if (!googleEmail.trim()) {
      setError("Please enter your email to continue with Google.");
      return;
    }
    // Redirect the browser to the backend OAuth initiation endpoint
    const apiBase = import.meta.env.VITE_API_URL ?? "/api";
    window.location.href = `${apiBase}/auth/login/google?email=${encodeURIComponent(googleEmail.trim())}`;
  }

  return (
    <div className="login-page">
      {/* Branding Panel */}
      <div className="login-brand">
        <div className="login-brand-content animate-fade-in-up">
          <Logo size={140} style={{ marginBottom: "1rem" }} />
          <h1 className="login-brand-title">Heritage of Faith</h1>
          <p className="login-brand-subtitle">Church Management Platform</p>
          <div className="login-brand-divider" />
          <p className="login-brand-tagline">
            One login for every ministry and operations tool.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-container animate-fade-in-up">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p className="text-secondary">Sign in to your church portal</p>
          </div>

          {error && (
            <div className="alert alert-error animate-fade-in" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {!showGooglePrompt ? (
            <div className="login-actions stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                type="button"
                className="btn btn-google btn-lg btn-full animate-fade-in-up"
                onClick={() => setShowGooglePrompt(true)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="google-email-prompt animate-fade-in-up">
              <p className="google-prompt-text" style={{ marginBottom: "1rem", fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                Enter your church email to continue with Google SSO
              </p>
              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <input
                  className="input-field"
                  type="email"
                  placeholder="your.name@hofchurch.org"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleGoogleSignIn()}
                />
              </div>
              <div className="google-prompt-actions" style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowGooglePrompt(false);
                    setGoogleEmail("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGoogleSignIn}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          <div className="admin-portal-link animate-fade-in-up" style={{ textAlign: "center", marginTop: "3rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
              Are you a platform administrator?
            </p>
            <a href="/admin-login" style={{ fontSize: "var(--fs-sm)", fontWeight: "600", color: "var(--primary)" }}>
              Access Super Admin Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
