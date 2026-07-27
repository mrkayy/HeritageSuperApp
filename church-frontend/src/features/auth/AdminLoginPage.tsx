import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { loginRequest } from "./api";
import Logo from "../../shared/components/Logo";
import "./LoginPage.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { token, user: u } = await loginRequest(email, password);
      login(token, u);
      navigate("/");
    } catch {
      setError("Invalid admin email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-content animate-fade-in-up">
          <Logo size={140} style={{ marginBottom: "1rem" }} />
          <h1 className="login-brand-title">Heritage of Faith</h1>
          <p className="login-brand-subtitle">Super Admin Console</p>
          <div className="login-brand-divider" />
          <p className="login-brand-tagline">
            System administration and platform configuration portal.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-container animate-fade-in-up">
          <div className="login-form-header">
            <h2>Super Admin Access</h2>
            <p className="text-secondary">Sign in with system credentials</p>
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

          <form onSubmit={handleSubmit} className="login-form stagger">
            <div className="input-group animate-fade-in-up">
              <label className="input-label" htmlFor="admin-email">Admin Email</label>
              <input
                id="admin-email"
                className="input-field"
                type="email"
                placeholder="admin@hofchurch.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group animate-fade-in-up">
              <label className="input-label" htmlFor="admin-password">System Password</label>
              <input
                id="admin-password"
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full animate-fade-in-up"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Authenticating...
                </>
              ) : (
                "Authenticate Admin"
              )}
            </button>
          </form>

          <div className="back-to-sso-link animate-fade-in-up" style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <a href="/login" style={{ fontSize: "var(--fs-sm)", fontWeight: "500" }}>
              ← Return to Standard SSO Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
