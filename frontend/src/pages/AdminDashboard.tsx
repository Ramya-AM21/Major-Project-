import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { 
  AlertTriangle, Check, ShieldAlert, BarChart3, Settings, MapPin, Loader2, Bot, HelpCircle
} from 'lucide-react';
import axios from 'axios';

interface AnomalyEvent {
  taskId: string;
  volunteerName: string;
  reason: string;
  risk: string;
}

interface ShelterZone {
  id: string;
  name: string;
  address: string;
  capacity: number;
  priorityScore: number;
  status: string;
}

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const [stats, setStats] = useState({
    activeDonations: 0,
    activeDeliveries: 0,
    volunteersOnline: 0,
    highPriorityZones: 0,
    completedToday: 0,
    suspiciousEvents: 0,
    totalKgSaved: 0.1,
    totalMealsDelivered: 0.1
  });

  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [zones, setZones] = useState<ShelterZone[]>([]);
  
  // Predict demand modal/indicator
  const [selectedZone, setSelectedZone] = useState<ShelterZone | null>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  // Pending Community Need Reports states
  const [pendingNeeds, setPendingNeeds] = useState<any[]>([]);
  const [needsLoading, setNeedsLoading] = useState(true);

  // Shelter verifications tab states
  const [pendingShelters, setPendingShelters] = useState<any[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingShelterId, setRejectingShelterId] = useState<string | null>(null);

  const fetchAdminConsole = async () => {
    try {
      const [statsRes, tasksRes, zonesRes, needsRes, pendingSheltersRes] = await Promise.all([
        axios.get('/api/v1/analytics/admin'),
        axios.get('/api/v1/tasks'),
        axios.get('/api/v1/zones'),
        axios.get('/api/v1/zones/community-needs/pending'),
        axios.get('/api/v1/admin/shelters/pending')
      ]);

      setStats(statsRes.data);
      setZones(zonesRes.data || []);
      setPendingNeeds(needsRes.data || []);
      setPendingShelters(pendingSheltersRes.data || []);
      setSheltersLoading(false);
      setNeedsLoading(false);

      // Compile anomalies based on tasks with verification confidence score < 75% or custom travel speed anomalies
      const suspiciousList: AnomalyEvent[] = [];
      
      // Let's check task validations
      for (const t of tasksRes.data) {
        if (t.status === 'COMPLETED' || t.status === 'DELIVERED' || t.status === 'VERIFICATION_PENDING') {
          // fetch verification details if exists
          try {
            const verRes = await axios.get(`/api/v1/verification/task/${t.id}`);
            const ver = verRes.data;
            if (ver && ver.verificationConfidence < 0.75) {
              suspiciousList.push({
                taskId: t.id,
                volunteerName: t.volunteer?.user?.name || 'Unknown Volunteer',
                reason: ver.deliveryRadiusVerified ? 'Suspicious confirmation image hash' : 'GPS boundaries mismatch (>250m from shelter)',
                risk: ver.verificationConfidence < 0.60 ? 'HIGH RISK' : 'SUSPICIOUS'
              });
            }
          } catch {
            // no verification
          }
        }
      }


      setAnomalies(suspiciousList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminConsole();
    const intervalId = setInterval(fetchAdminConsole, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleVerifyNeed = async (id: string) => {
    try {
      await axios.put(`/api/v1/zones/community-needs/${id}/verify`);
      fetchAdminConsole();
    } catch {
      alert("Failed to verify community need.");
    }
  };

  const handleRejectNeed = async (id: string) => {
    try {
      await axios.put(`/api/v1/zones/community-needs/${id}/reject`);
      fetchAdminConsole();
    } catch {
      alert("Failed to reject community need.");
    }
  };

  const handleReviewNeed = async (id: string) => {
    try {
      await axios.put(`/api/v1/zones/community-needs/${id}/review`);
      fetchAdminConsole();
    } catch {
      alert("Failed to set community need under review.");
    }
  };

  const handleVerifyShelter = async (id: string) => {
    try {
      await axios.post(`/api/v1/admin/shelters/${id}/verify`);
      alert("Shelter verification approved!");
      fetchAdminConsole();
    } catch {
      alert("Failed to verify shelter.");
    }
  };

  const handleRejectShelter = async (id: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await axios.post(`/api/v1/admin/shelters/${id}/reject`, { reason: rejectionReason });
      alert("Shelter verification rejected.");
      setRejectionReason('');
      setRejectingShelterId(null);
      fetchAdminConsole();
    } catch {
      alert("Failed to reject shelter.");
    }
  };

  const triggerPrediction = async (zone: ShelterZone) => {
    setSelectedZone(zone);
    setPredictionData(null);
    setPredictLoading(true);
    try {
      const res = await axios.get(`/api/v1/zones/${zone.id}/predict`);
      setPredictionData(res.data);
    } catch {
      alert("AI Service prediction failure.");
    } finally {
      setPredictLoading(false);
    }
  };

  const getUrgencyBadge = (priorityVal: string) => {
    switch (priorityVal) {
      case 'HIGH':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-red-200 text-[9px] font-black bg-red-50 text-red-750 uppercase tracking-wider">HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-accent-200 text-[9px] font-black bg-accent-50 text-accent-700 uppercase tracking-wider">MEDIUM</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-brand-200 text-[9px] font-black bg-brand-50 text-brand-700 uppercase tracking-wider">LOW</span>;
    }
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-natural-border pb-5">
        <h1 className="text-xl font-display font-black text-natural-text tracking-tight uppercase font-mono">Platform Administrative Center</h1>
        <p className="text-xs text-natural-muted mt-1 font-semibold">Monitor live transits, audit geographical validations, and fetch AI demand scores</p>
      </div>

      {path === '/admin/dashboard' && (
        <>
          {/* Grid Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
              <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Active Donations</span>
              <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{stats.activeDonations}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
              <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Active Transits</span>
              <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{stats.activeDeliveries}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
              <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Volunteers Active</span>
              <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{stats.volunteersOnline}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-natural-border shadow-xs">
              <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Completed Today</span>
              <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{stats.completedToday}</h3>
            </div>
            <div className="bg-red-50/10 p-4 rounded-xl border border-red-200 shadow-xs">
              <span className="text-[10px] text-red-800 uppercase font-bold tracking-wider block">Suspicious Events</span>
              <h3 className="text-2xl font-mono font-black text-red-700 mt-1">{stats.suspiciousEvents}</h3>
            </div>
            <div className="bg-brand-50/20 p-4 rounded-xl border border-brand-200 shadow-xs">
              <span className="text-[10px] text-brand-800 uppercase font-bold tracking-wider block">Total Food Rescued</span>
              <h3 className="text-2xl font-mono font-black text-brand-650 mt-1">{Math.round(stats.totalKgSaved)} kg</h3>
            </div>
          </div>
        </>
      )}

      {path === '/admin/zones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-natural-border rounded-2xl shadow-xs overflow-hidden h-fit">
              <div className="p-4 border-b border-natural-border bg-[#FAF9F5]">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Verified Shelter Locations</h3>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-natural-muted font-semibold text-xs">Loading zones...</div>
              ) : (
                <div className="divide-y divide-natural-border">
                  {zones.map((zone) => (
                    <div key={zone.id} className="p-4 hover:bg-brand-50/10 transition-colors flex items-center justify-between text-xs font-semibold text-natural-text bg-white">
                      <div>
                        <h4 className="font-bold text-natural-text uppercase">{zone.name}</h4>
                        <p className="text-[10px] text-natural-muted mt-0.5 font-medium">{zone.address}</p>
                        <div className="flex space-x-3 mt-1.5 text-[9px] text-natural-muted font-bold uppercase tracking-wider">
                          <span>Capacity: {zone.capacity} meals</span>
                          <span>•</span>
                          <span className="text-brand-700 font-mono">Priority Score: {zone.priorityScore}/10</span>
                        </div>
                      </div>

                      <button
                        onClick={() => triggerPrediction(zone)}
                        className="btn-secondary py-1.5 px-3 normal-case"
                      >
                        <Bot className="w-3.5 h-3.5 mr-1" />
                        <span>Forecast demand</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-natural-border rounded-2xl shadow-xs overflow-hidden h-fit">
              <div className="p-4 border-b border-natural-border bg-[#FAF9F5] flex justify-between items-center">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Community Need Discovery Queue</h3>
                <span className="text-[9px] bg-amber-55/10 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  Needs Verification
                </span>
              </div>

              {needsLoading ? (
                <div className="p-8 text-center text-natural-muted font-semibold text-xs">Loading pending community reports...</div>
              ) : pendingNeeds.length === 0 ? (
                <div className="p-8 text-center text-natural-muted font-semibold text-xs">No pending community reports requiring review.</div>
              ) : (
                <div className="divide-y divide-natural-border">
                  {pendingNeeds.map((need) => (
                    <div key={need.id} className="p-5 flex flex-col space-y-3.5 text-xs text-left bg-white font-semibold text-natural-text">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-natural-text uppercase text-[12px]">{need.name}</h4>
                          <p className="text-[10px] text-natural-muted mt-0.5 font-medium">{need.address}, {need.city}, {need.state}, {need.country}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold font-mono uppercase tracking-wider border ${
                          need.verificationStatus === 'UNDER_REVIEW' 
                            ? 'bg-blue-50 text-blue-800 border-blue-200' 
                            : need.verificationStatus === 'REQUIRES_REVIEW'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {need.verificationStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-[#FAF9F5] p-3 rounded-xl border border-natural-border text-[9.5px] font-mono">
                        <div>
                          <span className="block text-[7px] uppercase font-bold tracking-wider text-natural-muted font-sans">Need Details</span>
                          <span className="text-natural-text font-bold block mt-0.5">Category: {need.needCategory}</span>
                          <span className="text-natural-text font-bold block">Scale: ~{need.estimatedPeople} people</span>
                        </div>
                        <div>
                          <span className="block text-[7px] uppercase font-bold tracking-wider text-natural-muted font-sans">Observation Time</span>
                          <span className="text-natural-text font-bold block mt-0.5">Reported: {new Date(need.createdAt).toLocaleDateString()}</span>
                          <span className="text-natural-text font-bold block">Source: {need.source.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-natural-border/50">
                          <span className="block text-[7px] uppercase font-bold tracking-wider text-natural-muted font-sans">GPS Telemetry</span>
                          <span className="text-natural-text font-bold block">Coords: {need.latitude.toFixed(6)}, {need.longitude.toFixed(6)}</span>
                          <span className="text-brand-650 font-bold block">Signals: Reported by {need.reportCount || 1} volunteer(s)</span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-[#FAF9F5]/40 p-2.5 rounded-lg border border-natural-border/50 text-[10.5px]">
                        <span className="block text-[7.5px] uppercase font-bold tracking-wider text-natural-muted">Description & Evidence</span>
                        <p className="text-natural-text leading-relaxed font-medium">{need.description || 'No observation details provided.'}</p>
                        {need.evidenceUrl && (
                          <div className="mt-1">
                            <a 
                              href={need.evidenceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center text-[8.5px] font-mono font-bold text-brand-650 hover:underline uppercase"
                            >
                              View Evidence Photo ↗
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-natural-border pt-3.5 gap-2">
                        <span className="text-[8.5px] text-natural-muted font-medium font-sans">
                          Reported by: {need.reportedBy?.name || 'Volunteer'}
                        </span>
                        
                        <div className="flex gap-2">
                          {need.verificationStatus !== 'UNDER_REVIEW' && (
                            <button
                              onClick={() => handleReviewNeed(need.id)}
                              className="btn-secondary py-1 px-2.5 text-[9px] uppercase tracking-wider font-mono bg-white border border-natural-border"
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => handleRejectNeed(need.id)}
                            className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleVerifyNeed(need.id)}
                            className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                          >
                            Verify Need
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Predict Demand Modal overlay or details box */}
          {selectedZone && (
            <div className="bg-white border border-brand-200 p-5 rounded-2xl shadow-xs text-left relative overflow-hidden max-w-2xl">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-brand-600"></div>
              
              <div className="flex justify-between items-start mb-4 bg-white">
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">ML Predicted Demand</h4>
                  <span className="text-[9px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-mono font-bold mt-1.5 block uppercase tracking-wider">{selectedZone.name}</span>
                </div>
                <button 
                  onClick={() => setSelectedZone(null)}
                  className="text-[9px] font-black text-brand-650 hover:text-brand-850 hover:underline uppercase tracking-wider"
                >
                  Clear panel
                </button>
              </div>

              {predictLoading ? (
                <div className="py-6 text-center text-natural-muted flex items-center justify-center space-x-2 text-xs">
                  <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                  <span className="font-semibold">Invoking FastAPI random forest models...</span>
                </div>
              ) : predictionData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white">
                  
                  <div className="space-y-3">
                    <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                      <span className="text-[10px] text-brand-850 font-bold uppercase tracking-wider block">Meals Needed</span>
                      <span className="text-xl font-mono font-black text-natural-text mt-1 block">
                        {predictionData.predictedMeals} meals
                      </span>
                    </div>

                    <div className="flex justify-between font-semibold border-b border-natural-border pb-2">
                      <span className="text-natural-muted">Model Confidence:</span>
                      <strong className="text-natural-text font-mono">{Math.round(predictionData.confidence * 100)}%</strong>
                    </div>

                    <div className="flex justify-between font-semibold items-center">
                      <span className="text-natural-muted">Priority:</span>
                      {getUrgencyBadge(predictionData.priority)}
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] p-4 rounded-xl border border-natural-border flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-natural-muted uppercase tracking-wider block">AI Inference Description</span>
                      <p className="text-[10.5px] text-natural-text mt-1.5 leading-relaxed font-semibold">
                        {predictionData.source}
                      </p>
                    </div>
                    <div className="text-[9px] text-natural-muted leading-normal mt-4 font-medium font-mono">
                      Features evaluated: DayOfWeek, TimeSlotHour, OperatingHours, ZonePreviousCapacity.
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
          )}

          {/* PENDING SHELTERS VERIFICATION VIEW */}
          <div className="bg-white border border-natural-border rounded-2xl p-6 shadow-xs text-left space-y-6">
            <div className="border-b border-natural-border pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-natural-text">Pending Shelter Verifications</h3>
              <p className="text-xs text-natural-muted mt-1 font-semibold">Review coordinator applications, verify geotags, examine legal files, and approve or reject.</p>
            </div>

            {sheltersLoading ? (
              <div className="p-8 text-center text-natural-muted font-semibold text-xs">Loading pending shelters...</div>
            ) : pendingShelters.length === 0 ? (
              <div className="p-8 text-center text-natural-muted font-semibold text-xs bg-gray-50 rounded-xl border border-natural-border border-dashed">No pending shelter verifications. All caught up!</div>
            ) : (
              <div className="space-y-6">
                {pendingShelters.map((shelter) => (
                  <div key={shelter.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-xs transition bg-white space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-105 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-natural-text uppercase">{shelter.name}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{shelter.shelterType} • {shelter.area}, {shelter.city}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-250 uppercase tracking-wider">
                        Pending Verification
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic details and proof file */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400">Address Info</span>
                          <p className="font-medium text-gray-800 mt-0.5">{shelter.address}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400">Contact Person</span>
                            <p className="font-medium text-gray-800 mt-0.5">{shelter.contactName}</p>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400">Contact Phone</span>
                            <p className="font-medium text-gray-800 mt-0.5">{shelter.contactPhone}</p>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400">Submitted By Coordinator</span>
                          <p className="font-medium text-gray-800 mt-0.5">
                            {shelter.coordinator?.name} ({shelter.coordinator?.email})
                          </p>
                        </div>

                        {shelter.documentUrl && (
                          <div className="pt-2">
                            <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400 mb-1">Authorization Proof</span>
                            <a 
                              href={shelter.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg text-xs font-semibold transition"
                            >
                              View Uploaded Proof Document ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Geotag maps view */}
                      <div className="space-y-2">
                        <span className="block text-[8px] uppercase font-bold tracking-wider text-gray-400">Exact Geotag Coordinates</span>
                        <p className="text-xs font-mono text-gray-600">Latitude: {shelter.latitude}, Longitude: {shelter.longitude}</p>
                        <div className="h-40 w-full rounded-xl overflow-hidden border border-gray-200">
                          <MapView 
                            center={[shelter.latitude, shelter.longitude]} 
                            zoom={14} 
                            interactive={false}
                            markers={[{
                              id: shelter.id,
                              latitude: shelter.latitude,
                              longitude: shelter.longitude,
                              title: shelter.name,
                              role: 'ZONE'
                            }]}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-gray-100 pt-3 gap-3">
                      <span className="text-[10px] text-gray-400">
                        Uploaded At: {new Date(shelter.documentUploadedAt || shelter.createdAt).toLocaleString()}
                      </span>
                      
                      <div className="flex gap-2">
                        {rejectingShelterId === shelter.id ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input 
                              type="text" 
                              placeholder="Enter rejection reason..." 
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              className="border border-red-300 px-3 py-1 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:outline-none w-full sm:w-48 bg-white"
                            />
                            <button
                              onClick={() => handleRejectShelter(shelter.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => setRejectingShelterId(null)}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setRejectingShelterId(shelter.id)}
                              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Reject Verification
                            </button>
                            <button
                              onClick={() => handleVerifyShelter(shelter.id)}
                              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                              Approve Verification
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {path === '/admin/anomalies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Right side: Isolation Forest Anomaly dashboard */}
          <div className="bg-white border border-natural-border rounded-2xl p-5 shadow-xs flex flex-col text-left space-y-4 h-fit">
            <div className="border-b border-natural-border pb-3 flex justify-between items-center bg-white">
              <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Platform Alerts</h3>
              <span className="text-[9px] bg-red-50 border border-red-200 text-red-750 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider font-mono">
                Isolation Forest
              </span>
            </div>

            <div className="space-y-4 flex-1 bg-white">
              {anomalies.length === 0 && (
                <div className="p-8 text-center text-natural-muted font-semibold text-xs border border-dashed border-natural-border rounded-xl">
                  No anomalies require review at the moment.
                </div>
              )}
              {anomalies.map((anom) => (
                <div key={anom.taskId} className="bg-red-50/10 border border-red-200 p-3 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-natural-text">{anom.volunteerName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                      anom.risk === 'HIGH RISK' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-55/60 text-amber-800 border-amber-200'
                    }`}>
                      {anom.risk}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-natural-text font-semibold leading-normal">
                    Reason: {anom.reason}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-natural-muted border-t border-natural-border pt-2 font-semibold font-mono">
                    <span>Task ID: {anom.taskId}</span>
                    <button 
                      onClick={() => {
                        alert(`Opening details for Task ${anom.taskId}. Admin reviews will bypass locks.`);
                      }}
                      className="text-brand-600 hover:text-brand-750 font-black hover:underline"
                    >
                      Investigate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl text-[9px] text-[#244F3C] font-semibold leading-normal">
              <strong>Evidence audit:</strong> Platform administrators are advised to manually evaluate flagged route deviations and images prior to blocking volunteer accounts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
