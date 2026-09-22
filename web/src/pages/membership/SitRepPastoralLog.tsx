import React, { useState } from 'react';
import { MembershipService, SituationReport } from '@/services/membershipService';

export const SitRepPastoralLog: React.FC = () => {
  const [memberId, setMemberId] = useState('');
  const [reports, setReports] = useState<SituationReport[]>([]);
  const [loading, setLoading] = useState(false);

  // New SitRep Form
  const [category, setCategory] = useState('health');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const handleFetchReports = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await MembershipService.listSitRepsForMember(memberId);
      setReports(data);
    } catch (err) {
      alert('Failed to fetch pastoral care history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSitRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      alert('Please enter a Member ID');
      return;
    }
    try {
      await MembershipService.createSitRep({
        member_id: memberId,
        category,
        notes,
        action_taken: actionTaken,
        is_urgent: isUrgent,
      });
      setNotes('');
      setActionTaken('');
      setIsUrgent(false);
      const data = await MembershipService.listSitRepsForMember(memberId);
      setReports(data);
    } catch (err) {
      alert('Failed to log pastoral situation report');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pastoral Care & Longitudinal Situation Reports (SitRep)</h1>
        <p className="text-sm text-slate-500">Log pastoral counseling, health, or crisis notes with automatic urgent email notifications to pastors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white text-base">File New Situation Report</h2>

          <form onSubmit={handleCreateSitRep} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Target Member ID</label>
              <input
                type="text"
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Paste Member UUID"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              >
                <option value="health">Health / Hospitalization</option>
                <option value="bereavement">Bereavement / Funeral</option>
                <option value="childbirth">Childbirth / Dedication</option>
                <option value="academic_distress">Academic Distress</option>
                <option value="job_loss">Job Loss / Financial Need</option>
                <option value="counseling">Pastoral Counseling</option>
                <option value="relocation">Relocation</option>
                <option value="general">General Pastoral Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Situation Notes</label>
              <textarea
                rows={3}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details of the situation..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Action Taken / Follow-Up Plan</label>
              <textarea
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Pastoral action or hospital visit scheduled..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="urg"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="urg" className="text-xs text-rose-900 dark:text-rose-300 font-semibold">
                Mark as URGENT (Triggers immediate Email to Resident Pastor)
              </label>
            </div>

            <button type="submit" className="w-full py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm">
              Save SitRep to Care Log
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleFetchReports} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Member UUID to view historical care timeline..."
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
            <button type="submit" className="px-4 py-2 text-xs bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-medium">
              Fetch Care Log
            </button>
          </form>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading pastoral care history...</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
              Enter a valid Member ID above to view longitudinal care history.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {rep.category}
                      </span>
                      {rep.is_urgent && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-600 text-white animate-pulse">
                          URGENT ALERT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{new Date(rep.created_at).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{rep.notes}</p>
                  {rep.action_taken && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                      Action Taken: {rep.action_taken}
                    </p>
                  )}
                  <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>Filed by: {rep.filed_by_name}</span>
                    <span>{rep.pastor_reviewed ? '✓ Reviewed by Pastor' : 'Pending Pastor Review'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
