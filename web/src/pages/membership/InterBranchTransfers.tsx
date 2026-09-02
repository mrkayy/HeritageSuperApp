import React, { useState, useEffect } from 'react';
import { MembershipService, MemberTransfer } from '@/services/membershipService';

export const InterBranchTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<MemberTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // New Transfer Form
  const [memberId, setMemberId] = useState('');
  const [destChurchId, setDestChurchId] = useState('');
  const [reason, setReason] = useState('');
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.listInboundTransfers();
      setTransfers(data);
    } catch (err) {
      console.error('Failed to load inbound transfers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !destChurchId) {
      alert('Please fill out member ID and destination church ID');
      return;
    }
    try {
      await MembershipService.initiateTransfer({
        member_id: memberId,
        destination_church_id: destChurchId,
        transfer_reason: reason,
        pastoral_recommendation: recommendation,
      });
      setMemberId('');
      setReason('');
      setRecommendation('');
      alert('Inter-branch transfer initiated successfully');
      loadTransfers();
    } catch (err) {
      alert('Failed to initiate transfer');
    }
  };

  const handleReviewTransfer = async (transferId: string, approved: boolean) => {
    try {
      await MembershipService.reviewTransfer(transferId, approved);
      loadTransfers();
    } catch (err) {
      alert('Failed to review transfer');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inter-Branch Member Transfer & Migration</h1>
          <p className="text-sm text-slate-500">Initiate transfers to other branches or approve inbound member migrations.</p>
        </div>
        <button onClick={loadTransfers} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">
          Refresh Inbound Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white text-base">Initiate Member Transfer</h2>

          <form onSubmit={handleInitiateTransfer} className="space-y-4">
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
              <label className="block text-xs font-medium mb-1">Destination Local Church UUID</label>
              <input
                type="text"
                required
                value={destChurchId}
                onChange={(e) => setDestChurchId(e.target.value)}
                placeholder="e.g. Lekki / Ikeja Branch UUID"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Transfer Reason</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Relocation, job transfer..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Pastoral Recommendation</label>
              <textarea
                rows={2}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="Pastor notes for destination branch..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg"
              />
            </div>

            <button type="submit" className="w-full py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm">
              Initiate Outbound Transfer
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inbound Transfers Awaiting Approval</h2>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading inbound transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
              No inbound transfer requests from other branches.
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((mt) => (
                <div key={mt.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{mt.member_name}</h3>
                      <p className="text-xs text-slate-500">
                        Origin: <span className="font-medium">{mt.origin_church_name}</span> • Initiated by: {mt.initiated_by_name}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending Inbound Approval
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-xs space-y-1">
                    <p><span className="font-semibold">Reason:</span> {mt.transfer_reason || 'N/A'}</p>
                    <p><span className="font-semibold">Pastoral Note:</span> {mt.pastoral_recommendation || 'N/A'}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewTransfer(mt.id, true)}
                      className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
                    >
                      Accept Member & Complete Transfer
                    </button>
                    <button
                      onClick={() => handleReviewTransfer(mt.id, false)}
                      className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg"
                    >
                      Reject Transfer
                    </button>
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
