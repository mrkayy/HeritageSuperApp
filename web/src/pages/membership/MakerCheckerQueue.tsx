import React, { useState, useEffect } from 'react';
import { MembershipService, ProfileChangeRequest } from '@/services/membershipService';

export const MakerCheckerQueue: React.FC = () => {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.listPendingChangeRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load pending change requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, approved: boolean) => {
    try {
      const reason = rejectionReason[id] || '';
      await MembershipService.reviewChangeRequest(id, approved, reason);
      loadRequests();
    } catch (err) {
      alert('Review failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Maker-Checker Profile Approval Queue</h1>
          <p className="text-sm text-slate-500">Review member profile edits submitted by church team leads before they update the database.</p>
        </div>
        <button onClick={loadRequests} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading pending requests...</div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500">
          No pending profile change requests in queue.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{req.member_name}</h3>
                  <p className="text-xs text-slate-500">Requested by: <span className="font-medium">{req.requested_by_name}</span> • {new Date(req.created_at).toLocaleString()}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Pending Review
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                <pre>{JSON.stringify(JSON.parse(req.payload_json || '{}'), null, 2)}</pre>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleReview(req.id, true)}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Approve & Apply Edit
                </button>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Reason for rejection (optional)"
                    value={rejectionReason[req.id] || ''}
                    onChange={(e) => setRejectionReason({ ...rejectionReason, [req.id]: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <button
                    onClick={() => handleReview(req.id, false)}
                    className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm"
                  >
                    Reject Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
