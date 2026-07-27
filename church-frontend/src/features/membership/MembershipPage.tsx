import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, createMember, deleteMember, Member } from "./api";
import "./MembershipPage.css";

export default function MembershipPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load church members directory.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setModalError("Please fill in both name and email fields.");
      return;
    }

    setModalError(null);
    setIsSubmitting(true);
    try {
      const created = await createMember(newMemberName.trim(), newMemberEmail.trim());
      setMembers((prev) => [...prev, created]);
      // Reset form
      setNewMemberName("");
      setNewMemberEmail("");
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setModalError("Failed to profile new member. Email might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMember(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from the directory?`)) {
      return;
    }

    setError(null);
    try {
      await deleteMember(id);
      setMembers((prev) => prev.filter((m) => m.ID !== id));
    } catch (err) {
      console.error(err);
      setError(`Failed to delete member: ${name}`);
    }
  }

  const filteredMembers = members.filter(
    (m) =>
      m.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.Email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="header-right" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span className="badge badge-gold">{filteredMembers.length} Profiled</span>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Profile Member
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="membership-main stagger">
        {error && (
          <div className="alert alert-error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        {/* Search controls */}
        <div className="members-controls-card card animate-fade-in-up" style={{ display: "flex", padding: "var(--space-4)" }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", maxWidth: "400px" }}
          />
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner spinner-lg" />
            <span>Loading members directory...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="empty-card card text-center animate-fade-in-up">
            <div className="empty-icon">📂</div>
            <h3>No members matched search</h3>
            <p className="text-secondary">
              Try adjusting your query or click "+ Profile Member" to add a new member.
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
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
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
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDeleteMember(m.ID, m.Name)}
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          color: "var(--error)",
                          borderColor: "rgba(239, 68, 68, 0.15)",
                          backgroundColor: "rgba(239, 68, 68, 0.02)"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Overlay for Profiling/Creating Member */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in-up" style={{ maxWidth: "480px", width: "100%" }}>
            <div className="modal-header" style={{ marginBottom: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-2xl)", color: "var(--text-primary)" }}>Profile New Member</h2>
              <p className="text-secondary" style={{ fontSize: "var(--fs-sm)" }}>Register a new member in the central directory.</p>
            </div>

            {modalError && (
              <div className="alert alert-error animate-fade-in" role="alert" style={{ marginBottom: "var(--space-4)" }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="input-group">
                <label className="input-label" htmlFor="member-name">Full Name</label>
                <input
                  id="member-name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Olukayode George"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="member-email">Email Address</label>
                <input
                  id="member-email"
                  type="email"
                  className="input-field"
                  placeholder="e.g. member@hofchurch.org"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setNewMemberName("");
                    setNewMemberEmail("");
                    setModalError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Profiling..." : "Profile Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
