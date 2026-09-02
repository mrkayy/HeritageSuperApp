import React, { useState, useEffect } from 'react';
import { MembershipService, FirstTimerAssignment, WeeklyPastoralSummary } from '@/services/membershipService';

export const FirstTimerCRM: React.FC = () => {
  const [assignments, setAssignments] = useState<FirstTimerAssignment[]>([]);
  const [summary, setSummary] = useState<WeeklyPastoralSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMember, setSelectedMember] = useState<FirstTimerAssignment | null>(null);
  const [outcome, setOutcome] = useState('reached_welcomed');
  const [notes, setNotes] = useState('');
  const [escalate, setEscalate] = useState(false);

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      setLoading(true);
      const [assData, sumData] = await Promise.all([
        MembershipService.listMyAssignedFirstTimers(),
        MembershipService.getWeeklyPastoralSummary(),
      ]);
      setAssignments(assData);
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load CRM data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      await MembershipService.logCall({
        member_id: selectedMember.member_id,
        outcome,
        summary_notes: notes,
        pastoral_escalation_needed: escalate,
      });
      setSelectedMember(null);
      setNotes('');
      setEscalate(false);
      loadCRMData();
    } catch (err) {
      alert('Failed to log call outcome');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">First-Timer Call CRM & Weekly Pastoral Summary</h1>
          <p className="text-sm text-slate-500">Manage delegated first-timer follow-up calls and collate weekly pastoral stats.</p>
        </div>
        <button onClick={loadCRMData} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
          Refresh CRM
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Total First Timers (Week)</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary.total_first_timers_received}</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Calls Completed</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{summary.total_calls_completed}</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase">Unreachable / Callback</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{summary.total_unreachable}</p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase">Pastoral Escalations</p>
            <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{summary.pastoral_escalation_count}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Delegated Follow-Up Queue</h2>
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500">
              No first-timers currently assigned to you.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((item) => (
                <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.member_name}</h3>
                    <p className="text-xs text-slate-500">Phone: {item.member_phone || 'N/A'} • First Visit: {item.first_visit_date}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                      Stage: {item.current_stage}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedMember(item)}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                  >
                    Log Call Feedback
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Log Call Feedback</h2>
          {selectedMember ? (
            <form onSubmit={handleLogCall} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
              <div>
                <p className="text-xs text-slate-500">Logging call for</p>
                <p className="font-semibold text-slate-900 dark:text-white">{selectedMember.member_name}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Call Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="reached_welcomed">Reached & Welcomed</option>
                  <option value="unreachable">Unreachable</option>
                  <option value="requested_callback">Requested Callback</option>
                  <option value="pastoral_attention">Pastoral Attention Needed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Summary Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes from the call..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esc"
                  checked={escalate}
                  onChange={(e) => setEscalate(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="esc" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  Escalate to Resident Pastor
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  Submit Log
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
              Select a member from the queue on the left to log call details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
