import React, { useState, useEffect } from 'react';
import { MembershipService, AcademyCohort, CohortEnrollment } from '@/services/membershipService';

export const DiscipleshipAcademy: React.FC = () => {
  const [cohorts, setCohorts] = useState<AcademyCohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<AcademyCohort | null>(null);
  const [enrollments, setEnrollments] = useState<CohortEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // New Cohort Form
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [moduleType, setModuleType] = useState('foundation_class');
  const [cohortName, setCohortName] = useState('');
  const [startDate, setStartDate] = useState('');

  // Grading Modal State
  const [gradingEnrollment, setGradingEnrollment] = useState<CohortEnrollment | null>(null);
  const [scores, setScores] = useState({
    assignment_score: 0,
    verbal_assessment_score: 0,
    participation_score: 0,
    disciplers_report_score: 0,
    proof_of_note_score: 0,
    attendance_score: 0,
    discipler_devotion_rating: 5,
    discipler_evangelism_rating: 5,
    makeup_completed: false,
  });

  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.listCohorts();
      setCohorts(data);
      if (data.length > 0 && !selectedCohort) {
        setSelectedCohort(data[0]);
        loadEnrollments(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cohorts', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async (cohortId: string) => {
    try {
      const data = await MembershipService.listEnrollments(cohortId);
      setEnrollments(data);
    } catch (err) {
      console.error('Failed to load enrollments', err);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MembershipService.createCohort({
        module_type: moduleType,
        cohort_name: cohortName,
        start_date: startDate || new Date().toISOString().split('T')[0],
      });
      setShowCohortModal(false);
      setCohortName('');
      loadCohorts();
    } catch (err) {
      alert('Failed to create cohort');
    }
  };

  const handleOpenGrading = (enr: CohortEnrollment) => {
    setGradingEnrollment(enr);
    if (enr.assessment) {
      setScores({
        assignment_score: enr.assessment.assignment_score || 0,
        verbal_assessment_score: enr.assessment.verbal_assessment_score || 0,
        participation_score: enr.assessment.participation_score || 0,
        disciplers_report_score: enr.assessment.disciplers_report_score || 0,
        proof_of_note_score: enr.assessment.proof_of_note_score || 0,
        attendance_score: enr.assessment.attendance_score || 0,
        discipler_devotion_rating: enr.assessment.discipler_devotion_rating || 5,
        discipler_evangelism_rating: enr.assessment.discipler_evangelism_rating || 5,
        makeup_completed: enr.assessment.makeup_completed || false,
      });
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingEnrollment) return;
    try {
      await MembershipService.gradeAssessment(gradingEnrollment.id, scores);
      setGradingEnrollment(null);
      if (selectedCohort) loadEnrollments(selectedCohort.id);
    } catch (err) {
      alert('Failed to save assessment');
    }
  };

  const handleGraduate = async (enrollmentId: string) => {
    if (!confirm('Promote student to next discipleship stage?')) return;
    try {
      await MembershipService.graduateEnrollment(enrollmentId);
      if (selectedCohort) loadEnrollments(selectedCohort.id);
    } catch (err) {
      alert('Failed to graduate student');
    }
  };

  const totalCalculated =
    Number(scores.assignment_score) +
    Number(scores.verbal_assessment_score) +
    Number(scores.participation_score) +
    Number(scores.disciplers_report_score) +
    Number(scores.proof_of_note_score) +
    Number(scores.attendance_score);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discipleship Academy Pipeline & CA Engine</h1>
          <p className="text-sm text-slate-500">Track academy cohorts, 6-part weighted continuous assessment (50% pass mark), and stage progression.</p>
        </div>
        <button
          onClick={() => setShowCohortModal(true)}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
        >
          + Create Academy Cohort
        </button>
      </div>

      {/* Cohort Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-700">
        {cohorts.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCohort(c);
              loadEnrollments(c.id);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              selectedCohort?.id === c.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {c.cohort_name} ({c.module_type.replace(/_/g, ' ')})
          </button>
        ))}
      </div>

      {/* Enrollment Table */}
      {selectedCohort && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Enrolled Students in {selectedCohort.cohort_name}
            </h3>
            <span className="text-xs text-slate-500">Pass Mark: 50% Weighted CA</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Assignment (20)</th>
                  <th className="p-3">Verbal (20)</th>
                  <th className="p-3">Participation (20)</th>
                  <th className="p-3">Discipler (20)</th>
                  <th className="p-3">Notes (10)</th>
                  <th className="p-3">Attendance (10)</th>
                  <th className="p-3">Total (100)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400">
                      No students enrolled in this cohort yet.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enr) => {
                    const ca = enr.assessment;
                    const isPassed = ca && ca.total_score >= 50;
                    return (
                      <tr key={enr.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3 font-medium">{enr.member_name}</td>
                        <td className="p-3">{ca ? ca.assignment_score : 0}</td>
                        <td className="p-3">{ca ? ca.verbal_assessment_score : 0}</td>
                        <td className="p-3">{ca ? ca.participation_score : 0}</td>
                        <td className="p-3">{ca ? ca.disciplers_report_score : 0}</td>
                        <td className="p-3">{ca ? ca.proof_of_note_score : 0}</td>
                        <td className="p-3">{ca ? ca.attendance_score : 0}</td>
                        <td className="p-3 font-bold">{ca ? ca.total_score : 0}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                              enr.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : enr.status === 'makeup_required'
                                ? 'bg-amber-100 text-amber-800'
                                : enr.status === 'retake_required'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {enr.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleOpenGrading(enr)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-medium"
                          >
                            Grade CA
                          </button>
                          {isPassed && enr.status !== 'passed' && (
                            <button
                              onClick={() => handleGraduate(enr.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                            >
                              Graduate Stage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingEnrollment && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveGrade} className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Continuous Assessment — {gradingEnrollment.member_name}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Class Assignment (Max 20)</label>
                <input
                  type="number"
                  max={20}
                  value={scores.assignment_score}
                  onChange={(e) => setScores({ ...scores, assignment_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Verbal Assessment (Max 20)</label>
                <input
                  type="number"
                  max={20}
                  value={scores.verbal_assessment_score}
                  onChange={(e) => setScores({ ...scores, verbal_assessment_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Participation (Max 20)</label>
                <input
                  type="number"
                  max={20}
                  value={scores.participation_score}
                  onChange={(e) => setScores({ ...scores, participation_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Discipler Report (Max 20)</label>
                <input
                  type="number"
                  max={20}
                  value={scores.disciplers_report_score}
                  onChange={(e) => setScores({ ...scores, disciplers_report_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Proof of Note (Max 10)</label>
                <input
                  type="number"
                  max={10}
                  value={scores.proof_of_note_score}
                  onChange={(e) => setScores({ ...scores, proof_of_note_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Attendance (Max 10)</label>
                <input
                  type="number"
                  max={10}
                  value={scores.attendance_score}
                  onChange={(e) => setScores({ ...scores, attendance_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Calculated Score:</span>
              <span className={`text-lg font-bold ${totalCalculated >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalCalculated} / 100 ({totalCalculated >= 50 ? 'PASSED' : 'FAILED / MAKEUP'})
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGradingEnrollment(null)}
                className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                Save & Update Score
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cohort Modal */}
      {showCohortModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateCohort} className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Create Discipleship Cohort</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Cohort Name</label>
              <input
                type="text"
                required
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                placeholder="e.g. Foundation Class Cohort 2026-A"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Module Type</label>
              <select
                value={moduleType}
                onChange={(e) => setModuleType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              >
                <option value="foundation_class">Foundation Class</option>
                <option value="sunday_school_module_1">Sunday School Module 1</option>
                <option value="sunday_school_module_2">Sunday School Module 2</option>
                <option value="sunday_school_module_3">Sunday School Module 3</option>
                <option value="membership_class">Membership Class</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCohortModal(false)}
                className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">
                Create Cohort
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
