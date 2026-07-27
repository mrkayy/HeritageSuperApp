import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, Member } from "./api";
import "./MembershipPage.css";

export default function MembershipPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMembers()
      .then(setMembers)
      .catch((err) => {
        console.error(err);
        setError("Failed to load church members directory.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="membership-page animate-fade-in">
      {/* Header Area */}
      <header className="membership-header glass-panel">
        <div className="header-left">
          <Link to="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
          <h1>Membership Directory</h1>
        </div>
        <div className="header-right">
          <span className="badge badge-gold">{members.length} Members</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="membership-main stagger">
        {error && (
          <div className="alert alert-error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner spinner-lg" />
            <span>Loading members...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="empty-card card text-center animate-fade-in-up">
            <div className="empty-icon">📂</div>
            <h3>No members profiled yet</h3>
            <p className="text-secondary">
              Members will show up here once they are registered in the database.
            </p>
          </div>
        ) : (
          <div className="members-list-card card animate-fade-in-up">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.ID}>
                    <td className="member-name-cell">
                      <div className="member-avatar">
                        {m.Name.charAt(0).toUpperCase()}
                      </div>
                      <span>{m.Name}</span>
                    </td>
                    <td className="member-email-cell">{m.Email}</td>
                    <td>
                      <span className="badge badge-success">Profiled</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
