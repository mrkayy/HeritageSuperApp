import React, { useState, useEffect } from 'react';
import { MembershipService, VolunteerApplication } from '@/services/membershipService';

export const VolunteerIntake: React.FC = () => {
  const [apps, setApps] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetTeamId, setTargetTeamId] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.listVolunteerApplications();
      setApps(data);
    } catch (err) {
      console.error('Failed to load volunteer applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlace = async (appId: string) => {
    const teamId = targetTeamId[appId];
    if (!teamId) {
      alert('Please enter or select target team ID');
      return;
    }
    try {
      await MembershipService.placeVolunteer(appId, teamId);
      loadApps();
    } catch (err) {
      alert('Failed to place volunteer');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Volunteering Intake & Placement (Post-Module 2)</h1>
          <p className="text-sm text-slate-500">Assign graduates completing Sunday School Module 2 to workforce teams.</p>
        </div>
        <button onClick={loadApps} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
          Refresh Applications
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading intake applications...</div>
      ) : apps.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500">
          No pending volunteer applications.
        </div>
      ) : (
        <div className="grid gap-4">
          {apps.map((app) => (
            <div key={app.id} className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{app.member_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Skills / Notes: {app.skills_notes || 'None provided'}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded">
                    Pref 1: {app.preferred_team_1_name || 'Protocol'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded">
                    Pref 2: {app.preferred_team_2_name || 'Ushering'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                {app.status === 'placed' ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Placed in Team
                  </span>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Target Team UUID"
                      value={targetTeamId[app.id] || ''}
                      onChange={(e) => setTargetTeamId({ ...targetTeamId, [app.id]: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <button
                      onClick={() => handlePlace(app.id)}
                      className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm whitespace-nowrap"
                    >
                      Assign to Team
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
