import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import Logo from "../../shared/components/Logo";
import "./DashboardPage.css";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Top Header Bar */}
      <header className="dashboard-header glass-panel">
        <div className="header-brand" style={{ gap: "0.5rem" }}>
          <Logo size={42} />
          <h2 style={{ fontSize: "var(--fs-xl)", fontWeight: "800", color: "var(--primary)" }}>Heritage of Faith</h2>
        </div>
        <div className="header-user">
          <span className="badge badge-gold">
            {user?.Roles && user.Roles.length > 0 ? user.Roles[0].replace("_", " ") : "Member"}
          </span>
          <span className="user-email">{user?.Email}</span>
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main stagger">
        <section className="welcome-banner animate-fade-in-up">
          <h1>Shalom, welcome back!</h1>
          <p>Access your ministry tasks, teams, and member operations.</p>
        </section>

        {/* Feature Cards Grid */}
        <section className="dashboard-grid animate-fade-in-up">
          {/* Card 1: Members Directory */}
          {user && (user.Roles.includes("team_lead") || user.Roles.includes("resident_pastor") || user.Roles.includes("church_admin")) && (
            <Link to="/members" className="feature-card card">
              <div className="card-icon">👥</div>
              <h3>Membership Directory</h3>
              <p>Search, register, and update church members and their onboarding status.</p>
              <span className="card-action">Go to Members →</span>
            </Link>
          )}

          {/* Card 2: Teams & Sectors */}
          {user && (user.Roles.includes("team_lead") || user.Roles.includes("resident_pastor") || user.Roles.includes("church_admin")) && (
            <Link to="/admin/organization" className="feature-card card">
              <div className="card-icon">🛡️</div>
              <h3>Teams & Sectors</h3>
              <p>Manage church departments, sectors, and volunteer rosters.</p>
              <span className="card-action">Manage Organization →</span>
            </Link>
          )}

          {/* Card 4: My Profile & Family */}
          {user && (
            <Link to="/profile" className="feature-card card">
              <div className="card-icon">👤</div>
              <h3>My Profile & Family</h3>
              <p>View and update your personal details, and register/edit child or teenager profiles.</p>
              <span className="card-action">Manage Profile & Kids →</span>
            </Link>
          )}

          {/* Card 3: Events & Scheduling */}
          <div className="feature-card card disabled">
            <div className="card-icon">📅</div>
            <h3>Church Events</h3>
            <p>Schedule services, outreach campaigns, and special events.</p>
            <span className="card-tag">Coming Soon</span>
          </div>
        </section>
      </main>
    </div>
  );
}
