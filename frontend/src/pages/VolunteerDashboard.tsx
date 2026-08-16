import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  CheckCircle2, AlertTriangle, Truck, MapPin, Navigation, Clock, ShieldAlert, Award, AlertCircle, Camera
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
    category: string;
    quantity: number;
    unit: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    expiryTime: string;
    preparationTime: string;
    imageUrl?: string;
    allergens?: string;
    provider?: {
      id: string;
      businessName: string;
      address: string;
    };
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
    category: string;
    quantity: number;
    unit: string;
    imageUrl?: string;
    allergens?: string;
    preparationTime: string;
    expiryTime: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    provider: {
      id: string;
      businessName: string;
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  zone: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  routeId: string | null;
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
    mealsDelivered: 120,
    tokens: 0
  });

  // Verification Input parameters
  const [pickupOtp, setPickupOtp] = useState('');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('https://images.unsplash.com/photo-1594840125728-18685136e427?auto=format&fit=crop&q=80&w=250');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  
  // Geolocation simulation (Bangalore Center)
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [tGpsExpanded, setTGpsExpanded] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(new Date());

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getExpectedReward = (rec: MatchRecommendation) => {
    const base = 10;
    const qty = rec.foodListing.quantity >= 50 ? 5 : rec.foodListing.quantity >= 30 ? 3 : rec.foodListing.quantity >= 10 ? 2 : 1;
    const dev = rec.deviation < 2.0 ? 3 : rec.deviation < 5.0 ? 2 : 1;
    const ver = 3; 
    return base + qty + dev + ver;
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  // Real-time device geolocation watcher (updates coordinates in real-time)
  useEffect(() => {
    if (isSimulated) return;

    let watchId: number | null = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          // Stream coordinates to backend
          axios.post('/api/v1/volunteers/location', {
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          }).catch(err => console.warn("Failed to report location update:", err));
        },
        (error) => {
          console.warn("Initial geolocation failed, using default coordinates:", error.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          // Stream coordinates to backend
          axios.post('/api/v1/volunteers/location', {
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          }).catch(err => console.warn("Failed to report location update:", err));
        },
        (error) => {
          console.warn("Geolocation watchPosition failed:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isSimulated]);

  // WebSockets tracking subscription
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8081/ws/tracking`;
    
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data) {
            if (data.type === 'WALLET_UPDATE') {
              fetchVolunteerData();
            } else if (data.payload) {
              const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
              const targetTaskId = payload.taskId || payload.id;
              if (targetTaskId && targetTaskId === activeTask?.id) {
                fetchVolunteerData();
              }
            }
          }
        } catch (err) {
          // ignore
        }
      };
    } catch (e) {
      console.warn("WebSocket dashboard connection failed:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeTask?.id]);

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

      // Filter for in-flight tasks (not COMPLETED, not CREATED, not MATCHED)
      const flightTask = tasksRes.data.find(
        (t: any) => t.status !== 'COMPLETED' && t.status !== 'CREATED' && t.status !== 'MATCHED'
      );
      setActiveTask(flightTask || null);

      if (flightTask) {
        // Mock current position near task pickup initially ONLY IF default Bangalore coordinates
        if (currentLat === 12.9716 && currentLng === 77.5946) {
          setCurrentLat(flightTask.foodListing.pickupLatitude - 0.002);
          setCurrentLng(flightTask.foodListing.pickupLongitude - 0.002);
        }
        try {
          const verRes = await axios.get(`/api/v1/verification/task/${flightTask.id}`);
          setVerificationData(verRes.data);
        } catch (verErr) {
          console.error("Failed to load verification metadata", verErr);
        }
      } else {
        setVerificationData(null);
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

  useEffect(() => {
    if (!activeTask || (activeTask.status !== 'ACCEPTED' && activeTask.status !== 'IN_TRANSIT' && activeTask.status !== 'ARRIVED')) return;

    // Send current coordinates immediately
    axios.post(`/api/v1/tasks/${activeTask.id}/location`, {
      latitude: currentLat,
      longitude: currentLng
    }).catch(err => console.error("Error setting initial transit coordinates:", err));

    const telemetryTimer = setInterval(() => {
      axios.post(`/api/v1/tasks/${activeTask.id}/location`, {
        latitude: currentLat,
        longitude: currentLng
      }).catch(err => console.error("Error posting transit telemetry:", err));
    }, 8000);

    return () => clearInterval(telemetryTimer);
  }, [activeTask?.id, activeTask?.status, currentLat, currentLng]);

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
        proofImageUrl: ""
      });
      setDeliveryOtp('');
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Verification failed. Please check OTP.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedFile || !activeTask) return;
    setSubmittingProof(true);
    setErrorStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("taskId", activeTask.id);
      formData.append("latitude", currentLat.toString());
      formData.append("longitude", currentLng.toString());

      await axios.post("/api/v1/verification/upload-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setSelectedFile(null);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || "Delivery photo verification failed.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleSimulateGPS = (lat: number, lng: number) => {
    setIsSimulated(true);
    setCurrentLat(lat);
    setCurrentLng(lng);
    setErrorStatus(null);
    axios.post('/api/v1/volunteers/location', {
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString()
    }).catch(err => console.warn("Failed to send simulated location:", err));
  };

  const handleCancelTask = async () => {
    if (!activeTask) return;
    if (!window.confirm("Are you sure you want to release/cancel this active delivery path? The meals will be returned to the matching pool for other volunteers.")) return;

    setErrorStatus(null);
    try {
      await axios.post(`/api/v1/tasks/${activeTask.id}/cancel`);
      setActiveTask(null);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not release this active route task.');
    }
  };

  const getUrgencyCountdown = (expiryStr: string) => {
    const diff = new Date(expiryStr).getTime() - nowTime.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  // Helper to show vertical timeline details
  const getTimelineSteps = () => {
    if (!activeTask) return [];
    const status = activeTask.status;

    return [
      { 
        label: 'Rescue Assigned', 
        desc: 'Request matched to your commute route', 
        done: true, 
        active: status === 'ACCEPTED' 
      },
      { 
        label: 'Pickup Verification', 
        desc: 'Verified via provider OTP handshake', 
        done: status !== 'ACCEPTED', 
        active: status === 'ACCEPTED' 
      },
      { 
        label: 'In Transit Route Rescue', 
        desc: 'Transporting surplus meals to demand zone', 
        done: (status !== 'ACCEPTED' && status !== 'IN_TRANSIT'), 
        active: status === 'IN_TRANSIT' 
      },
      { 
        label: 'Destination Arrived', 
        desc: 'Entered the geofenced shelter radius', 
        done: (status === 'ARRIVED' || status === 'PHOTO_PENDING' || status === 'ML_VALIDATION_PENDING' || status === 'COMPLETED'), 
        active: status === 'ARRIVED' 
      },
      { 
        label: 'Handover Verification', 
        desc: 'Confirm client recipient OTP security code', 
        done: (status === 'PHOTO_PENDING' || status === 'ML_VALIDATION_PENDING' || status === 'COMPLETED'), 
        active: status === 'ARRIVED' 
      },
      { 
        label: 'AI Evidence Check', 
        desc: 'Inference auditing on photo proof validation', 
        done: status === 'COMPLETED', 
        active: (status === 'PHOTO_PENDING' || status === 'PHOTO_REJECTED' || status === 'ML_VALIDATION_PENDING') 
      }
    ];
  };

  const getIdleMapMarkers = () => {
    const markers: any[] = [
      { id: 'volunteer', latitude: currentLat, longitude: currentLng, title: 'Your Position (Live)', role: 'CURRENT' as const }
    ];
    
    recommendations.forEach(rec => {
      markers.push({
        id: `pickup-${rec.foodListing.id}`,
        latitude: rec.foodListing.pickupLatitude,
        longitude: rec.foodListing.pickupLongitude,
        title: `${rec.foodListing.foodName} (Pickup)`,
        description: rec.foodListing.provider?.businessName || 'Provider',
        role: 'PROVIDER' as const
      });
      markers.push({
        id: `zone-${rec.foodListing.id}`,
        latitude: rec.zone.latitude,
        longitude: rec.zone.longitude,
        title: rec.zone.name,
        description: rec.zone.address,
        role: 'ZONE' as const
      });
    });
    
    return markers;
  };

  const selectedRec = recommendations.find(r => r.foodListing.id === selectedRecId);
  const idlePolyline: [number, number][] = selectedRec ? [
    [selectedRec.foodListing.pickupLatitude, selectedRec.foodListing.pickupLongitude],
    [selectedRec.zone.latitude, selectedRec.zone.longitude]
  ] : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Visual greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-natural-border pb-5 text-left">
        <div>
          <h1 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Good morning, {user?.name || 'Volunteer'}</h1>
          <p className="text-xs text-natural-muted mt-1 font-semibold">Your daily routes can help rescue and redirect food surplus today.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          {activeTask && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] font-black font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-pulse"></span>
              ACTIVE ROUTE
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 border border-brand-200 text-brand-850 text-[10px] font-black font-mono tracking-wider uppercase">
            ● SIMULATION ACTIVE
          </span>
        </div>
      </div>

      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex items-start space-x-2 text-left font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
          <span>{errorStatus}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2">
          <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
          <span className="text-xs font-semibold">Loading volunteer console...</span>
        </div>
      ) : activeTask ? (
        /* ACTIVE IN-FLIGHT DELIVERY PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Map navigation */}
          <div className="lg:col-span-7 bg-white border border-natural-border rounded-2xl p-4 shadow-sm flex flex-col min-h-[450px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-brand-650" /> Operational Transit Navigation
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-brand-200 text-[9px] font-black uppercase tracking-wider bg-brand-50 text-brand-700">
                {activeTask.status === 'ACCEPTED' ? 'Heading to pickup' : 'Heading to delivery zone'}
              </span>
            </div>

            <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[300px]">
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
            
            <div className="bg-[#FAF9F5] p-3 rounded-xl border border-natural-border mt-3 text-[10px] text-natural-muted font-semibold text-left">
              <strong>Simulated GPS controller: </strong> Click any marker or routing path on the map to shift your location coordinates.
            </div>
          </div>

          {/* Verification Actions Sidebar panel */}
          <div className="lg:col-span-5 bg-white border border-natural-border rounded-2xl p-6 shadow-sm flex flex-col justify-between text-left space-y-6">
            <div className="space-y-4">
              <div className="border-b border-natural-border pb-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Rescue Delivery Route</span>
                  <span className="text-xs font-mono font-bold text-natural-text">#FD-{activeTask.id.substring(0, 6).toUpperCase()}</span>
                </div>
                <h3 className="font-display font-black text-natural-text tracking-tight text-base mt-2 flex items-center gap-2 uppercase">
                  <Truck className="w-5 h-5 text-brand-650" /> {activeTask.foodListing.foodName}
                </h3>
                <span className="text-xs font-semibold text-natural-muted block mt-1">
                  Quantity: {activeTask.foodListing.quantity} {activeTask.foodListing.unit}
                </span>

                {/* Simulated metadata dropdown */}
                <div className="mt-3">
                  <button 
                    onClick={() => setTGpsExpanded(!tGpsExpanded)}
                    className="text-[9px] font-black text-brand-600 hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    {tGpsExpanded ? 'Hide' : 'Show'} GPS Telemetry
                  </button>
                  {tGpsExpanded && (
                    <div className="mt-2 p-3 bg-[#FAF9F5] border border-natural-border rounded-xl font-mono text-[9px] text-natural-muted space-y-1">
                      <div>COORDS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</div>
                      <div>ACCURACY: 8 meters</div>
                      <div>DISTANCE: {Math.max(0.2, (Math.round(Math.sqrt(Math.pow(currentLat - activeTask.zone.latitude, 2) + Math.pow(currentLng - activeTask.zone.longitude, 2)) * 111.3 * 10) / 10))} km away</div>
                      <div>ETA: ~7 minutes</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transit Stops - Visual Route representation */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2.5 text-xs text-left">
                  <div className="w-5 h-5 rounded-lg bg-brand-600/10 text-brand-600 flex items-center justify-center font-bold text-[9px] shrink-0 border border-brand-600/20">A</div>
                  <div>
                    <h5 className="font-bold text-natural-text uppercase text-[9px] tracking-wider">Pickup Kitchen</h5>
                    <p className="text-xs text-natural-muted mt-0.5 font-medium">{activeTask.foodListing.pickupAddress}</p>
                  </div>
                </div>

                <div className="pl-2 border-l-2 border-dashed border-brand-100 ml-2.5 h-4"></div>

                <div className="flex items-start space-x-2.5 text-xs text-left">
                  <div className="w-5 h-5 rounded-lg bg-accent-500/10 text-accent-700 flex items-center justify-center font-bold text-[9px] shrink-0 border border-accent-500/20">B</div>
                  <div>
                    <h5 className="font-bold text-natural-text uppercase text-[9px] tracking-wider">Drop Target</h5>
                    <strong className="text-xs text-natural-text block mt-0.5 font-semibold">{activeTask.zone.name}</strong>
                    <p className="text-xs text-natural-muted mt-0.5 font-medium">{activeTask.zone.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Panel */}
            <div className="pt-4 border-t border-natural-border space-y-4">
              {activeTask.status === 'ACCEPTED' ? (
                /* STEP 1: PICKUP OTP VERIFICATION */
                <div className="space-y-3 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border">
                  <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">1. Confirm Dispatch Handover</span>
                  <p className="text-xs text-natural-muted leading-relaxed font-medium">
                    Ask the kitchen manager for the 6-digit OTP code to verify and authorize pickup.
                  </p>
                  {verificationData && (
                    <div className="text-[9px] text-accent-700 bg-accent-50 border border-accent-100 p-2 rounded-lg flex items-center space-x-1.5 font-bold font-mono">
                      <span>💡 <strong>Simulation OTP:</strong> <code>{verificationData.pickupOtp}</code></span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pickupOtp}
                      onChange={(e) => setPickupOtp(e.target.value)}
                      placeholder="_ _ _ _ _ _"
                      className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    />
                    <button
                      onClick={handleVerifyPickup}
                      className="btn-primary whitespace-nowrap px-4 py-2"
                    >
                      Verify Pickup
                    </button>
                  </div>
                </div>
              ) : activeTask.status === 'IN_TRANSIT' || activeTask.status === 'ARRIVED' ? (
                /* STEP 2: DROP-OFF OTP VERIFICATION */
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border">
                  <div>
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">2. Confirm Recipient Handover</span>
                    <p className="text-xs text-natural-muted mt-1 leading-relaxed font-medium">
                      Validate credentials with the recipient coordinator once you reach coordinates.
                    </p>
                  </div>

                  {/* Geofence control box */}
                  <div className="p-3 rounded-xl bg-white border border-natural-border text-xs space-y-2">
                    <div className="flex justify-between font-mono items-center text-[10px] text-natural-muted font-bold uppercase tracking-wider">
                      <span>Radius to Shelter:</span>
                      <strong className="text-natural-text">
                        {Math.round(Math.sqrt(
                          Math.pow(currentLat - activeTask.zone.latitude, 2) +
                          Math.pow(currentLng - activeTask.zone.longitude, 2)
                        ) * 111.3 * 1000)} m
                      </strong>
                    </div>
                    {activeTask.status === 'IN_TRANSIT' && (
                      <div className="p-2.5 rounded-lg bg-accent-50 border border-accent-150 text-[9px] text-accent-700 font-black font-mono tracking-wide text-center">
                        ⚠️ Coordinates must be within 250m of zone to input OTP.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSimulateGPS(activeTask.zone.latitude, activeTask.zone.longitude)}
                      className="w-full text-center bg-[#FAF9F5] hover:bg-brand-50 hover:text-brand-700 text-natural-muted font-bold py-2 px-3 rounded-lg text-[9px] transition-colors border border-natural-border uppercase tracking-wider"
                    >
                      📍 Travel to Shelter Zone (Simulate GPS Arrival)
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      {verificationData && (
                        <div className="text-[9px] text-accent-700 bg-accent-50 border border-accent-100 p-2 rounded-lg mb-2 flex items-center space-x-1.5 font-bold font-mono">
                          <span>💡 <strong>Simulation OTP:</strong> <code>{verificationData.deliveryOtp}</code></span>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={deliveryOtp}
                          disabled={activeTask.status === 'IN_TRANSIT'}
                          onChange={(e) => setDeliveryOtp(e.target.value)}
                          placeholder={activeTask.status === 'IN_TRANSIT' ? "LOCKED (Must Arrive)" : "_ _ _ _ _ _"}
                          className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-650 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={handleVerifyDelivery}
                          disabled={activeTask.status === 'IN_TRANSIT'}
                          className="btn-primary whitespace-nowrap px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Verify OTP
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeTask.status === 'PHOTO_PENDING' || activeTask.status === 'PHOTO_REJECTED' ? (
                /* STEP 3: PHOTO EVIDENCE UPLOAD */
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border">
                  <div>
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">3. Upload Photo Evidence</span>
                    <p className="text-xs text-natural-muted mt-1 leading-relaxed font-medium">
                      Select or capture a photo showing the delivered food packages to complete validating.
                    </p>
                  </div>

                  {activeTask.status === 'PHOTO_REJECTED' && (
                    <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-750 rounded-xl leading-relaxed font-semibold">
                      ❌ <strong>Verification failed:</strong> Photo validation was rejected. Reason: The image does not meet specifications. Please retake a clear photo.
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="evidence-image-file"
                  />
                  <label
                    htmlFor="evidence-image-file"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-natural-border rounded-2xl hover:bg-white cursor-pointer transition-all text-center bg-white"
                  >
                    <Camera className="w-7 h-7 text-natural-muted mb-2" />
                    <span className="text-xs font-bold text-brand-600">Select Handover Proof Image</span>
                    <span className="text-[9px] text-natural-muted mt-0.5 font-medium">JPEG/PNG formatted files (Max 5MB)</span>
                  </label>

                  {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-brand-50 border border-natural-border rounded-xl text-xs text-brand-900">
                      <span className="truncate max-w-[170px] font-mono font-bold">{selectedFile.name}</span>
                      <button
                        onClick={handleSubmitProof}
                        disabled={submittingProof}
                        className="btn-primary py-1.5 px-3 normal-case text-[10px]"
                      >
                        {submittingProof ? 'Uploading...' : 'Submit Photo'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 4: ML SCANS IN PROGRESS */
                <div className="bg-[#FAF9F5] p-6 rounded-xl border border-natural-border text-center space-y-4">
                  <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-650 rounded-full animate-spin mx-auto"></div>
                  <div>
                    <h4 className="font-bold text-natural-text text-xs uppercase tracking-wider">Verification Proof Checks</h4>
                    <div className="text-left max-w-xs mx-auto space-y-1.5 mt-4 text-[10px] font-bold text-natural-muted">
                      <div>✓ File signature received</div>
                      <div>✓ Geolocation verified</div>
                      <div>✓ Handover timestamp verified</div>
                      <div className="text-brand-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-ping"></span>
                        Scanning delivery contents...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical timeline status tracker */}
              <div className="pt-4 border-t border-natural-border space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-natural-muted">Rescue route milestones</h4>
                <div className="space-y-4 text-left">
                  {getTimelineSteps().map((stp, idx) => (
                    <div key={idx} className="flex space-x-3 text-xs">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black border ${
                          stp.done 
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs' 
                            : stp.active 
                              ? 'bg-accent-500 text-white border-accent-600 shadow-xs animate-pulse' 
                              : 'bg-white text-gray-300 border-gray-200'
                        }`}>
                          {stp.done ? '✓' : idx + 1}
                        </div>
                        {idx < 5 && <div className={`w-0.5 h-5 ${stp.done ? 'bg-brand-600' : 'bg-gray-150'} mt-1`}></div>}
                      </div>
                      <div>
                        <span className={`font-bold block uppercase text-[10px] tracking-wider ${stp.active ? 'text-brand-700' : 'text-natural-text'}`}>{stp.label}</span>
                        <span className="text-[10px] text-natural-muted font-medium block mt-0.5">{stp.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-red-100">
                <button
                  type="button"
                  onClick={handleCancelTask}
                  className="w-full py-2.5 bg-red-50 hover:bg-rose-100/60 text-red-650 font-bold text-[9px] rounded-lg border border-red-200 transition-colors uppercase tracking-widest text-center"
                >
                  ✖ Release / Cancel Active Task
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* IDLE STATE: STATISTICS AND RECOMMENDATIONS */
        <div className="space-y-6">
          {/* Volunteer reliability KPI Cards */}
          <div className="bg-white border border-natural-border rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-natural-border grid grid-cols-2 sm:grid-cols-5 text-left shadow-xs">
            <div className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Reliability</span>
              <div className="text-xl font-mono font-black text-natural-text mt-1">{Math.round(vStats.reliabilityScore * 100)}%</div>
            </div>
            <div className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Deliveries</span>
              <div className="text-xl font-mono font-black text-natural-text mt-1">{vStats.completedDeliveries}</div>
            </div>
            <div className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Rating</span>
              <div className="text-xl font-mono font-black text-natural-text mt-1">★ {vStats.rating.toFixed(1)}</div>
            </div>
            <div className="p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Food Rescued</span>
              <div className="text-xl font-mono font-black text-natural-text mt-1">{vStats.mealsDelivered * 0.5} kg</div>
            </div>
            <div className="p-4 bg-brand-50/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-700">Wallet balance</span>
              <div className="text-xl font-mono font-black text-brand-650 mt-1">🪙 {vStats.tokens} pts</div>
            </div>
          </div>

          {/* Matches & Interactive Map split screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Live Interactive Matching Map */}
            <div className="lg:col-span-6 bg-white border border-natural-border rounded-2xl p-4 shadow-sm flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <Navigation className="w-3.5 h-3.5 text-brand-650" /> Interactive Route Match Finder
                </span>
                <span className="text-[9px] bg-brand-100 border border-brand-200 text-brand-850 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  {selectedRecId ? 'Path Route Overlay Active' : 'Select match card to overlay route'}
                </span>
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[350px]">
                <MapView
                  center={[currentLat, currentLng]}
                  zoom={12}
                  onLocationSelect={handleSimulateGPS}
                  markers={getIdleMapMarkers()}
                  polylinePoints={idlePolyline}
                />
              </div>

              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-natural-border mt-3 text-[10px] text-natural-muted font-medium text-left leading-normal">
                <strong>Simulated Origin Controller: </strong> Click anywhere on the map or any pin to update your real-time simulated origin position.
              </div>
            </div>

            {/* Recommendations ledger */}
            <div className="lg:col-span-6 bg-white border border-natural-border rounded-2xl shadow-sm flex flex-col overflow-hidden max-h-[570px] text-left">
              <div className="p-4 border-b border-natural-border bg-[#FAF9F5] flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">Available Matched Transit Offers</h3>
                  <p className="text-[10px] text-natural-muted mt-0.5 font-semibold">Matched dynamically to registered commutes and travel deviation bounds</p>
                </div>
                <button
                  type="button"
                  onClick={fetchVolunteerData}
                  className="btn-secondary normal-case py-1.5 px-3"
                >
                  Refresh
                </button>
              </div>

              {recommendations.length === 0 ? (
                <div className="p-12 text-center text-natural-muted space-y-4 flex-1 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold">No route-compatible surplus postings found near your commutes.</p>
                  <Link
                    to="/volunteer/routes"
                    className="btn-secondary normal-case text-xs inline-block font-display"
                  >
                    Configure Commute Routes
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-natural-border overflow-y-auto flex-1">
                  {recommendations.map((rec) => {
                    const pickupDist = calculateDistance(currentLat, currentLng, rec.foodListing.pickupLatitude, rec.foodListing.pickupLongitude);
                    const expectedCoins = getExpectedReward(rec);
                    const isVeg = rec.foodListing.category === 'VEG';
                    const isNonVeg = rec.foodListing.category === 'NON_VEG';
                    const isEgg = rec.foodListing.category === 'EGG';
                    const isCardSelected = selectedRecId === rec.foodListing.id;

                    return (
                      <div 
                        key={rec.foodListing.id} 
                        onClick={() => setSelectedRecId(rec.foodListing.id)}
                        className={`p-4 hover:bg-brand-50/10 cursor-pointer transition-all flex flex-col gap-4 border-b border-natural-border last:border-b-0 ${
                          isCardSelected ? 'bg-brand-50/25 border-l-4 border-l-brand-600 pl-3' : ''
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Image Thumbnail Column */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-natural-border bg-[#FAF9F5] relative">
                            {rec.foodListing.imageUrl ? (
                              <img src={rec.foodListing.imageUrl} alt={rec.foodListing.foodName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-natural-muted font-bold p-1 text-center">
                                <span>🍲 No Image</span>
                              </div>
                            )}
                            <span className={`absolute top-1 left-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide border shadow-xs ${
                              isVeg 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                : isNonVeg 
                                  ? 'bg-rose-50 text-rose-700 border-rose-250' 
                                  : 'bg-amber-50 text-amber-700 border-amber-250'
                            }`}>
                              {rec.foodListing.category}
                            </span>
                          </div>

                          {/* Main Cargo Details */}
                          <div className="flex-1 space-y-2 text-left text-xs text-natural-text">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[8px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                                ★ {rec.matchingScore}% Match
                              </span>
                              <span className="text-[8px] bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                Detour: {rec.deviation.toFixed(1)} km
                              </span>
                              <span className="text-[8px] bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded font-bold font-mono">
                                {pickupDist.toFixed(1)} km away
                              </span>
                            </div>

                            <div>
                              <h4 className="font-display font-black text-xs text-natural-text truncate uppercase">{rec.foodListing.foodName}</h4>
                              <p className="text-[10px] text-natural-muted font-bold">{rec.foodListing.provider?.businessName || 'Green Bowl Kitchen'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2 rounded-lg border border-natural-border text-[9px] font-semibold">
                              <div>
                                <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Prepared</span>
                                <strong className="block text-[9px] text-natural-text font-mono">{formatTime(rec.foodListing.preparationTime)}</strong>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase font-bold tracking-wider text-natural-muted">Deadline</span>
                                <strong className="block text-[9px] text-brand-700 font-bold font-mono">{formatTime(rec.foodListing.expiryTime)}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location Details & Accept Button */}
                        <div className="pt-2 border-t border-natural-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="text-[10px] space-y-0.5 text-natural-muted font-medium flex-1 min-w-0">
                            <div className="truncate"><span className="font-bold text-natural-text uppercase text-[8px] tracking-wider mr-1">Pickup:</span> {rec.foodListing.pickupAddress}</div>
                            <div className="truncate"><span className="font-bold text-natural-text uppercase text-[8px] tracking-wider mr-1">Drop off:</span> {rec.zone.name}</div>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                            <div className="text-right">
                              <span className="text-[8px] uppercase font-bold tracking-wider text-brand-700 block">Reward</span>
                              <strong className="text-xs font-mono font-black text-brand-650">🪙 {expectedCoins}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid triggering card selection
                                handleAcceptTask(rec);
                              }}
                              className="btn-primary text-[10px] py-2 px-3.5"
                            >
                              Accept Task
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
