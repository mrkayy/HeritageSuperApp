import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, createMember, deleteMember, Member, CreateMemberPayload } from "./api";
import "./MembershipPage.css";

export default function MembershipPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Drawer State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dobDay, setDobDay] = useState<number | "">("");
  const [dobMonth, setDobMonth] = useState<number | "">("");
  const [maritalStatus, setMaritalStatus] = useState<"single" | "married" | "widowed" | "divorced" | "separated" | "">("");
  const [anniversaryDay, setAnniversaryDay] = useState<number | "">("");
  const [anniversaryMonth, setAnniversaryMonth] = useState<number | "">("");
  const [jobOccupation, setJobOccupation] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [sourceTeam, setSourceTeam] = useState("");
  const [currentStage, setCurrentStage] = useState("first_time_guest");

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
    if (!firstName.trim() || !surname.trim()) {
      setModalError("First name and surname are required.");
      return;
    }

    setModalError(null);
    setIsSubmitting(true);

    const payload: CreateMemberPayload = {
      firstName: firstName.trim(),
      surname: surname.trim(),
      email: email.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      homeAddress: homeAddress.trim() || undefined,
      gender: gender || undefined,
      dateOfBirthDay: dobDay !== "" ? Number(dobDay) : undefined,
      dateOfBirthMonth: dobMonth !== "" ? Number(dobMonth) : undefined,
      maritalStatus: maritalStatus || undefined,
      weddingAnniversaryDay: maritalStatus === "married" && anniversaryDay !== "" ? Number(anniversaryDay) : undefined,
      weddingAnniversaryMonth: maritalStatus === "married" && anniversaryMonth !== "" ? Number(anniversaryMonth) : undefined,
      jobOccupation: jobOccupation.trim() || undefined,
      allergies: allergies.trim() || undefined,
      medicalNotes: medicalNotes.trim() || undefined,
      isPlaceholder,
      sourceTeam: sourceTeam.trim() || undefined,
      currentStage,
    };

    try {
      const created = await createMember(payload);
      setMembers((prev) => [...prev, created]);
      closeModal();
    } catch (err) {
      console.error(err);
      setModalError("Failed to profile new member. Verify inputs and check if email is unique.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setFirstName("");
    setSurname("");
    setEmail("");
    setPhoneNumber("");
    setHomeAddress("");
    setGender("");
    setDobDay("");
    setDobMonth("");
    setMaritalStatus("");
    setAnniversaryDay("");
    setAnniversaryMonth("");
    setJobOccupation("");
    setAllergies("");
    setMedicalNotes("");
    setIsPlaceholder(false);
    setSourceTeam("");
    setCurrentStage("first_time_guest");
    setModalError(null);
  }

  async function handleDeleteMember(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from the directory?`)) {
      return;
    }

    setError(null);
    try {
      await deleteMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (selectedMember?.id === id) {
        setSelectedMember(null);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to delete member: ${name}`);
    }
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phoneNumber && m.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "first_time_guest": return "First Time Guest";
      case "foundation_class": return "Foundation Class";
      case "sunday_school_module_1": return "Sunday School (Mod 1)";
      case "sunday_school_module_2": return "Sunday School (Mod 2)";
      case "sunday_school_module_3": return "Sunday School (Mod 3)";
      case "membership_class": return "Membership Class";
      case "stewardship": return "Stewardship";
      default: return stage;
    }
  };

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
            placeholder="Search by name, email, or phone number..."
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
          <div className="directory-content-layout">
            <div className={`members-list-card card animate-fade-in-up ${selectedMember ? "split-view" : ""}`}>
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Stage</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr 
                      key={m.id} 
                      className={selectedMember?.id === m.id ? "selected-row" : ""}
                      onClick={() => setSelectedMember(m)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="member-name-cell">
                        <div className="member-avatar">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.isPlaceholder && <span className="placeholder-tag">Placeholder Stub</span>}
                        </div>
                      </td>
                      <td className="member-email-cell">{m.email || <span className="text-secondary" style={{ fontStyle: "italic" }}>No email</span>}</td>
                      <td>
                        <span className={`badge badge-stage stage-${m.currentStage}`}>
                          {getStageLabel(m.currentStage)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeleteMember(m.id, m.name)}
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

            {/* Selected Member Detail Panel */}
            {selectedMember && (
              <aside className="member-detail-panel card animate-fade-in-right">
                <div className="panel-header">
                  <h2>Member Details</h2>
                  <button className="close-btn" onClick={() => setSelectedMember(null)}>×</button>
                </div>

                <div className="panel-avatar-section">
                  <div className="large-avatar">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  <h3>{selectedMember.name}</h3>
                  <span className={`badge badge-stage stage-${selectedMember.currentStage}`}>
                    {getStageLabel(selectedMember.currentStage)}
                  </span>
                </div>

                <div className="panel-body">
                  <div className="info-group">
                    <span className="info-label">Email Address</span>
                    <span className="info-value">{selectedMember.email || "—"}</span>
                  </div>

                  <div className="info-group">
                    <span className="info-label">Phone Number</span>
                    <span className="info-value">{selectedMember.phoneNumber || "—"}</span>
                  </div>

                  <div className="info-group">
                    <span className="info-label">Home Address</span>
                    <span className="info-value">{selectedMember.homeAddress || "—"}</span>
                  </div>

                  <div className="info-row">
                    <div className="info-group">
                      <span className="info-label">Gender</span>
                      <span className="info-value text-capitalize">{selectedMember.gender || "—"}</span>
                    </div>
                    <div className="info-group">
                      <span className="info-label">Marital Status</span>
                      <span className="info-value text-capitalize">{selectedMember.maritalStatus || "—"}</span>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-group">
                      <span className="info-label">Birthday</span>
                      <span className="info-value">
                        {selectedMember.dateOfBirthDay && selectedMember.dateOfBirthMonth 
                          ? `${selectedMember.dateOfBirthDay}/${selectedMember.dateOfBirthMonth}` 
                          : "—"}
                      </span>
                    </div>
                    <div className="info-group">
                      <span className="info-label">Anniversary</span>
                      <span className="info-value">
                        {selectedMember.weddingAnniversaryDay && selectedMember.weddingAnniversaryMonth 
                          ? `${selectedMember.weddingAnniversaryDay}/${selectedMember.weddingAnniversaryMonth}` 
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="info-group">
                    <span className="info-label">Occupation</span>
                    <span className="info-value">{selectedMember.jobOccupation || "—"}</span>
                  </div>

                  <div className="info-group">
                    <span className="info-label">Allergies</span>
                    <span className="info-value text-warning">{selectedMember.allergies || "None declared"}</span>
                  </div>

                  <div className="info-group">
                    <span className="info-label">Medical Notes</span>
                    <span className="info-value">{selectedMember.medicalNotes || "None"}</span>
                  </div>

                  <div className="info-row">
                    <div className="info-group">
                      <span className="info-label">Source Team</span>
                      <span className="info-value">{selectedMember.sourceTeam || "—"}</span>
                    </div>
                    <div className="info-group">
                      <span className="info-label">Record Type</span>
                      <span className="info-value">
                        {selectedMember.isPlaceholder ? "Stub (Placeholder)" : "Full Profile"}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* Modal Overlay for Profiling/Creating Member */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in-up" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header" style={{ marginBottom: "var(--space-4)" }}>
              <h2 style={{ fontSize: "var(--fs-2xl)", color: "var(--text-primary)" }}>Profile New Member</h2>
              <p className="text-secondary" style={{ fontSize: "var(--fs-sm)" }}>Register a new member in the central directory with details.</p>
            </div>

            {modalError && (
              <div className="alert alert-error animate-fade-in" role="alert" style={{ marginBottom: "var(--space-4)" }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              
              {/* Form Section 1: Basic Identity */}
              <div className="form-section">
                <h3 className="section-title">Identity</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-first-name">First Name</label>
                    <input
                      id="member-first-name"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Olukayode"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-surname">Surname</label>
                    <input
                      id="member-surname"
                      type="text"
                      className="input-field"
                      placeholder="e.g. George"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 2: Contact & Address */}
              <div className="form-section">
                <h3 className="section-title">Contact & Location</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-email">Email Address</label>
                    <input
                      id="member-email"
                      type="email"
                      className="input-field"
                      placeholder="e.g. member@hofchurch.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-phone">Phone Number</label>
                    <input
                      id="member-phone"
                      type="text"
                      className="input-field"
                      placeholder="e.g. +234..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: "var(--space-3)" }}>
                  <label className="input-label" htmlFor="member-address">Home Address</label>
                  <input
                    id="member-address"
                    type="text"
                    className="input-field"
                    placeholder="Full residential address"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Form Section 3: Demographics & Personal */}
              <div className="form-section">
                <h3 className="section-title">Demographics & Family</h3>
                <div className="form-grid-3">
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-gender">Gender</label>
                    <select
                      id="member-gender"
                      className="input-field"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-dob-day">Birth Day</label>
                    <input
                      id="member-dob-day"
                      type="number"
                      min="1"
                      max="31"
                      className="input-field"
                      placeholder="Day (1-31)"
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-dob-month">Birth Month</label>
                    <input
                      id="member-dob-month"
                      type="number"
                      min="1"
                      max="12"
                      className="input-field"
                      placeholder="Month (1-12)"
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginTop: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-marital">Marital Status</label>
                    <select
                      id="member-marital"
                      className="input-field"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as any)}
                    >
                      <option value="">Select status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="widowed">Widowed</option>
                      <option value="divorced">Divorced</option>
                      <option value="separated">Separated</option>
                    </select>
                  </div>
                  {maritalStatus === "married" && (
                    <>
                      <div className="input-group">
                        <label className="input-label" htmlFor="member-anniversary-day">Anniversary Day</label>
                        <input
                          id="member-anniversary-day"
                          type="number"
                          min="1"
                          max="31"
                          className="input-field"
                          placeholder="Day (1-31)"
                          value={anniversaryDay}
                          onChange={(e) => setAnniversaryDay(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label" htmlFor="member-anniversary-month">Anniversary Month</label>
                        <input
                          id="member-anniversary-month"
                          type="number"
                          min="1"
                          max="12"
                          className="input-field"
                          placeholder="Month (1-12)"
                          value={anniversaryMonth}
                          onChange={(e) => setAnniversaryMonth(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="input-group" style={{ marginTop: "var(--space-3)" }}>
                  <label className="input-label" htmlFor="member-occupation">Job / Occupation</label>
                  <input
                    id="member-occupation"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Software Engineer, Business Owner"
                    value={jobOccupation}
                    onChange={(e) => setJobOccupation(e.target.value)}
                  />
                </div>
              </div>

              {/* Form Section 4: Spiritual / Progression */}
              <div className="form-section">
                <h3 className="section-title">Church Details</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-stage">Membership Stage</label>
                    <select
                      id="member-stage"
                      className="input-field"
                      value={currentStage}
                      onChange={(e) => setCurrentStage(e.target.value)}
                    >
                      <option value="first_time_guest">First Time Guest</option>
                      <option value="foundation_class">Foundation Class</option>
                      <option value="sunday_school_module_1">Sunday School (Module 1)</option>
                      <option value="sunday_school_module_2">Sunday School (Module 2)</option>
                      <option value="sunday_school_module_3">Sunday School (Module 3)</option>
                      <option value="membership_class">Membership Class</option>
                      <option value="stewardship">Stewardship</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="member-source-team">Primary Team Name</label>
                    <input
                      id="member-source-team"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Media, Choir, Ushering"
                      value={sourceTeam}
                      onChange={(e) => setSourceTeam(e.target.value)}
                    />
                  </div>
                </div>
                <div className="checkbox-group" style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <input
                    id="member-is-placeholder"
                    type="checkbox"
                    checked={isPlaceholder}
                    onChange={(e) => setIsPlaceholder(e.target.checked)}
                  />
                  <label htmlFor="member-is-placeholder" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>Save as Placeholder Stub (created because of parent/kid data gaps)</label>
                </div>
              </div>

              {/* Form Section 5: Medical / Health */}
              <div className="form-section">
                <h3 className="section-title">Medical & Health</h3>
                <div className="input-group">
                  <label className="input-label" htmlFor="member-allergies">Allergies</label>
                  <input
                    id="member-allergies"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Nuts, Penicillin (leave empty if none)"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginTop: "var(--space-3)" }}>
                  <label className="input-label" htmlFor="member-med-notes">Medical Notes</label>
                  <textarea
                    id="member-med-notes"
                    className="input-field"
                    placeholder="Provide any critical medical conditions or details"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    style={{ minHeight: "80px", resize: "vertical" }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
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
