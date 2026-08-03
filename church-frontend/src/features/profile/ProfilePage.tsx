import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProfile, updateProfile, fetchKids, createKid, updateKid, deleteKid, UserProfile } from "./api";
import { listChurches, listSectors, listTeams } from "../organization/api";
import { Member, CreateMemberPayload } from "../membership/api";
import "./ProfilePage.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kids, setKids] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Own Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [anniversaryDay, setAnniversaryDay] = useState<number | "">("");
  const [anniversaryMonth, setAnniversaryMonth] = useState<number | "">("");
  const [jobOccupation, setJobOccupation] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Kid Modal State
  const [showKidModal, setShowKidModal] = useState(false);
  const [kidModalMode, setKidModalMode] = useState<"create" | "edit">("create");
  const [editKidId, setEditKidId] = useState<string | null>(null);
  const [kidError, setKidError] = useState<string | null>(null);
  const [isSubmittingKid, setIsSubmittingKid] = useState(false);

  // Lookup data for kids assignments
  const [churches, setChurches] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Kid Form Fields
  const [kidFirstName, setKidFirstName] = useState("");
  const [kidSurname, setKidSurname] = useState("");
  const [kidEmail, setKidEmail] = useState("");
  const [kidPhone, setKidPhone] = useState("");
  const [kidAddress, setKidAddress] = useState("");
  const [kidGender, setKidGender] = useState<"male" | "female" | "">("");
  const [kidDobDay, setKidDobDay] = useState<number | "">("");
  const [kidDobMonth, setKidDobMonth] = useState<number | "">("");
  const [kidAllergies, setKidAllergies] = useState("");
  const [kidMedicalNotes, setKidMedicalNotes] = useState("");
  const [kidChurchId, setKidChurchId] = useState("");
  const [kidSectorId, setKidSectorId] = useState("");
  const [kidTeamId, setKidTeamId] = useState("");

  useEffect(() => {
    loadData();
    loadLookups();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, kidsData] = await Promise.all([fetchProfile(), fetchKids()]);
      setProfile(profData);
      setKids(kidsData);

      // Populate edit states
      setFirstName(profData.firstName || "");
      setLastName(profData.lastName || "");
      setPhoneNumber(profData.phoneNumber || "");
      setAddress(profData.address || "");
      setDob(profData.dateOfBirth ? profData.dateOfBirth.split("T")[0] : "");
      setMaritalStatus(profData.maritalStatus || "");
      setAnniversaryDay(profData.weddingAnniversaryDay ?? "");
      setAnniversaryMonth(profData.weddingAnniversaryMonth ?? "");
      setJobOccupation(profData.jobOccupation || "");
      setAllergies(profData.allergies || "");
      setMedicalNotes(profData.medicalNotes || "");
      setEmergencyContactName(profData.emergencyContactName || "");
      setEmergencyContactPhone(profData.emergencyContactPhone || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load profile and family records.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [cData, sData, tData] = await Promise.all([listChurches(), listSectors(), listTeams()]);
      setChurches(cData);
      setSectors(sData);
      setTeams(tData);
    } catch (err) {
      console.error("Failed to load list lookups:", err);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        dateOfBirth: dob ? dob : undefined,
        teamId: profile?.teamId,
        sectorId: profile?.sectorId,
        maritalStatus: maritalStatus || undefined,
        weddingAnniversaryDay: anniversaryDay !== "" ? Number(anniversaryDay) : undefined,
        weddingAnniversaryMonth: anniversaryMonth !== "" ? Number(anniversaryMonth) : undefined,
        jobOccupation: jobOccupation.trim() || undefined,
        allergies: allergies.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phoneNumber: phoneNumber.trim(),
              address: address.trim(),
              dateOfBirth: dob ? dob : undefined,
              maritalStatus: maritalStatus || undefined,
              weddingAnniversaryDay: anniversaryDay !== "" ? Number(anniversaryDay) : undefined,
              weddingAnniversaryMonth: anniversaryMonth !== "" ? Number(anniversaryMonth) : undefined,
              jobOccupation: jobOccupation.trim() || undefined,
              allergies: allergies.trim() || undefined,
              medicalNotes: medicalNotes.trim() || undefined,
              emergencyContactName: emergencyContactName.trim() || undefined,
              emergencyContactPhone: emergencyContactPhone.trim() || undefined,
            }
          : null
      );
      setProfileSuccess("Your profile has been updated successfully.");
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
      setProfileError("Failed to update profile settings.");
    }
  }

  async function handleKidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kidFirstName.trim() || !kidSurname.trim()) {
      setKidError("Child's first name and surname are required.");
      return;
    }

    setKidError(null);
    setIsSubmittingKid(true);

    const payload: CreateMemberPayload = {
      firstName: kidFirstName.trim(),
      surname: kidSurname.trim(),
      email: kidEmail.trim() || undefined,
      phoneNumber: kidPhone.trim() || undefined,
      homeAddress: kidAddress.trim() || undefined,
      gender: kidGender || undefined,
      dateOfBirthDay: kidDobDay !== "" ? Number(kidDobDay) : undefined,
      dateOfBirthMonth: kidDobMonth !== "" ? Number(kidDobMonth) : undefined,
      allergies: kidAllergies.trim() || undefined,
      medicalNotes: kidMedicalNotes.trim() || undefined,
      localChurchId: kidChurchId || undefined,
      sectorId: kidSectorId || undefined,
      teamId: kidTeamId || undefined,
      currentStage: "first_time_guest",
    };

    try {
      if (kidModalMode === "edit" && editKidId) {
        const updated = await updateKid(editKidId, payload);
        setKids((prev) => prev.map((k) => (k.id === editKidId ? updated : k)));
        closeKidModal();
      } else {
        const created = await createKid(payload);
        setKids((prev) => [...prev, created]);
        closeKidModal();
      }
    } catch (err) {
      console.error(err);
      setKidError("Failed to save child details. Verify inputs and try again.");
    } finally {
      setIsSubmittingKid(false);
    }
  }

  function openEditKidModal(k: Member) {
    setKidModalMode("edit");
    setEditKidId(k.id);
    setKidError(null);

    setKidFirstName(k.firstName || "");
    setKidSurname(k.surname || "");
    setKidEmail(k.email || "");
    setKidPhone(k.phoneNumber || "");
    setKidAddress(k.homeAddress || "");
    setKidGender(k.gender || "");
    setKidDobDay(k.dateOfBirthDay || "");
    setKidDobMonth(k.dateOfBirthMonth || "");
    setKidAllergies(k.allergies || "");
    setKidMedicalNotes(k.medicalNotes || "");
    setKidChurchId(k.localChurchId || "");
    setKidSectorId(k.sectorId || "");
    setKidTeamId(k.teamId || "");

    setShowKidModal(true);
  }

  function closeKidModal() {
    setShowKidModal(false);
    setKidModalMode("create");
    setEditKidId(null);
    setKidError(null);

    // Reset fields
    setKidFirstName("");
    setKidSurname("");
    setKidEmail("");
    setKidPhone("");
    setKidAddress("");
    setKidGender("");
    setKidDobDay("");
    setKidDobMonth("");
    setKidAllergies("");
    setKidMedicalNotes("");
    setKidChurchId("");
    setKidSectorId("");
    setKidTeamId("");
  }

  async function handleDeleteKid(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from your profile?`)) {
      return;
    }
    setError(null);
    try {
      await deleteKid(id);
      setKids((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error(err);
      setError(`Failed to remove child: ${name}`);
    }
  }

  if (isLoading) {
    return (
      <div className="profile-page-loading">
        <div className="spinner"></div>
        <p>Loading your profile records...</p>
      </div>
    );
  }

  return (
    <div className="profile-page animate-fade-in">
      <header className="profile-header glass-panel">
        <div className="header-brand">
          <Link to="/" className="back-link">← Dashboard</Link>
          <h2>My Profile & Family</h2>
        </div>
      </header>

      <main className="profile-main">
        {error && <div className="alert alert-error animate-fade-in">{error}</div>}
        {profileSuccess && <div className="alert alert-success animate-fade-in">{profileSuccess}</div>}

        <div className="profile-grid">
          {/* Section 1: My Profile Details */}
          <section className="profile-section-card card">
            <div className="section-card-header">
              <h3>Personal Profile Details</h3>
              {!isEditingProfile && (
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="profile-edit-form">
                {profileError && <div className="alert alert-error">{profileError}</div>}
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">First Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Last Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. +234..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: "var(--space-3)" }}>
                  <label className="input-label">Home Address</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-grid-3" style={{ marginTop: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label">Marital Status</label>
                    <select
                      className="input-field"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
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
                        <label className="input-label">Anniversary Day</label>
                        <input
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
                        <label className="input-label">Anniversary Month</label>
                        <input
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

                <div className="form-grid-2" style={{ marginTop: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label">Job / Occupation</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Accountant, Doctor"
                      value={jobOccupation}
                      onChange={(e) => setJobOccupation(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Allergies (if any)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Shellfish, Penicillin"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: "var(--space-3)" }}>
                  <label className="input-label">Medical Notes</label>
                  <textarea
                    className="input-field"
                    placeholder="Provide any critical medical conditions or details"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    style={{ minHeight: "60px", resize: "vertical" }}
                  />
                </div>

                <div className="form-grid-2" style={{ marginTop: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label">Emergency Contact Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Full Name"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Emergency Contact Phone</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Phone number"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions" style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-display-details">
                <div className="detail-row">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{profile?.firstName} {profile?.lastName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{profile?.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone Number</span>
                  <span className="detail-value">{profile?.phoneNumber || "—"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date of Birth</span>
                  <span className="detail-value">
                    {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Home Address</span>
                  <span className="detail-value">{profile?.address || "—"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Marital Status</span>
                  <span className="detail-value">
                    {profile?.maritalStatus ? profile.maritalStatus.charAt(0).toUpperCase() + profile.maritalStatus.slice(1) : "—"}
                    {profile?.maritalStatus === "married" && profile.weddingAnniversaryDay && profile.weddingAnniversaryMonth
                      ? ` (Anniversary: ${profile.weddingAnniversaryDay}/${profile.weddingAnniversaryMonth})`
                      : ""}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Job / Occupation</span>
                  <span className="detail-value">{profile?.jobOccupation || "—"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Allergies</span>
                  <span className={`detail-value ${profile?.allergies ? "text-warning" : ""}`}>{profile?.allergies || "None"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Medical Notes</span>
                  <span className="detail-value">{profile?.medicalNotes || "None"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Emergency Contact</span>
                  <span className="detail-value">
                    {profile?.emergencyContactName || profile?.emergencyContactPhone
                      ? `${profile.emergencyContactName || "—"} (${profile.emergencyContactPhone || "—"})`
                      : "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Placement Info</span>
                  <span className="detail-value">
                    {profile?.teamName ? `Primary Team: ${profile.teamName}` : ""}
                    {profile?.sectorName ? ` | Sector: ${profile.sectorName}` : ""}
                    {!profile?.teamName && !profile?.sectorName ? "No active placement assigned." : ""}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Kids & Teenagers */}
          <section className="profile-section-card card">
            <div className="section-card-header">
              <h3>Children & Teenagers</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setKidModalMode("create"); setShowKidModal(true); }}>
                + Add Child / Teen
              </button>
            </div>

            <div className="kids-list-container" style={{ marginTop: "var(--space-4)" }}>
              {kids.length === 0 ? (
                <div className="kids-empty-state">
                  <span style={{ fontSize: "var(--fs-display)" }}>👶</span>
                  <h4>No children registered yet</h4>
                  <p className="text-secondary">Register your teenagers or children to link their records with your account.</p>
                </div>
              ) : (
                <div className="kids-grid">
                  {kids.map((k) => (
                    <div key={k.id} className="kid-card card">
                      <div className="kid-card-header">
                        <div className="kid-avatar">🧒</div>
                        <div className="kid-title-block">
                          <h4>{k.name}</h4>
                          <span className="kid-age-tag">
                            {k.dateOfBirthDay && k.dateOfBirthMonth ? `Birthday: ${k.dateOfBirthDay}/${k.dateOfBirthMonth}` : "Age not specified"}
                          </span>
                        </div>
                      </div>
                      <div className="kid-card-body">
                        {k.email && (
                          <div className="kid-info-row">
                            <span className="info-icon">✉️</span>
                            <span>{k.email}</span>
                          </div>
                        )}
                        {k.phoneNumber && (
                          <div className="kid-info-row">
                            <span className="info-icon">📞</span>
                            <span>{k.phoneNumber}</span>
                          </div>
                        )}
                        {k.allergies && (
                          <div className="kid-info-row text-warning">
                            <span className="info-icon">⚠️</span>
                            <strong>Allergies: {k.allergies}</strong>
                          </div>
                        )}
                        {k.medicalNotes && (
                          <div className="kid-info-row">
                            <span className="info-icon">📝</span>
                            <span style={{ fontSize: "var(--fs-xs)" }}>{k.medicalNotes}</span>
                          </div>
                        )}
                        <div className="kid-card-actions" style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
                          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEditKidModal(k)}>
                            Edit
                          </button>
                          <button className="btn btn-secondary btn-sm btn-danger-action" onClick={() => handleDeleteKid(k.id, k.name)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Kid Editor Modal */}
      {showKidModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in-up modal-small" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header" style={{ marginBottom: "var(--space-5)" }}>
              <h2>{kidModalMode === "create" ? "Add Child/Teenager" : "Edit Child Details"}</h2>
              <p className="text-secondary" style={{ fontSize: "var(--fs-sm)" }}>
                {kidModalMode === "create" ? "Register your teenager/child to link records with your guardian profile." : "Update details for your child."}
              </p>
            </div>

            {kidError && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>{kidError}</div>}

            <form onSubmit={handleKidSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-grid-2">
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Samuel"
                    value={kidFirstName}
                    onChange={(e) => setKidFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Surname *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. George"
                    value={kidSurname}
                    onChange={(e) => setKidSurname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="input-group">
                  <label className="input-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="e.g. sam@gmail.com"
                    value={kidEmail}
                    onChange={(e) => setKidEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone Number (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. +234..."
                    value={kidPhone}
                    onChange={(e) => setKidPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select
                    className="input-field"
                    value={kidGender}
                    onChange={(e) => setKidGender(e.target.value as any)}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Birth Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input-field"
                    placeholder="Day (1-31)"
                    value={kidDobDay}
                    onChange={(e) => setKidDobDay(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Birth Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="input-field"
                    placeholder="Month (1-12)"
                    value={kidDobMonth}
                    onChange={(e) => setKidDobMonth(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="input-group">
                  <label className="input-label">Local Church Center</label>
                  <select
                    className="input-field"
                    value={kidChurchId}
                    onChange={(e) => setKidChurchId(e.target.value)}
                  >
                    <option value="">None / Not Assigned</option>
                    {churches.map((c) => (
                      <option key={c.ID} value={c.ID}>{c.Name} {c.Center ? `(${c.Center})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Assigned Sector</label>
                  <select
                    className="input-field"
                    value={kidSectorId}
                    onChange={(e) => setKidSectorId(e.target.value)}
                  >
                    <option value="">None / Not Assigned</option>
                    {sectors.map((s) => (
                      <option key={s.ID} value={s.ID}>{s.Name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Primary Team</label>
                  <select
                    className="input-field"
                    value={kidTeamId}
                    onChange={(e) => setKidTeamId(e.target.value)}
                  >
                    <option value="">None / Not Assigned</option>
                    {teams.map((t) => (
                      <option key={t.ID} value={t.ID}>{t.Name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Allergies</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Lactose, Eggs (leave blank if none)"
                  value={kidAllergies}
                  onChange={(e) => setKidAllergies(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Medical Notes</label>
                <textarea
                  className="input-field"
                  placeholder="Critical conditions or notes"
                  value={kidMedicalNotes}
                  onChange={(e) => setKidMedicalNotes(e.target.value)}
                  style={{ minHeight: "60px", resize: "vertical" }}
                />
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <button type="button" className="btn btn-secondary" onClick={closeKidModal} disabled={isSubmittingKid}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingKid}>
                  {isSubmittingKid ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
