import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { fetchTeams, fetchSectors, updateProfile, Team, Sector } from "./api";
import "./OnboardingPage.css";

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Step state: 1 = Personal Details, 2 = Church Assignment, 3 = Review
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSector, setSelectedSector] = useState("");

  useEffect(() => {
    // If the user's profile is already complete, redirect to home
    if (user?.isProfileComplete) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (step === 2) {
      setIsLoading(true);
      Promise.all([fetchTeams(), fetchSectors()])
        .then(([teamsData, sectorsData]) => {
          setTeams(teamsData);
          setSectors(sectorsData);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load church teams and sectors. Please reload.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [step]);

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      if (!firstName || !lastName || !phoneNumber || !address) {
        setError("Please fill out all required fields.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }

  function handlePrevStep() {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function handleSubmit() {
    setError(null);
    setIsLoading(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: dateOfBirth || undefined,
        address,
        teamId: selectedTeam || undefined,
        sectorId: selectedSector || undefined,
      });

      // Update AuthContext user state
      await refreshUser();
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="onboarding-page animate-fade-in">
      <div className="onboarding-container glass-panel">
        <div className="onboarding-header">
          <h1>Welcome to HOF Church</h1>
          <p>Please complete your profile to access the platform</p>
        </div>

        {/* Progress Indicator */}
        <div className="steps-container">
          <div className="steps">
            <div className={`step-dot ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`} />
            <div className={`step-line ${step > 1 ? "completed" : ""}`} />
            <div className={`step-dot ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`} />
            <div className={`step-line ${step > 2 ? "completed" : ""}`} />
            <div className={`step-dot ${step >= 3 ? "active" : ""} ${step === 3 ? "completed" : ""}`} />
          </div>
          <div className="step-labels">
            <span>Personal Info</span>
            <span>Church Assignment</span>
            <span>Review & Submit</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="onboarding-form stagger">
            <div className="form-row">
              <div className="input-group">
                <label className="input-label">First Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="John"
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
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+234..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Date of Birth (Optional)</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Home Address *</label>
              <textarea
                className="input-field textarea-field"
                placeholder="Enter your street address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="onboarding-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Church Assignment */}
        {step === 2 && (
          <form onSubmit={handleNextStep} className="onboarding-form stagger">
            {isLoading ? (
              <div className="form-loading">
                <div className="spinner spinner-lg" />
                <span>Loading options...</span>
              </div>
            ) : (
              <>
                <div className="input-group animate-fade-in-up">
                  <label className="input-label">Church Team (Optional)</label>
                  <select
                    className="input-field"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    <option value="">Select a team (or leave empty)</option>
                    {teams.map((t) => (
                      <option key={t.ID} value={t.ID}>
                        {t.Name}
                      </option>
                    ))}
                  </select>
                  <p className="helper-text">You can change your team assignment later.</p>
                </div>

                <div className="input-group animate-fade-in-up">
                  <label className="input-label">Church Sector (Optional)</label>
                  <select
                    className="input-field"
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                  >
                    <option value="">Select a sector (or leave empty)</option>
                    {sectors.map((s) => (
                      <option key={s.ID} value={s.ID}>
                        {s.Name}
                      </option>
                    ))}
                  </select>
                  <p className="helper-text">Sectors group teams in geographical or structural areas.</p>
                </div>

                <div className="onboarding-actions animate-fade-in-up">
                  <button type="button" className="btn btn-secondary btn-lg" onClick={handlePrevStep}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg">
                    Continue
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="onboarding-form onboarding-review stagger">
            <h3 className="animate-fade-in-up">Confirm details</h3>
            <div className="review-card card animate-fade-in-up">
              <div className="review-row">
                <span className="review-label">Name</span>
                <span className="review-val">{firstName} {lastName}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Phone</span>
                <span className="review-val">{phoneNumber}</span>
              </div>
              {dateOfBirth && (
                <div className="review-row">
                  <span className="review-label">Date of Birth</span>
                  <span className="review-val">{dateOfBirth}</span>
                </div>
              )}
              <div className="review-row">
                <span className="review-label">Address</span>
                <span className="review-val">{address}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Team</span>
                <span className="review-val">
                  {selectedTeam ? teams.find((t) => t.ID === selectedTeam)?.Name : "None"}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Sector</span>
                <span className="review-val">
                  {selectedSector ? sectors.find((s) => s.ID === selectedSector)?.Name : "None"}
                </span>
              </div>
            </div>

            <div className="onboarding-actions animate-fade-in-up">
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Submitting...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
