import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listChurches, getChurch, createChurch, updateChurch, deleteChurch,
  listSectors, getSector, createSector, updateSector, deleteSector,
  listTeams, getTeam, createTeam, updateTeam, deleteTeam,
  Church, Sector, Team
} from "./api";
import "./OrganizationPage.css";

type Tab = "churches" | "sectors" | "teams";

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("churches");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [churches, setChurches] = useState<Church[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form Fields
  const [fieldName, setFieldName] = useState("");
  const [fieldCenter, setFieldCenter] = useState("");
  const [fieldDescription, setFieldDescription] = useState("");
  const [fieldSlug, setFieldSlug] = useState("");
  const [fieldChurchId, setFieldChurchId] = useState("");
  const [fieldSectorId, setFieldSectorId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "churches") {
        const data = await listChurches();
        setChurches(data);
      } else if (activeTab === "sectors") {
        const [sectorsData, churchesData] = await Promise.all([listSectors(), listChurches()]);
        setSectors(sectorsData);
        setChurches(churchesData);
      } else if (activeTab === "teams") {
        const [teamsData, sectorsData, churchesData] = await Promise.all([listTeams(), listSectors(), listChurches()]);
        setTeams(teamsData);
        setSectors(sectorsData);
        setChurches(churchesData);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load organization data directory. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode("create");
    setSelectedId(null);
    setFieldName("");
    setFieldCenter("");
    setFieldDescription("");
    setFieldSlug("");
    setFieldChurchId("");
    setFieldSectorId("");
    setModalError(null);
    setShowModal(true);
  }

  async function openEditModal(item: any) {
    setModalMode("edit");
    setSelectedId(item.ID);
    setModalError(null);
    setShowModal(true);

    try {
      if (activeTab === "churches") {
        const c = await getChurch(item.ID);
        setFieldName(c.Name || "");
        setFieldCenter(c.Center || "");
        setFieldDescription(c.Description || "");
        setFieldSlug(c.Slug || "");
      } else if (activeTab === "sectors") {
        const s = await getSector(item.ID);
        setFieldName(s.Name || "");
        setFieldDescription(s.Description || "");
        setFieldChurchId(s.ChurchID || "");
      } else if (activeTab === "teams") {
        const t = await getTeam(item.ID);
        setFieldName(t.Name || "");
        setFieldDescription(t.Description || "");
        setFieldChurchId(t.ChurchID || "");
        setFieldSectorId(t.SectorID || "");
      }
    } catch (err) {
      console.error("Error fetching single item by ID:", err);
      setFieldName(item.Name || item.sector_name || "");
      setFieldCenter(item.Center || "");
      setFieldDescription(item.Description || "");
      setFieldSlug(item.Slug || "");
      setFieldChurchId(item.ChurchID || "");
      setFieldSectorId(item.SectorID || "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldName.trim()) {
      setModalError("Name field is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      if (activeTab === "churches") {
        if (modalMode === "create") {
          await createChurch({
            Name: fieldName.trim(),
            Center: fieldCenter.trim(),
            Description: fieldDescription.trim(),
            Slug: fieldSlug.trim() || fieldName.toLowerCase().replace(/\s+/g, "-"),
          });
        } else if (selectedId) {
          await updateChurch(selectedId, {
            Name: fieldName.trim(),
            Center: fieldCenter.trim(),
            Description: fieldDescription.trim(),
            Slug: fieldSlug.trim() || fieldName.toLowerCase().replace(/\s+/g, "-"),
          });
        }
      } else if (activeTab === "sectors") {
        const payload = {
          name: fieldName.trim(),
          description: fieldDescription.trim() || undefined,
          churchId: fieldChurchId || undefined,
        };
        if (modalMode === "create") {
          await createSector(payload);
        } else if (selectedId) {
          await updateSector(selectedId, payload);
        }
      } else if (activeTab === "teams") {
        const payload = {
          name: fieldName.trim(),
          description: fieldDescription.trim() || undefined,
          churchId: fieldChurchId || undefined,
          sectorId: fieldSectorId || undefined,
        };
        if (modalMode === "create") {
          await createTeam(payload);
        } else if (selectedId) {
          await updateTeam(selectedId, payload);
        }
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      setModalError(err?.message || "Operation failed. Please verify fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      if (activeTab === "churches") {
        await deleteChurch(id);
      } else if (activeTab === "sectors") {
        await deleteSector(id);
      } else if (activeTab === "teams") {
        await deleteTeam(id);
      }
      loadData();
    } catch (err) {
      console.error(err);
      setError(`Failed to delete "${name}". It might have dependent members or relations.`);
    }
  }

  return (
    <div className="org-page animate-fade-in">
      <header className="org-header glass-panel">
        <div className="header-left">
          <Link to="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
          <h1>Organization Management</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add New {activeTab === "churches" ? "Church" : activeTab === "sectors" ? "Sector" : "Team"}
        </button>
      </header>

      <main className="org-main stagger">
        {error && (
          <div className="alert alert-error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        {/* Tab Controls */}
        <div className="tabs-container animate-fade-in-up">
          <button
            className={`tab-btn ${activeTab === "churches" ? "active" : ""}`}
            onClick={() => setActiveTab("churches")}
          >
            🏫 Local Churches
          </button>
          <button
            className={`tab-btn ${activeTab === "sectors" ? "active" : ""}`}
            onClick={() => setActiveTab("sectors")}
          >
            🌐 Sectors
          </button>
          <button
            className={`tab-btn ${activeTab === "teams" ? "active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            🛡️ Ministry Teams
          </button>
        </div>

        {/* Content Listing */}
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner spinner-lg" />
            <span>Loading database...</span>
          </div>
        ) : (
          <div className="org-list-card card animate-fade-in-up">
            <table className="org-table">
              <thead>
                {activeTab === "churches" ? (
                  <tr>
                    <th>Church Name</th>
                    <th>Center / Location</th>
                    <th>Slug</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                ) : activeTab === "sectors" ? (
                  <tr>
                    <th>Sector Name</th>
                    <th>Linked Local Church</th>
                    <th>Assigned Members</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Team Name</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === "churches" && churches.map((c) => (
                  <tr key={c.ID}>
                    <td className="org-name-cell">
                      <div className="org-avatar">🏫</div>
                      <div>
                        <strong>{c.Name}</strong>
                        {c.Description && <p className="text-secondary small">{c.Description}</p>}
                      </div>
                    </td>
                    <td>{c.Center}</td>
                    <td><code className="slug-code">{c.Slug}</code></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(c)}>Edit</button>
                        <button className="btn btn-secondary btn-sm btn-danger-action" onClick={() => handleDelete(c.ID, c.Name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "sectors" && sectors.map((s) => (
                  <tr key={s.ID}>
                    <td className="org-name-cell">
                      <div className="org-avatar">🌐</div>
                      <strong>{s.Name}</strong>
                    </td>
                    <td>
                      {s.ChurchName || <span className="text-secondary small" style={{ fontStyle: "italic" }}>None</span>}
                    </td>
                    <td>
                      <span className="badge badge-gold" style={{ display: "inline-flex", minWidth: "24px", justifyContent: "center", padding: "2px 8px" }}>
                        {s.MemberCount ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(s)}>Edit</button>
                        <button className="btn btn-secondary btn-sm btn-danger-action" onClick={() => handleDelete(s.ID, s.Name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "teams" && teams.map((t) => (
                  <tr key={t.ID}>
                    <td className="org-name-cell">
                      <div className="org-avatar">🛡️</div>
                      <strong>{t.Name}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(t)}>Edit</button>
                        <button className="btn btn-secondary btn-sm btn-danger-action" onClick={() => handleDelete(t.ID, t.Name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Editor Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in-up modal-large">
            <div className="modal-header" style={{ marginBottom: "var(--space-6)" }}>
              <h2>
                {modalMode === "create" ? "Add" : "Edit"}{" "}
                {activeTab === "churches" ? "Local Church" : activeTab === "sectors" ? "Sector" : "Team"}
              </h2>
            </div>

            {modalError && (
              <div className="alert alert-error animate-fade-in" style={{ marginBottom: "var(--space-4)" }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="input-group">
                <label className="input-label">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder={`Enter ${activeTab.slice(0, -1)} name`}
                  required
                />
              </div>

              {activeTab === "churches" && (
                <>
                  <div className="input-group">
                    <label className="input-label">Center Location *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={fieldCenter}
                      onChange={(e) => setFieldCenter(e.target.value)}
                      placeholder="e.g. Lagos Headquarters"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Slug (URL friendly key)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={fieldSlug}
                      onChange={(e) => setFieldSlug(e.target.value)}
                      placeholder="e.g. lagos-hq (optional)"
                    />
                  </div>
                </>
              )}

              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={fieldDescription}
                  onChange={(e) => setFieldDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              {activeTab !== "churches" && (
                <div className="input-group">
                  <label className="input-label">Linked Local Church (Optional)</label>
                  <select
                    className="input-field"
                    value={fieldChurchId}
                    onChange={(e) => setFieldChurchId(e.target.value)}
                  >
                    <option value="">None</option>
                    {churches.map((c) => (
                      <option key={c.ID} value={c.ID}>{c.Name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "teams" && (
                <div className="input-group">
                  <label className="input-label">Linked Sector (Optional)</label>
                  <select
                    className="input-field"
                    value={fieldSectorId}
                    onChange={(e) => setFieldSectorId(e.target.value)}
                  >
                    <option value="">None</option>
                    {sectors.map((s) => (
                      <option key={s.ID} value={s.ID}>{s.Name}</option>
                      
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
