import React, { useState, useEffect } from 'react';
import { MembershipService, CelebrationAlert, MemberLandmark } from '@/services/membershipService';

export const CelebrationsLandmarks: React.FC = () => {
  const [alerts, setAlerts] = useState<CelebrationAlert[]>([]);
  const [landmarks, setLandmarks] = useState<MemberLandmark[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLandmarkModal, setShowLandmarkModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [landmarkType, setLandmarkType] = useState('graduation');
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertData, landmarkData] = await Promise.all([
        MembershipService.getUpcomingCelebrations(3),
        MembershipService.listLandmarks(),
      ]);
      setAlerts(alertData);
      setLandmarks(landmarkData);
    } catch (err) {
      console.error('Failed to load celebration alerts & landmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLandmark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MembershipService.createLandmark({
        member_id: memberId,
        landmark_type: landmarkType,
        title,
        institution_or_org: institution,
        event_date: eventDate || new Date().toISOString().split('T')[0],
        notes,
      });
      setShowLandmarkModal(false);
      setTitle('');
      setInstitution('');
      setNotes('');
      loadData();
    } catch (err) {
      alert('Failed to log milestone landmark');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Milestone Celebrations & 3-Day Alert Engine</h1>
          <p className="text-sm text-slate-500">Proactively track member birthdays/anniversaries (3-day window) and university graduation landmarks.</p>
        </div>
        <button
          onClick={() => setShowLandmarkModal(true)}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
        >
          + Log Landmark Achievement
        </button>
      </div>

      {/* Proactive 3-Day Alert Banner */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span>🎉 Proactive 3-Day Celebrant Alerts</span>
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-medium">3-Day Window</span>
        </h2>
        {loading ? (
          <div className="p-4 text-center text-slate-500">Scanning celebrants...</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
            No birthdays or wedding anniversaries occurring within the next 3 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((item, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  🎂
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.member_name}</h4>
                  <p className="text-xs text-amber-900 dark:text-amber-300 font-medium capitalize">
                    {item.type} • {item.date_label} ({item.days_remaining === 0 ? 'Today!' : `in ${item.days_remaining} day(s)`})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Phone: {item.phone || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* University & Life Landmarks Registry */}
      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">University & Career Landmarks Registry</h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="p-3">Member Name</th>
                <th className="p-3">Landmark Type</th>
                <th className="p-3">Title / Degree</th>
                <th className="p-3">Institution / Org</th>
                <th className="p-3">Event Date</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {landmarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No academic or career landmarks logged yet.
                  </td>
                </tr>
              ) : (
                landmarks.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{l.member_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded uppercase">
                        {l.landmark_type}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{l.title}</td>
                    <td className="p-3">{l.institution_or_org || 'N/A'}</td>
                    <td className="p-3">{new Date(l.event_date).toLocaleDateString()}</td>
                    <td className="p-3 text-slate-500">{l.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Landmark Modal */}
      {showLandmarkModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateLandmark} className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Log Member Landmark</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Member UUID</label>
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
              <label className="block text-xs font-medium mb-1">Landmark Type</label>
              <select
                value={landmarkType}
                onChange={(e) => setLandmarkType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              >
                <option value="graduation">University Graduation</option>
                <option value="childbirth">Childbirth / Naming</option>
                <option value="wedding">Wedding / Marriage</option>
                <option value="career">Career Promotion / Award</option>
                <option value="custom">Custom Milestone</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Title / Degree</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. B.Sc Computer Science (First Class)"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Institution / Organization</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. University of Lagos"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLandmarkModal(false)}
                className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">
                Save Landmark
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
