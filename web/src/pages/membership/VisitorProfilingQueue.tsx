import React, { useState, useEffect } from 'react';
import { MembershipService, UnprofiledVisitor } from '@/services/membershipService';

export const VisitorProfilingQueue: React.FC = () => {
  const [visitors, setVisitors] = useState<UnprofiledVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<UnprofiledVisitor | null>(null);

  const [dobDay, setDobDay] = useState<number>(1);
  const [dobMonth, setDobMonth] = useState<number>(1);
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [sendClaimLink, setSendClaimLink] = useState(true);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.listUnprofiledVisitors();
      setVisitors(data);
    } catch (err) {
      console.error('Failed to load unprofiled visitors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitor) return;
    try {
      await MembershipService.profileVisitorFull(selectedVisitor.id, {
        email,
        date_of_birth_day: Number(dobDay),
        date_of_birth_month: Number(dobMonth),
        marital_status: maritalStatus,
        occupation,
        send_claim_magic_link: sendClaimLink,
      });
      setSelectedVisitor(null);
      loadVisitors();
    } catch (err) {
      alert('Failed to profile visitor');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gatekeeper Visitor Profiling Queue</h1>
          <p className="text-sm text-slate-500">Transform unprofiled guests/first-timers into fully profiled members with account claim links.</p>
        </div>
        <button onClick={loadVisitors} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
          Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Unprofiled Visitors</h2>
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading unprofiled visitors...</div>
          ) : visitors.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500">
              No unprofiled visitors in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {visitors.map((v) => (
                <div key={v.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{v.first_name} {v.last_name}</h3>
                    <p className="text-xs text-slate-500">Phone: {v.phone_number} • Visits: {v.visit_count}</p>
                    {v.foundation_recommended && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Recommended for Foundation Class
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedVisitor(v);
                      setEmail(v.email || '');
                    }}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                  >
                    Profile Member
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Complete Member Profile</h2>
          {selectedVisitor ? (
            <form onSubmit={handleProfileVisitor} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
              <div>
                <p className="text-xs text-slate-500">Profiling</p>
                <p className="font-semibold text-slate-900 dark:text-white">{selectedVisitor.first_name} {selectedVisitor.last_name}</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Birth Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dobDay}
                    onChange={(e) => setDobDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Birth Month (1-12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={dobMonth}
                    onChange={(e) => setDobMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Marital Status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="claim"
                  checked={sendClaimLink}
                  onChange={(e) => setSendClaimLink(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="claim" className="text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                  Dispatch Magic Account Claim Email
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  Save & Profile
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVisitor(null)}
                  className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
              Select a visitor from the queue on the left to profile them.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
