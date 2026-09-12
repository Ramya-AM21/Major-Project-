import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw, Layers, MapPin, Clock, FileText, Check } from 'lucide-react';

interface FraudAssessment {
  id: string;
  taskId: string;
  volunteerId: string;
  riskScore: number;
  riskLevel: string;
  anomalyScore: number;
  gpsRisk: number;
  routeRisk: number;
  behaviourRisk: number;
  proofRisk: number;
  timeRisk: number;
  ocrRisk: number;
  perceptualHash: string;
  reasons: string;
  modelName: string;
  modelVersion: string;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface Props {
  onOpenImageModal?: (url: string, title: string) => void;
}

export const FraudReviewTab: React.FC<Props> = ({ onOpenImageModal }) => {
  const [assessments, setAssessments] = useState<FraudAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'HIGH' | 'MEDIUM'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/admin/fraud/assessments');
      setAssessments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch fraud assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setFeedback(null);
    try {
      await axios.post(`/api/v1/admin/fraud/assessments/${id}/approve`);
      setFeedback({ type: 'success', text: 'Assessment APPROVED. Delivery payout released and task marked completed.' });
      fetchAssessments();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.response?.data?.message || 'Failed to approve assessment.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    setFeedback(null);
    try {
      await axios.post(`/api/v1/admin/fraud/assessments/${id}/reject`);
      setFeedback({ type: 'success', text: 'Assessment REJECTED. Delivery proof flagged for fraud and reward withheld.' });
      fetchAssessments();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.response?.data?.message || 'Failed to reject assessment.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoadingId(id);
    setFeedback(null);
    try {
      await axios.post(`/api/v1/admin/fraud/assessments/${id}/dismiss`);
      setFeedback({ type: 'success', text: 'Assessment DISMISSED.' });
      fetchAssessments();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.response?.data?.message || 'Failed to dismiss assessment.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const parseReasons = (reasonsJson: string): string[] => {
    try {
      if (!reasonsJson) return [];
      if (reasonsJson.startsWith('[')) {
        return JSON.parse(reasonsJson);
      }
      return [reasonsJson];
    } catch {
      return [reasonsJson];
    }
  };

  const filteredAssessments = assessments.filter(a => {
    if (filter === 'PENDING') return a.reviewStatus === 'PENDING';
    if (filter === 'HIGH') return a.riskLevel === 'HIGH';
    if (filter === 'MEDIUM') return a.riskLevel === 'MEDIUM';
    return true;
  });

  const stats = {
    total: assessments.length,
    pending: assessments.filter(a => a.reviewStatus === 'PENDING').length,
    highRisk: assessments.filter(a => a.riskLevel === 'HIGH').length,
    mediumRisk: assessments.filter(a => a.riskLevel === 'MEDIUM').length,
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-sm uppercase tracking-wider text-natural-text">ML Fraud Detection & Risk Review</h2>
          </div>
          <p className="text-xs text-natural-muted mt-1 font-semibold">
            Hybrid Isolation Forest, dHash Perceptual Hashing & Spatial Telemetry Audit Engine
          </p>
        </div>

        <button
          onClick={fetchAssessments}
          className="btn-secondary py-1.5 px-3 text-xs normal-case self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
          <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Total Audits</span>
          <h3 className="text-xl font-mono font-black text-natural-text mt-1">{stats.total}</h3>
        </div>
        <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider block">Pending Review</span>
          <h3 className="text-xl font-mono font-black text-amber-700 mt-1">{stats.pending}</h3>
        </div>
        <div className="bg-red-50/20 p-4 rounded-xl border border-red-200 shadow-xs">
          <span className="text-[10px] text-red-800 uppercase font-bold tracking-wider block">High Risk Flags</span>
          <h3 className="text-xl font-mono font-black text-red-700 mt-1">{stats.highRisk}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
          <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Medium Risk</span>
          <h3 className="text-xl font-mono font-black text-amber-600 mt-1">{stats.mediumRisk}</h3>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-natural-border pb-2">
        {(['ALL', 'PENDING', 'HIGH', 'MEDIUM'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
              filter === tab
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-natural-border text-natural-muted hover:text-natural-text'
            }`}
          >
            {tab} AUDITS
          </button>
        ))}
      </div>

      {/* List View */}
      {loading ? (
        <div className="p-12 text-center text-natural-muted font-semibold text-xs bg-white rounded-2xl border border-natural-border">
          Analyzing risk scores and perceptual hashes...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="p-12 text-center text-natural-muted font-semibold text-xs bg-white rounded-2xl border border-natural-border border-dashed">
          No fraud risk assessments matching the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssessments.map((item) => {
            const reasons = parseReasons(item.reasons);
            const isHigh = item.riskLevel === 'HIGH';
            const isMedium = item.riskLevel === 'MEDIUM';

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition space-y-4 ${
                  isHigh
                    ? 'border-red-300 bg-red-50/5'
                    : isMedium
                    ? 'border-amber-300 bg-amber-50/5'
                    : 'border-natural-border'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-natural-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-natural-text">
                        Task #{item.taskId.substring(0, 8)}
                      </span>
                      <span className="text-[10px] text-natural-muted font-mono">
                        (Volunteer: #{item.volunteerId.substring(0, 8)})
                      </span>
                    </div>
                    <span className="text-[10px] text-natural-muted font-mono block mt-0.5">
                      Audited: {new Date(item.createdAt).toLocaleString()} • Model: {item.modelName} ({item.modelVersion})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border ${
                        isHigh
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : isMedium
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {item.riskLevel} RISK ({Math.round(item.riskScore)}/100)
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                        item.reviewStatus === 'APPROVED' || item.reviewStatus === 'AUTO_APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.reviewStatus === 'REJECTED'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.reviewStatus}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-[#FAF9F5] p-3 rounded-xl border border-natural-border text-[10px] font-mono">
                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">GPS Telemetry</span>
                    <span className={`font-bold block mt-0.5 ${item.gpsRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.gpsRisk)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Route Deviation</span>
                    <span className={`font-bold block mt-0.5 ${item.routeRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.routeRisk)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Volunteer History</span>
                    <span className={`font-bold block mt-0.5 ${item.behaviourRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.behaviourRisk)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Perceptual Proof</span>
                    <span className={`font-bold block mt-0.5 ${item.proofRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.proofRisk)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Time Anomaly</span>
                    <span className={`font-bold block mt-0.5 ${item.timeRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.timeRisk)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">OCR Match</span>
                    <span className={`font-bold block mt-0.5 ${item.ocrRisk > 40 ? 'text-red-700' : 'text-natural-text'}`}>
                      {Math.round(item.ocrRisk)}%
                    </span>
                  </div>
                </div>

                {/* Detected Reasons */}
                {reasons.length > 0 && (
                  <div className="space-y-1.5 bg-red-50/20 p-3 rounded-xl border border-red-200 text-xs">
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-red-800">
                      Audit Flags & Anomaly Triggers
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-natural-text font-medium text-[11px]">
                      {reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Perceptual Hash Tag */}
                {item.perceptualHash && (
                  <div className="text-[9px] font-mono text-natural-muted flex items-center gap-1.5">
                    <span className="font-bold uppercase tracking-wider text-natural-muted">dHash Fingerprint:</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-natural-text border border-natural-border font-mono truncate max-w-md">
                      {item.perceptualHash}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {item.reviewStatus === 'PENDING' && (
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-natural-border pt-3">
                    <button
                      onClick={() => handleDismiss(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-natural-border text-natural-muted hover:text-natural-text bg-white rounded-lg transition-colors"
                    >
                      Dismiss Alert
                    </button>

                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Flag / Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve Payout</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default FraudReviewTab;
