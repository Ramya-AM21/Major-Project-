import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  CheckCircle2, AlertTriangle, Truck, MapPin, Navigation, Clock, ShieldAlert, Award, AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface DeliveryTask {
  id: string;
  status: string;
  routeDistance: number;
  routeDeviation: number;
  matchingScore: number;
  foodListing: {
    id: string;
    foodName: string;
    quantity: number;
    unit: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    expiryTime: string;
  };
  zone: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

interface MatchRecommendation {
  foodListing: {
    id: string;
    foodName: string;
    quantity: number;
    unit: string;
    pickupAddress: string;
    pickupLatitude: number;
  };
  zone: {
    id: string;
    name: string;
    address: string;
    latitude: number;
  };
  routeId: string;
  deviation: number;
  matchingScore: number;
}

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active task details
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null);

  // Recommendations and stats
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [vStats, setVStats] = useState({
    rating: 4.8,
    completedDeliveries: 12,
    successfulDeliveries: 12,
    reliabilityScore: 1.0,
    mealsDelivered: 120
  });

  // Verification Input parameters
  const [pickupOtp, setPickupOtp] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('https://images.unsplash.com/photo-1594840125728-18685136e427?auto=format&fit=crop&q=80&w=250');
  
  // Geolocation simulation (Bangalore Center)
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(new Date());

  const fetchVolunteerData = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      axios.defaults.headers.common['Authorization'] = authHeader;

      const [statsRes, tasksRes, matchesRes] = await Promise.all([
        axios.get('/api/v1/analytics/volunteer'),
        axios.get('/api/v1/tasks/volunteer'),
        axios.get('/api/v1/volunteers/tasks') // Recommended items
      ]);

      setVStats(statsRes.data);
      setRecommendations(matchesRes.data || []);

      // Filter for in-flight tasks (ACCEPTED or IN_TRANSIT)
      const flightTask = tasksRes.data.find(
        (t: any) => t.status === 'ACCEPTED' || t.status === 'IN_TRANSIT'
      );
      setActiveTask(flightTask || null);

      if (flightTask) {
        // Mock current position near task pickup initially
        setCurrentLat(flightTask.foodListing.pickupLatitude - 0.002);
        setCurrentLng(flightTask.foodListing.pickupLongitude - 0.002);
      }
    } catch (e: any) {
      console.error(e);
      setErrorStatus("Failed to reconcile dashboard datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteerData();
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAcceptTask = async (rec: MatchRecommendation) => {
    setErrorStatus(null);
    try {
      // Find or create task proposal
      const proposeRes = await axios.post('/api/v1/tasks', {
        foodListingId: rec.foodListing.id,
        zoneId: rec.zone.id,
        routeId: rec.routeId,
        deviation: rec.deviation,
        matchingScore: rec.matchingScore
      });

      // Accept task
      await axios.post(`/api/v1/tasks/${proposeRes.data.id}/accept`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not accept task matching offer.');
    }
  };

  const handleVerifyPickup = async () => {
    if (!pickupOtp || !activeTask) return;
    setErrorStatus(null);
    try {
      await axios.post('/api/v1/verification/pickup', {
        taskId: activeTask.id,
        otp: pickupOtp,
        latitude: currentLat,
        longitude: currentLng
      });
      setPickupOtp('');
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Verification failed. Please check OTP.');
    }
  };

  const handleVerifyDelivery = async () => {
    if (!deliveryOtp || !activeTask) return;
    setErrorStatus(null);
    try {
      await axios.post('/api/v1/verification/delivery', {
        taskId: activeTask.id,
        otp: deliveryOtp,
        latitude: currentLat,
        longitude: currentLng,
        proofImageUrl
      });
      setDeliveryOtp('');
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Verification failed. Please check OTP.');
    }
  };

  const handleSimulateGPS = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setErrorStatus(null);
  };

  const getUrgencyCountdown = (expiryStr: string) => {
    const diff = new Date(expiryStr).getTime() - nowTime.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-gray-901 tracking-tight">Active Commutes & Routing</h1>
        <p className="text-sm text-gray-500 mt-1">Acquire route-compatible requests to redistribute food efficiently</p>
      </div>

      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-650 flex items-start space-x-2 text-left">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <span>{errorStatus}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
          <span className="text-xs font-semibold">Loading volunteer console...</span>
        </div>
      ) : activeTask ? (
        /* ACTIVE IN-FLIGHT DELIVERY PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Map navigation */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-500" /> Operational Transit Navigation
              </span>
              <span className="text-[10px] bg-blue-150 text-blue-800 px-2 py-0.5 rounded font-bold">
                {activeTask.status === 'ACCEPTED' ? 'Heading to pickup' : 'Heading to delivery zone'}
              </span>
            </div>

            <div className="flex-1 relative rounded-xl overflow-hidden border border-gray-150">
              <MapView
                center={[currentLat, currentLng]}
                zoom={14}
                onLocationSelect={handleSimulateGPS}
                markers={[
                  { id: 'volunteer', latitude: currentLat, longitude: currentLng, title: 'Your Position (Simulated)', role: 'CURRENT' },
                  { id: 'pickup', latitude: activeTask.foodListing.pickupLatitude, longitude: activeTask.foodListing.pickupLongitude, title: 'Pickup point', role: 'PROVIDER' },
                  { id: 'zone', latitude: activeTask.zone.latitude, longitude: activeTask.zone.longitude, title: activeTask.zone.name, role: 'ZONE' }
                ]}
                polylinePoints={[
                  [activeTask.foodListing.pickupLatitude, activeTask.foodListing.pickupLongitude],
                  [activeTask.zone.latitude, activeTask.zone.longitude]
                ]}
              />
            </div>
            
            <div className="bg-brand-50/50 p-2.5 rounded-lg border border-brand-100/50 mt-3 text-[10px] text-gray-500 font-medium text-left">
              <strong>Simulated GPS controller: </strong> Click any marker or line on the map to shift your location coordinates.
            </div>
          </div>

          {/* Verification Actions Sidebar panel */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-left space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Target Consumable</span>
                <h3 className="font-display font-extrabold text-gray-900 tracking-tight text-lg mt-0.5">
                  {activeTask.foodListing.foodName}
                </h3>
                <span className="text-xs text-gray-500 block">
                  Amount: {activeTask.foodListing.quantity} {activeTask.foodListing.unit}
                </span>
                <span className="text-xs text-brand-700 font-semibold bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5 inline-block mt-2">
                  Match Score: {activeTask.matchingScore}%
                </span>
              </div>

              {/* Transit Stops */}
              <div className="space-y-3 pt-3 border-t border-gray-150">
                <div className="flex items-start space-x-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-850 flex items-center justify-center font-bold text-[10px]">A</div>
                  <div>
                    <h5 className="font-bold text-gray-901">Pickup point</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">{activeTask.foodListing.pickupAddress}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">B</div>
                  <div>
                    <h5 className="font-bold text-gray-901">Drop Shelter Zone</h5>
                    <span className="font-semibold text-gray-900 block mt-0.5">{activeTask.zone.name}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{activeTask.zone.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Screens based on Task state */}
            <div className="pt-4 border-t border-gray-150">
              {activeTask.status === 'ACCEPTED' ? (
                /* STEP 1: PICKUP VERIFICATION */
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-900 block">Verification: Pickup Code</span>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Ask the kitchen manager for the 6-digit OTP code to authorize pickup transfer.
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pickupOtp}
                      onChange={(e) => setPickupOtp(e.target.value)}
                      placeholder="_ _ _ _ _ _"
                      className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleVerifyPickup}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Confirm Pickup
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: DELIVERY AT SHELTER VERIFICATION */
                <div className="space-y-4">
                  <div className="pb-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-900 block">Verification: Drop-off Details</span>
                    <p className="text-[10px] text-gray-400">
                      Validate credentials with the receiving coordinator once shelter coordinates are reached.
                    </p>
                  </div>

                  {/* Proximity warning checking if volunteer is far */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[10px] space-y-1">
                    <div className="flex justify-between font-mono">
                      <span>Live Distance to shelter:</span>
                      <strong className="text-gray-900">
                        {/* Simple Euclidean estimate scale */}
                        {Math.round(Math.sqrt(
                          Math.pow(currentLat - activeTask.zone.latitude, 2) +
                          Math.pow(currentLng - activeTask.zone.longitude, 2)
                        ) * 111.3 * 1000)} m
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Proof of delivery Photo URL</label>
                      <input
                        type="text"
                        value={proofImageUrl}
                        onChange={(e) => setProofImageUrl(e.target.value)}
                        className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-[#faf9f6]/40 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recipient OTP Code</label>
                      <div className="flex space-x-2 mt-1">
                        <input
                          type="text"
                          maxLength={6}
                          value={deliveryOtp}
                          onChange={(e) => setDeliveryOtp(e.target.value)}
                          placeholder="_ _ _ _ _ _"
                          className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none"
                        />
                        <button
                          onClick={handleVerifyDelivery}
                          className="bg-brand-700 hover:bg-brand-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Complete Drop
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* IDLE PORT STATE (METRICS & MATCHES LEDGER) */
        <div className="space-y-6">
          {/* Volunteer reliability KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-left relative flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400">Reliability Score</span>
              <h3 className="text-2xl font-display font-black text-gray-950 mt-2">{Math.round(vStats.reliabilityScore * 100)}%</h3>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-left relative flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Completed</span>
              <h3 className="text-2xl font-display font-black text-gray-950 mt-2">{vStats.completedDeliveries}</h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-left relative flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400">Global Rating</span>
              <h3 className="text-2xl font-display font-black text-gray-950 mt-2">★ {vStats.rating.toFixed(1)}</h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-left relative flex flex-col justify-between bg-brand-50/20">
              <span className="text-[10px] uppercase font-bold text-brand-800">Meals Carried</span>
              <h3 className="text-2xl font-display font-black text-brand-900 mt-2">{vStats.mealsDelivered}</h3>
            </div>
          </div>

          {/* Recommendations ledger */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden text-left">
            <div className="p-5 border-b border-gray-150">
              <h3 className="font-display font-bold text-base text-gray-990">Available Matched Transit Offers</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Recommended based on registered commute routes and additional travel deviations</p>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-4">
                <p className="text-sm font-medium">No route-compatible surplus postings found near your commutes.</p>
                <Link
                  to="/volunteer/routes"
                  className="text-xs bg-brand-50 border border-brand-200 text-brand-800 font-semibold px-4 py-2 rounded-lg hover:bg-brand-100 inline-block font-display"
                >
                  Configure Commute Routes
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-150">
                {recommendations.map((rec) => (
                  <div key={rec.foodListing.id} className="p-6 hover:bg-[#FAF9F6]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-brand-100 text-brand-805 px-2 py-0.5 rounded font-bold">
                          {rec.matchingScore}% compatibility
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          +{rec.deviation.toFixed(1)} km extra travel
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-gray-900">{rec.foodListing.foodName}</h4>
                      <p className="text-xs text-gray-500">
                        {rec.foodListing.pickupAddress} ➔ {rec.zone.name}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAcceptTask(rec)}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-sm self-start md:self-auto"
                    >
                      Accept matched Task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default VolunteerDashboard;
