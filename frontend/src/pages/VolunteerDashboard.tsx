import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  CheckCircle2, AlertTriangle, Truck, MapPin, Navigation, Clock, ShieldAlert, Award, 
  AlertCircle, Camera, Heart, Trophy, Sparkles, ChevronRight, Activity, Calendar, ShieldCheck, Check,
  RefreshCw, Map, User, ShoppingBag, Eye, HelpCircle, ArrowRight, Compass, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import axios from 'axios';
import volunteerCommuteImg from '../assets/volunteer_commute.png';
import foodRescueImg from '../assets/food_rescue.png';
import communityRewardImg from '../assets/community_reward.png';

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

  // Recommendations, stats, and history
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'IMPACT' | 'HISTORY'>('MATCHES');
  const [showCompletedReward, setShowCompletedReward] = useState<any | null>(null);

  const [vStats, setVStats] = useState({
    rating: 4.9,
    completedDeliveries: 14,
    successfulDeliveries: 14,
    reliabilityScore: 1.0,
    mealsDelivered: 128,
    tokens: 370
  });

  // Verification Input parameters
  const [pickupOtp, setPickupOtp] = useState('');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  
  // Geolocation settings
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'granted' | 'denied' | 'unavailable' | 'checking'>('checking');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState<string | null>(null);
  const lastUploadedCoords = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [tGpsExpanded, setTGpsExpanded] = useState<boolean>(false);

  // OSRM route geometry states
  const [routeGeometryPoints, setRouteGeometryPoints] = useState<[number, number][]>([]);
  const [loadingRouteGeometry, setLoadingRouteGeometry] = useState(false);

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

  const getExpectedRewardForTask = (task: any) => {
    if (!task) return 10;
    const base = 10;
    const qty = task.foodListing.quantity >= 50 ? 5 : task.foodListing.quantity >= 30 ? 3 : task.foodListing.quantity >= 10 ? 2 : 1;
    const dev = task.routeDeviation < 2.0 ? 3 : task.routeDeviation < 5.0 ? 2 : 1;
    return base + qty + dev + 3;
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  // Browser Geolocation capture loop
  const handleRequestLocation = () => {
    setGpsPermissionStatus('checking');
    if (!navigator.geolocation) {
      setGpsPermissionStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsPermissionStatus('granted');
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        setGpsAccuracy(accuracy);
      },
      (error) => {
        setGpsPermissionStatus('denied');
        setErrorStatus("Location permission is required for live delivery tracking.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Sync general user statistics and metadata
  const fetchVolunteerData = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      axios.defaults.headers.common['Authorization'] = authHeader;

      const [statsRes, tasksRes, matchesRes] = await Promise.all([
        axios.get('/api/v1/analytics/volunteer'),
        axios.get('/api/v1/tasks/volunteer'),
        axios.get('/api/v1/volunteers/tasks')
      ]);

      setVStats(statsRes.data);
      setRecommendations(matchesRes.data || []);
      
      const compTasks = (tasksRes.data || []).filter((t: any) => t.status === 'COMPLETED');
      setHistoryTasks(compTasks);

      const flightTask = tasksRes.data.find(
        (t: any) => t.status !== 'COMPLETED' && t.status !== 'CREATED' && t.status !== 'MATCHED' && t.status !== 'CANCELLED'
      );

      // Transition check to show success reward popup screen
      if (activeTask && !flightTask) {
        const justFinished = tasksRes.data.find((t: any) => t.id === activeTask.id);
        if (justFinished && justFinished.status === 'COMPLETED') {
          setShowCompletedReward({
            id: justFinished.id,
            foodName: justFinished.foodListing.foodName,
            quantity: justFinished.foodListing.quantity,
            unit: justFinished.foodListing.unit,
            coins: getExpectedRewardForTask(justFinished),
            prevBalance: statsRes.data.tokens - getExpectedRewardForTask(justFinished),
            newBalance: statsRes.data.tokens
          });
        }
      }

      setActiveTask(flightTask || null);

      if (flightTask) {
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
      setErrorStatus("Failed to load volunteer commute console datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRequestLocation();
    fetchVolunteerData();

    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebSockets synchronization
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
            const topicName = data.topic || data.type;
            if (topicName === 'WALLET_UPDATE' || topicName === 'TASK_UPDATE' || topicName === 'NOTIFICATION') {
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
  // Background location watch hook for active tasks
  useEffect(() => {
    if (!activeTask) return;

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          setGpsAccuracy(accuracy);
          setGpsPermissionStatus('granted');

          if (accuracy > 50) {
            setGpsAccuracyWarning(`GPS accuracy is low (${Math.round(accuracy)}m). Ignoring update.`);
            return;
          } else {
            setGpsAccuracyWarning(null);
          }

          const now = Date.now();
          if (lastUploadedCoords.current) {
            const dist = calculateDistance(
              lastUploadedCoords.current.lat,
              lastUploadedCoords.current.lng,
              latitude,
              longitude
            ) * 1000; // in meters
            const timeElapsed = now - lastUploadedCoords.current.time;

            if (dist < 15 && timeElapsed < 5000) {
              return;
            }
          }

          lastUploadedCoords.current = { lat: latitude, lng: longitude, time: now };
          const timestamp = new Date().toISOString();

          // Report location coordinates immediately
          axios.post(`/api/v1/tasks/${activeTask.id}/location`, {
            latitude,
            longitude,
            accuracy,
            timestamp
          }).catch(err => console.error("Error posting transit telemetry:", err));
        },
        (err) => console.warn("GPS watching failed", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeTask?.id]);
  // OSRM routing geometry calculation for active tasks
  useEffect(() => {
    if (!activeTask || currentLat === null || currentLng === null) {
      setRouteGeometryPoints([]);
      return;
    }

    const fetchActiveOSRMRoute = async () => {
      setLoadingRouteGeometry(true);
      try {
        const pickupLat = activeTask.foodListing.pickupLatitude;
        const pickupLng = activeTask.foodListing.pickupLongitude;
        const zoneLat = activeTask.zone.latitude;
        const zoneLng = activeTask.zone.longitude;

        let waypoints = `${currentLng},${currentLat};${pickupLng},${pickupLat};${zoneLng},${zoneLat}`;
        if (activeTask.status === 'NAVIGATING_TO_DESTINATION' || activeTask.status === 'PICKED_UP' || activeTask.status === 'ARRIVED_AT_DESTINATION') {
          waypoints = `${currentLng},${currentLat};${zoneLng},${zoneLat}`;
        }

        const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${waypoints}`, {
          params: {
            overview: 'full',
            geometries: 'geojson'
          }
        });
        if (res.data && res.data.routes && res.data.routes.length > 0) {
          const coordinates = res.data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRouteGeometryPoints(coordinates);
        }
      } catch (err) {
        console.warn("Active route OSRM calculation failed", err);
        // Fallback straight lines
        if (activeTask.status === 'NAVIGATING_TO_DESTINATION' || activeTask.status === 'PICKED_UP' || activeTask.status === 'ARRIVED_AT_DESTINATION') {
          setRouteGeometryPoints([ [currentLat, currentLng], [activeTask.zone.latitude, activeTask.zone.longitude] ]);
        } else {
          setRouteGeometryPoints([
            [currentLat, currentLng],
            [activeTask.foodListing.pickupLatitude, activeTask.foodListing.pickupLongitude],
            [activeTask.zone.latitude, activeTask.zone.longitude]
          ]);
        }
      } finally {
        setLoadingRouteGeometry(false);
      }
    };

    fetchActiveOSRMRoute();
  }, [activeTask?.id, activeTask?.status, currentLat, currentLng]);

  // State Machine transition: start pickup route
  const handleStartPickup = async () => {
    if (!activeTask) return;
    try {
      setErrorStatus(null);
      await axios.post(`/api/v1/tasks/${activeTask.id}/start-pickup`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not start pickup commute.');
    }
  };

  // State Machine transition: arrived at kitchen
  const handleArrivePickup = async () => {
    if (!activeTask) return;
    try {
      setErrorStatus(null);
      await axios.post(`/api/v1/tasks/${activeTask.id}/arrive-pickup`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not update arrival status.');
    }
  };

  // State Machine transition: start delivery route
  const handleStartDelivery = async () => {
    if (!activeTask) return;
    try {
      setErrorStatus(null);
      await axios.post(`/api/v1/tasks/${activeTask.id}/start-delivery`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not initiate delivery commute.');
    }
  };

  // State Machine transition: arrived at shelter
  const handleArriveDelivery = async () => {
    if (!activeTask) return;
    try {
      setErrorStatus(null);
      await axios.post(`/api/v1/tasks/${activeTask.id}/arrive-delivery`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not update destination arrival.');
    }
  };

  const handleAcceptTask = async (rec: MatchRecommendation) => {
    setErrorStatus(null);
    try {
      const proposeRes = await axios.post('/api/v1/tasks', {
        foodListingId: rec.foodListing.id,
        zoneId: rec.zone.id,
        routeId: rec.routeId,
        deviation: rec.deviation,
        matchingScore: rec.matchingScore
      });

      await axios.post(`/api/v1/tasks/${proposeRes.data.id}/accept`);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not accept task matching offer.');
    }
  };

  // Verify pickup geofence and OTP (Real device GPS coordinates passed)
  const handleVerifyPickup = async () => {
    if (!pickupOtp || !activeTask || currentLat === null) {
      setErrorStatus("Need device coordinates before verifying pickup geofence.");
      return;
    }
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
      setErrorStatus(err.response?.data?.message || 'Verification failed. Please check kitchen OTP and geofence proximity.');
    }
  };

  // Verify delivery geofence and OTP (Real coordinates passed)
  const handleVerifyDelivery = async () => {
    if (!deliveryOtp || !activeTask || currentLat === null) {
      setErrorStatus("Need device coordinates before verifying destination geofence.");
      return;
    }
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
      setErrorStatus(err.response?.data?.message || 'Verification failed. Please check coordinator OTP and geofence proximity.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedFile || !activeTask || currentLat === null || currentLng === null) {
      setErrorStatus("Need device coordinates before uploading proof.");
      return;
    }
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
      setErrorStatus(err.response?.data?.message || "Delivery photo verification audit failed.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleCancelTask = async () => {
    if (!activeTask) return;
    if (!window.confirm("Are you sure you want to release this active task? The meals will be returned to the matching pool for other volunteers.")) return;

    setErrorStatus(null);
    try {
      await axios.post(`/api/v1/tasks/${activeTask.id}/cancel`);
      setActiveTask(null);
      fetchVolunteerData();
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || 'Could not release active task.');
    }
  };

  const getUrgencyCountdown = (expiryStr: string) => {
    const diff = new Date(expiryStr).getTime() - nowTime.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

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
        label: 'Kitchen Pickup', 
        desc: 'Verification code at food provider', 
        done: (status !== 'ACCEPTED' && status !== 'NAVIGATING_TO_PICKUP' && status !== 'ARRIVED_AT_PICKUP'), 
        active: (status === 'NAVIGATING_TO_PICKUP' || status === 'ARRIVED_AT_PICKUP') 
      },
      { 
        label: 'In Transit', 
        desc: 'Transporting surplus meals to destination', 
        done: (status !== 'ACCEPTED' && status !== 'NAVIGATING_TO_PICKUP' && status !== 'ARRIVED_AT_PICKUP' && status !== 'PICKED_UP' && status !== 'NAVIGATING_TO_DESTINATION'), 
        active: (status === 'PICKED_UP' || status === 'NAVIGATING_TO_DESTINATION') 
      },
      { 
        label: 'Zone Geofence Unlocked', 
        desc: 'Arrived inside shelter drop-off radius', 
        done: (status === 'ARRIVED_AT_DESTINATION' || status === 'PROOF_SUBMISSION' || status === 'PENDING_VERIFICATION' || status === 'AI_VALIDATION' || status === 'COMPLETED'), 
        active: status === 'ARRIVED_AT_DESTINATION' 
      },
      { 
        label: 'Handover OTP Verified', 
        desc: 'Confirm shelter drop-off verification code', 
        done: (status === 'PROOF_SUBMISSION' || status === 'PENDING_VERIFICATION' || status === 'AI_VALIDATION' || status === 'COMPLETED'), 
        active: status === 'ARRIVED_AT_DESTINATION' 
      },
      { 
        label: 'AI validation approved', 
        desc: 'Validation audit on proof of delivery photo', 
        done: status === 'COMPLETED', 
        active: (status === 'PROOF_SUBMISSION' || status === 'PENDING_VERIFICATION' || status === 'AI_VALIDATION') 
      }
    ];
  };

  const getIdleMapMarkers = () => {
    const markers: any[] = [];
    if (currentLat !== null && currentLng !== null) {
      markers.push({ id: 'volunteer', latitude: currentLat, longitude: currentLng, title: 'Your Position', role: 'CURRENT' as const });
    }
    
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

  // Live deviation checks to show detour warning alerts if volunteer moves away
  const distanceToPickup = activeTask && currentLat !== null && currentLng !== null
    ? calculateDistance(currentLat, currentLng, activeTask.foodListing.pickupLatitude, activeTask.foodListing.pickupLongitude)
    : 0.0;

  const distanceToDestination = activeTask && currentLat !== null && currentLng !== null
    ? calculateDistance(currentLat, currentLng, activeTask.zone.latitude, activeTask.zone.longitude)
    : 0.0;

  const showDetourWarning = activeTask && (
    (activeTask.status.includes('PICKUP') && distanceToPickup > 5.0) || 
    (activeTask.status.includes('DESTINATION') && distanceToDestination > 5.0)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Rewards success modal */}
      {showCompletedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-natural-border shadow-xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-brand-50 border border-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              🎉
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-brand-500 font-extrabold block">Delivery Success</span>
              <h2 className="text-xl font-display font-black text-natural-text uppercase mt-1">Delivery Verified!</h2>
              <p className="text-xs text-natural-muted mt-2 font-medium">
                Your surplus rescue of <strong>{showCompletedReward.quantity} {showCompletedReward.unit}</strong> of <strong>{showCompletedReward.foodName}</strong> has been audited and approved by our AI verification model.
              </p>
            </div>
            <div className="bg-[#FAF9F5] border border-natural-border p-4 rounded-xl flex items-center justify-around">
              <div>
                <span className="text-[8px] text-natural-muted uppercase font-bold tracking-wider block">Coins Earned</span>
                <span className="text-lg font-mono font-black text-brand-600">+{showCompletedReward.coins} coins</span>
              </div>
              <div className="h-8 w-px bg-natural-border"></div>
              <div>
                <span className="text-[8px] text-natural-muted uppercase font-bold tracking-wider block">Wallet Balance</span>
                <span className="text-lg font-mono font-black text-natural-text">{showCompletedReward.prevBalance} ➔ {showCompletedReward.newBalance}</span>
              </div>
            </div>
            <p className="text-[10px] text-natural-muted italic">"Thank you for helping reduce food waste."</p>
            <button
              onClick={() => {
                setShowCompletedReward(null);
                fetchVolunteerData();
              }}
              className="w-full btn-primary"
            >
              Claim & Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Visual greeting header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-natural-border pb-5 text-left gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5 uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Availability: Available
            </span>
          </div>
          <h1 className="text-2xl font-display font-black text-natural-text tracking-tight uppercase">Good morning, {user?.name || 'Volunteer'}</h1>
          <p className="text-xs text-natural-muted mt-0.5 font-semibold">Track and rescue surplus food along your commute route to eliminate transport emissions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {activeTask && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 border border-accent-100 text-accent-700 text-[10px] font-black font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-ping"></span>
              {activeTask.status.replace(/_/g, ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-bold font-mono tracking-wider uppercase">
            GPS Streaming Live
          </span>
        </div>
      </div>

      {gpsPermissionStatus === 'denied' && (
        <div className="p-4 rounded-xl bg-red-55/15 border border-red-200 text-xs text-red-750 flex flex-col md:flex-row md:items-center justify-between text-left font-semibold gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
            <span>Location permission is required to find food along your route. Please enable device location settings.</span>
          </div>
          <button onClick={handleRequestLocation} className="btn-secondary whitespace-nowrap px-3 py-1.5 text-[10px] self-end md:self-auto uppercase">
            Enable Location
          </button>
        </div>
      )}

      {showDetourWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2.5 text-left font-semibold animate-bounce">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>⚠ Detour warning: You are currently moving away from your active delivery route bounds ({activeTask.status.includes('PICKUP') ? distanceToPickup.toFixed(1) : distanceToDestination.toFixed(1)} km away).</span>
        </div>
      )}
      {gpsAccuracyWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-250 text-xs text-amber-850 flex items-start space-x-2.5 text-left font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-650 mt-0.5" />
          <span>{gpsAccuracyWarning}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-755 flex items-start space-x-2.5 text-left font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
          <span>{errorStatus}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2.5 bg-white rounded-2xl border border-natural-border shadow-xs">
          <div className="w-7 h-7 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin"></div>
          <span className="text-xs font-semibold">Reconciling volunteer dashboard datasets...</span>
        </div>
      ) : activeTask ? (
        /* ================= ACTIVE STATE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Map view styled like a navigation module */}
          <div className="lg:col-span-7 bg-white border border-natural-border rounded-2xl p-4 shadow-xs flex flex-col min-h-[460px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-brand-600" /> Live Journey Tracking
              </span>
              <span className="text-[10px] font-mono font-black text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded uppercase tracking-wider">
                {activeTask.status.includes('PICKUP') || activeTask.status === 'ACCEPTED' ? 'Kitchen route' : 'Shelter route'}
              </span>
            </div>

            <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[300px]">
              <MapView
                center={[currentLat || 12.9716, currentLng || 77.5946]}
                zoom={14}
                markers={[
                  ...(currentLat !== null ? [{ id: 'volunteer', latitude: currentLat, longitude: currentLng!, title: 'Your Position', role: 'CURRENT' as const }] : []),
                  { id: 'pickup', latitude: activeTask.foodListing.pickupLatitude, longitude: activeTask.foodListing.pickupLongitude, title: 'Pickup: ' + activeTask.foodListing.foodName, role: 'PROVIDER' as const },
                  { id: 'zone', latitude: activeTask.zone.latitude, longitude: activeTask.zone.longitude, title: activeTask.zone.name, role: 'ZONE' as const }
                ]}
                polylinePoints={routeGeometryPoints}
                interactive={false}
              />
            </div>
            
            {loadingRouteGeometry && (
              <div className="text-[10px] text-brand-600 mt-2 font-bold font-mono animate-pulse">
                ⏳ Recalculating actual road routing geometry via OSRM...
              </div>
            )}
          </div>

          {/* Verification Actions Sidebar panel */}
          <div className="lg:col-span-5 bg-white border border-natural-border rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between text-left space-y-6">
            <div className="space-y-4">
              <div className="border-b border-natural-border pb-4">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-natural-muted">Current Assignment</span>
                  <span className="text-[9px] font-mono font-black bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded">#FD-{activeTask.id.substring(0, 6).toUpperCase()}</span>
                </div>
                <h3 className="font-display font-black text-natural-text tracking-tight text-lg mt-2 flex items-center gap-2 uppercase">
                  <Truck className="w-5 h-5 text-brand-600 shrink-0" /> {activeTask.foodListing.foodName}
                </h3>
                <span className="text-xs font-semibold text-natural-muted block mt-1">
                  Cargo details: {activeTask.foodListing.quantity} {activeTask.foodListing.unit}
                </span>

                {/* Simulated metadata dropdown */}
                <div className="mt-3">
                  <button 
                    onClick={() => setTGpsExpanded(!tGpsExpanded)}
                    className="text-[9px] font-black text-brand-600 hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    {tGpsExpanded ? 'Hide' : 'Show'} GPS Telemetry
                  </button>
                  {tGpsExpanded && currentLat !== null && (
                    <div className="mt-2 p-3 bg-[#FAF9F5] border border-natural-border rounded-xl font-mono text-[9px] text-natural-muted space-y-1.5 animate-in fade-in duration-200">
                      <div>GPS coordinates: {currentLat.toFixed(5)}, {currentLng?.toFixed(5)}</div>
                      <div>Route deviation: {activeTask.routeDeviation.toFixed(2)} km</div>
                      <div>Shelter geofence dist: {calculateDistance(currentLat, currentLng!, activeTask.zone.latitude, activeTask.zone.longitude).toFixed(3)} km</div>
                      <div>Kitchen geofence dist: {calculateDistance(currentLat, currentLng!, activeTask.foodListing.pickupLatitude, activeTask.foodListing.pickupLongitude).toFixed(3)} km</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transit Stops - Visual Route representation */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3 text-xs">
                  <div className="w-5 h-5 rounded-lg bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0">A</div>
                  <div>
                    <h5 className="font-bold text-natural-text uppercase text-[9px] tracking-wider">Pickup Location</h5>
                    <strong className="text-xs text-natural-text font-semibold">{activeTask.foodListing.provider?.businessName}</strong>
                    <p className="text-[11px] text-natural-muted mt-0.5 font-medium leading-relaxed">{activeTask.foodListing.pickupAddress}</p>
                  </div>
                </div>

                <div className="pl-2 border-l-2 border-dashed border-natural-border ml-2.5 h-4"></div>

                <div className="flex items-start space-x-3 text-xs">
                  <div className="w-5 h-5 rounded-lg bg-accent-50 border border-accent-100 text-accent-700 flex items-center justify-center font-bold text-[10px] shrink-0">B</div>
                  <div>
                    <h5 className="font-bold text-natural-text uppercase text-[9px] tracking-wider">Recipient Shelter Zone</h5>
                    <strong className="text-xs text-natural-text block mt-0.5 font-semibold">{activeTask.zone.name}</strong>
                    <p className="text-[11px] text-natural-muted mt-0.5 font-medium leading-relaxed">{activeTask.zone.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-specific verification panels */}
            <div className="pt-4 border-t border-natural-border space-y-4">
              
              {/* STATE: ACCEPTED -> START PICKUP JOURNEY */}
              {activeTask.status === 'ACCEPTED' && (
                <div className="space-y-3 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border text-center">
                  <h4 className="text-xs font-bold text-natural-text uppercase tracking-wider">Ready to Start commute?</h4>
                  <p className="text-xs text-natural-muted leading-relaxed font-semibold">
                    Accepting triggers active GPS telemetry. Start the route to navigate to the kitchen pickup location.
                  </p>
                  <button onClick={handleStartPickup} className="w-full btn-primary py-2.5 text-xs">
                    Start Route Journey to Kitchen
                  </button>
                </div>
              )}

              {/* STATE: NAVIGATING_TO_PICKUP */}
              {activeTask.status === 'NAVIGATING_TO_PICKUP' && (
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">Commuting to Kitchen</span>
                    <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse"></span>
                  </div>
                  <p className="text-xs text-natural-muted leading-normal font-semibold">
                    Head to <strong>{activeTask.foodListing.provider?.businessName}</strong>. Pickup verification geofence unlocks when within 250m.
                  </p>
                  {currentLat !== null && (
                    <div className="p-3 bg-white rounded-lg border border-natural-border flex justify-between font-mono text-[9px] font-bold text-natural-muted">
                      <span>Kitchen Distance:</span>
                      <span className="text-natural-text">
                        {Math.round(calculateDistance(currentLat, currentLng!, activeTask.foodListing.pickupLatitude, activeTask.foodListing.pickupLongitude) * 1000)} m
                      </span>
                    </div>
                  )}
                  <button onClick={handleArrivePickup} className="w-full btn-primary py-2 text-[10px]">
                    I've Arrived (Check Geofence)
                  </button>
                </div>
              )}

              {/* STATE: ARRIVED_AT_PICKUP -> OTP INPUT */}
              {activeTask.status === 'ARRIVED_AT_PICKUP' && (
                <div className="space-y-3 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border">
                  <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">Confirm Dispatch Handover</span>
                  <p className="text-xs text-natural-muted leading-relaxed font-medium">
                    Please collect the package from the kitchen staff and enter the 6-digit handover OTP.
                  </p>
                  {verificationData && (
                    <div className="text-[9px] text-accent-700 bg-accent-50 border border-accent-100 p-2.5 rounded-lg flex items-center space-x-1.5 font-mono font-bold">
                      <span>💡 <strong>Simulation OTP:</strong> <code>{verificationData.pickupOtp}</code></span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pickupOtp}
                      onChange={(e) => setPickupOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                    />
                    <button onClick={handleVerifyPickup} className="btn-primary whitespace-nowrap px-4 py-2">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: PICKED_UP -> START DELIVERY JOURNEY */}
              {activeTask.status === 'PICKED_UP' && (
                <div className="space-y-3 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border text-center">
                  <h4 className="text-xs font-bold text-natural-text uppercase tracking-wider">Food Picked Up successfully!</h4>
                  <p className="text-xs text-natural-muted leading-relaxed font-semibold">
                    Surplus packages have been safely transferred. Start the route to navigate to the shelter drop-off zone.
                  </p>
                  <button onClick={handleStartDelivery} className="w-full btn-primary py-2.5 text-xs">
                    Start Route Journey to Shelter
                  </button>
                </div>
              )}

              {/* STATE: NAVIGATING_TO_DESTINATION */}
              {activeTask.status === 'NAVIGATING_TO_DESTINATION' && (
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">Commuting to Shelter</span>
                    <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse"></span>
                  </div>
                  <p className="text-xs text-natural-muted leading-normal font-semibold">
                    Head to <strong>{activeTask.zone.name}</strong>. Geofence arrival triggers automatically when within 250m.
                  </p>
                  {currentLat !== null && (
                    <div className="p-3 bg-white rounded-lg border border-natural-border flex justify-between font-mono text-[9px] font-bold text-natural-muted">
                      <span>Shelter Distance:</span>
                      <span className="text-natural-text">
                        {Math.round(calculateDistance(currentLat, currentLng!, activeTask.zone.latitude, activeTask.zone.longitude) * 1000)} m
                      </span>
                    </div>
                  )}
                  <button onClick={handleArriveDelivery} className="w-full btn-primary py-2 text-[10px]">
                    I've Arrived (Check Dropoff Geofence)
                  </button>
                </div>
              )}

              {/* STATE: ARRIVED_AT_DESTINATION -> Dropoff OTP */}
              {activeTask.status === 'ARRIVED_AT_DESTINATION' && (
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border">
                  <div>
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">Confirm Recipient Handover</span>
                    <p className="text-xs text-natural-muted mt-1 leading-relaxed font-medium">
                      Enter the destination handover OTP code obtained from the shelter coordinator.
                    </p>
                  </div>

                  {verificationData && (
                    <div className="text-[9px] text-accent-700 bg-accent-50 border border-accent-100 p-2.5 rounded-lg flex items-center space-x-1.5 font-mono font-bold">
                      <span>💡 <strong>Simulation OTP:</strong> <code>{verificationData.deliveryOtp}</code></span>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={deliveryOtp}
                      onChange={(e) => setDeliveryOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="block w-full px-3 py-2 border border-gray-300 font-mono tracking-widest text-center rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                    />
                    <button onClick={handleVerifyDelivery} className="btn-primary whitespace-nowrap px-4 py-2">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: PROOF_SUBMISSION */}
              {(activeTask.status === 'PROOF_SUBMISSION' || activeTask.status === 'PHOTO_REJECTED') && (
                <div className="space-y-4 bg-[#FAF9F5] p-4 rounded-xl border border-natural-border text-left">
                  <div>
                    <span className="text-xs font-bold text-natural-text uppercase tracking-wider block">Photo proof Validation</span>
                    <p className="text-xs text-natural-muted mt-1 leading-relaxed font-medium">
                      Provide a clear photo of the delivered food items at the shelter to claim rewards.
                    </p>
                  </div>

                  {activeTask.status === 'PHOTO_REJECTED' && (
                    <div className="p-3 bg-red-55/10 border border-red-200 text-[11px] text-red-700 rounded-xl leading-normal font-semibold">
                      ❌ Verification rejected. Photo matched duplicate hashes or failed content metrics. Please upload a genuine, distinct picture.
                    </div>
                  )}

                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="evidence-image-camera"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="evidence-image-file"
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        htmlFor="evidence-image-camera"
                        className="flex flex-col items-center justify-center p-4 border border-dashed border-natural-border rounded-xl hover:bg-white cursor-pointer transition-all text-center bg-white"
                      >
                        <Camera className="w-5 h-5 text-brand-600 mb-1.5" />
                        <span className="text-[10px] font-bold text-brand-700 uppercase">Camera Capture</span>
                      </label>
                      <label
                        htmlFor="evidence-image-file"
                        className="flex flex-col items-center justify-center p-4 border border-dashed border-natural-border rounded-xl hover:bg-white cursor-pointer transition-all text-center bg-white"
                      >
                        <ShoppingBag className="w-5 h-5 text-brand-600 mb-1.5" />
                        <span className="text-[10px] font-bold text-brand-700 uppercase">Image Upload</span>
                      </label>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="flex flex-col p-3 bg-brand-50/55 border border-brand-100 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center text-brand-900 font-mono font-bold">
                        <span className="truncate max-w-[170px]">{selectedFile.name}</span>
                        <span>{Math.round(selectedFile.size / 1024)} KB</span>
                      </div>
                      <button
                        onClick={handleSubmitProof}
                        disabled={submittingProof}
                        className="w-full btn-primary py-2 text-[10px]"
                      >
                        {submittingProof ? 'Uploading...' : 'Submit Photo for AI audit'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STATE: PENDING VERIFICATION (ML service down/uncertain fallback) */}
              {activeTask.status === 'PENDING_VERIFICATION' && (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-center space-y-3.5">
                  <div className="text-2xl">⏳</div>
                  <div>
                    <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Proof Validation Pending</h4>
                    <p className="text-xs text-amber-700 mt-2 font-medium leading-relaxed">
                      Proof validation unavailable. Reward is pending verification.
                    </p>
                  </div>
                  <p className="text-[9px] text-amber-600 font-mono">
                    The backend has saved the upload. Admin review is checking coordinate signatures.
                  </p>
                  <button
                    onClick={fetchVolunteerData}
                    className="w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] rounded-lg font-bold border border-amber-200 transition-colors uppercase tracking-wider"
                  >
                    Check Audit Status
                  </button>
                </div>
              )}

              {/* STATE: AI_VALIDATION & INTERMEDIATE VERIFICATION STATES */}
              {(activeTask.status === 'AI_VALIDATION' || activeTask.status === 'VERIFIED' || activeTask.status === 'REWARD_CREDITED') && (
                <div className="bg-[#FAF9F5] p-5 rounded-xl border border-natural-border text-center space-y-4">
                  <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto"></div>
                  <div>
                    <h4 className="font-bold text-natural-text text-xs uppercase tracking-wider">AI Proof Validation Auditing</h4>
                    <div className="text-left max-w-xs mx-auto space-y-2 mt-4 text-[10px] font-bold text-natural-muted font-mono">
                      <div className="flex items-center gap-1.5 text-brand-600">✓ Metadata Signature received</div>
                      <div className="flex items-center gap-1.5 text-brand-600">✓ GPS Location verified</div>
                      
                      <div className={activeTask.status === 'VERIFIED' || activeTask.status === 'REWARD_CREDITED' ? 'text-brand-600' : 'text-brand-400 animate-pulse'}>
                        {activeTask.status === 'VERIFIED' || activeTask.status === 'REWARD_CREDITED' ? '✓ Image approved' : '● Running AI object inference...'}
                      </div>
                      <div className={activeTask.status === 'REWARD_CREDITED' ? 'text-brand-600 font-black' : 'text-brand-400 animate-pulse font-black'}>
                        {activeTask.status === 'REWARD_CREDITED' ? '✓ Coins credited' : '● Processing reward tokens...'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical timeline status tracker */}
              <div className="pt-4 border-t border-natural-border space-y-3">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-natural-muted">Rescue route milestones</h4>
                <div className="space-y-4 text-left">
                  {getTimelineSteps().map((stp, idx) => (
                    <div key={idx} className="flex space-x-3 text-xs">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                          stp.done 
                            ? 'bg-brand-600 border-brand-600 text-white shadow-xs' 
                            : stp.active 
                              ? 'bg-accent-500 border-accent-600 text-white shadow-sm animate-pulse' 
                              : 'bg-white text-gray-300 border-gray-200'
                        }`}>
                          {stp.done ? '✓' : idx + 1}
                        </div>
                        {idx < 5 && <div className={`w-0.5 h-5 ${stp.done ? 'bg-brand-600' : 'bg-gray-150'} mt-1`}></div>}
                      </div>
                      <div>
                        <span className={`font-bold block uppercase text-[9px] tracking-wider ${stp.active ? 'text-brand-700' : 'text-natural-text'}`}>{stp.label}</span>
                        <span className="text-[9px] text-natural-muted font-medium block mt-0.5 leading-snug">{stp.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancel task action */}
              <div className="pt-4 border-t border-red-50">
                <button
                  type="button"
                  onClick={handleCancelTask}
                  className="w-full py-2 bg-red-55/10 hover:bg-red-50 text-red-650 border border-red-100 font-bold text-[9px] rounded-lg transition-colors uppercase tracking-widest text-center animate-none"
                >
                  ✖ Release Active Rescue Task
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= IDLE STATE ================= */
        <div className="space-y-6">
          
          {/* Volunteer KPI metrics dashboard block */}
          <div className="grid grid-cols-2 md:grid-cols-5 bg-white border border-natural-border rounded-xl shadow-xs text-left divide-x divide-y md:divide-y-0 divide-natural-border overflow-hidden">
            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-natural-muted flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-500" /> Route Reliability
                </span>
                <div className="text-2xl font-mono font-black text-natural-text mt-2">{Math.round(vStats.reliabilityScore * 100)}%</div>
              </div>
              <span className="text-[8px] text-natural-muted mt-2 font-semibold block uppercase">Handover timing integrity</span>
            </div>
            
            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-natural-muted flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-accent-500" /> Completed Tasks
                </span>
                <div className="text-2xl font-mono font-black text-natural-text mt-2">{vStats.completedDeliveries}</div>
              </div>
              <span className="text-[8px] text-natural-muted mt-2 font-semibold block uppercase">Successful rescues</span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-natural-muted flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-brand-500" /> Community Rating
                </span>
                <div className="text-2xl font-mono font-black text-natural-text mt-2">★ {vStats.rating.toFixed(1)}</div>
              </div>
              <span className="text-[8px] text-natural-muted mt-2 font-semibold block uppercase">Kitchen feedback score</span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-natural-muted flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-500" /> CO2 Offset / Food
                </span>
                <div className="text-2xl font-mono font-black text-natural-text mt-2">{(vStats.mealsDelivered * 0.5).toFixed(1)} kg</div>
              </div>
              <span className="text-[8px] text-natural-muted mt-2 font-semibold block uppercase">Rescued {vStats.mealsDelivered} meals</span>
            </div>

            <div className="p-4 flex flex-col justify-between bg-brand-50/20">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-brand-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-500" /> Token Wallet
                </span>
                <div className="text-2xl font-mono font-black text-brand-600 mt-2">🪙 {vStats.tokens} coins</div>
              </div>
              <span className="text-[8px] text-brand-600 mt-2 font-bold block uppercase">Claim dining coupon discount</span>
            </div>
          </div>

          {/* Split screens: Interactive Finder map vs tabbed matches ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Live Interactive Map */}
            <div className="lg:col-span-6 bg-white border border-natural-border rounded-2xl p-4 shadow-xs flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-brand-600" /> Journey Detour Overlay Map
                </span>
                <span className="text-[9px] bg-brand-50 border border-brand-100 text-brand-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider font-mono">
                  {selectedRecId ? 'Detour Selected' : 'Tap Card to Preview'}
                </span>
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[350px]">
                <MapView
                  center={[currentLat || 12.9716, currentLng || 77.5946]}
                  zoom={12}
                  markers={getIdleMapMarkers()}
                  polylinePoints={idlePolyline}
                  interactive={false}
                />
              </div>

              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-natural-border mt-3 text-[10px] text-natural-muted font-medium text-left leading-relaxed">
                📍 <strong>Live GPS stream:</strong> Geolocation updates will continuously stream from your browser device sensor to map matching algorithms.
              </div>
            </div>

            {/* Tabbed Recommendations & Sustainability details */}
            <div className="lg:col-span-6 bg-white border border-natural-border rounded-2xl shadow-xs flex flex-col overflow-hidden max-h-[570px] text-left">
              
              {/* Tabs list header */}
              <div className="flex border-b border-natural-border bg-[#FAF9F5] px-4 pt-3 gap-2">
                <button
                  onClick={() => setActiveTab('MATCHES')}
                  className={`pb-2.5 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'MATCHES' ? 'border-brand-600 text-brand-700' : 'border-transparent text-natural-muted hover:text-natural-text'
                  }`}
                >
                  Live Matches
                </button>
                <button
                  onClick={() => setActiveTab('IMPACT')}
                  className={`pb-2.5 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'IMPACT' ? 'border-brand-600 text-brand-700' : 'border-transparent text-natural-muted hover:text-natural-text'
                  }`}
                >
                  Impact Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`pb-2.5 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'HISTORY' ? 'border-brand-600 text-brand-700' : 'border-transparent text-natural-muted hover:text-natural-text'
                  }`}
                >
                  Rescues History
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto bg-white">
                
                {/* 1. Matches list */}
                {activeTab === 'MATCHES' && (
                  <div>
                    {recommendations.length === 0 ? (
                      <div className="p-12 text-center text-natural-muted space-y-4 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 opacity-80 shrink-0">
                          <img src={foodRescueImg} alt="No Food Matches" className="w-full h-full object-contain animate-pulse" />
                        </div>
                        <p className="text-xs font-semibold">No surplus food listings match your commute pathways.</p>
                        <Link to="/volunteer/routes" className="btn-secondary normal-case text-xs">
                          Configure Commute Routes
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-natural-border">
                        {recommendations.map((rec) => {
                          const pickupDist = currentLat !== null && currentLng !== null
                            ? calculateDistance(currentLat, currentLng, rec.foodListing.pickupLatitude, rec.foodListing.pickupLongitude)
                            : 0.0;
                          const expectedCoins = getExpectedRewardForTask(rec);
                          const isVeg = rec.foodListing.category === 'VEG';
                          const isCardSelected = selectedRecId === rec.foodListing.id;
                          
                          let matchQuality = "Excellent match";
                          if (rec.matchingScore < 70) {
                            matchQuality = "Fair match";
                          } else if (rec.matchingScore < 85) {
                            matchQuality = "Good match";
                          }

                          return (
                            <div
                              key={rec.foodListing.id}
                              onClick={() => setSelectedRecId(rec.foodListing.id)}
                              className={`p-4 hover:bg-[#FAF9F5]/80 cursor-pointer transition-all flex flex-col gap-3.5 border-b border-natural-border last:border-b-0 ${
                                isCardSelected ? 'bg-brand-50/10 border-l-4 border-l-brand-600 pl-3' : ''
                              }`}
                            >
                              <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-natural-border bg-[#FAF9F5] relative shadow-xs">
                                  {rec.foodListing.imageUrl ? (
                                    <img src={rec.foodListing.imageUrl} alt={rec.foodListing.foodName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl bg-brand-50">🍲</div>
                                  )}
                                  <span className={`absolute top-1 left-1 text-[7px] font-black px-1 py-0.5 rounded tracking-wide border shadow-xs ${
                                    isVeg ? 'bg-emerald-55/10 text-emerald-800 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {rec.foodListing.category}
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0 text-left space-y-1 text-xs">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[8px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-black uppercase font-mono">
                                      ★ {rec.matchingScore}% {matchQuality}
                                    </span>
                                    <span className="text-[8px] bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                      Detour: {rec.deviation.toFixed(1)} km
                                    </span>
                                    <span className="text-[8px] bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded font-bold font-mono">
                                      {pickupDist.toFixed(1)} km away
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="font-display font-black text-xs text-natural-text truncate uppercase leading-tight mt-0.5">{rec.foodListing.foodName}</h4>
                                    <p className="text-[10px] text-natural-muted font-bold mt-0.5">{rec.foodListing.provider?.businessName}</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2 rounded-lg border border-natural-border text-[9px] font-semibold font-mono">
                                    <div>
                                      <span className="block text-[7px] uppercase font-bold tracking-wider text-natural-muted font-sans">Kitchen prep</span>
                                      <span className="text-natural-text font-bold block">{formatTime(rec.foodListing.preparationTime)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[7px] uppercase font-bold tracking-wider text-natural-muted font-sans">Safety window</span>
                                      <span className="text-brand-600 font-bold block">{formatTime(rec.foodListing.expiryTime)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-natural-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs bg-white">
                                <div className="text-[10px] space-y-0.5 text-natural-muted font-medium flex-1 min-w-0">
                                  <div className="truncate"><span className="font-bold text-natural-text uppercase text-[8px] tracking-wider mr-1">Pickup:</span> {rec.foodListing.pickupAddress}</div>
                                  <div className="truncate"><span className="font-bold text-natural-text uppercase text-[8px] tracking-wider mr-1">Destination:</span> {rec.zone.name}</div>
                                </div>

                                <div className="flex items-center justify-between gap-3 shrink-0 self-end sm:self-auto">
                                  <div className="text-right">
                                    <span className="text-[8px] uppercase font-bold text-brand-700 tracking-wider block font-mono font-black">Est Payout</span>
                                    <strong className="text-xs font-mono font-black text-brand-600">🪙 {expectedCoins} coins</strong>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptTask(rec);
                                    }}
                                    className="btn-primary py-2 px-3 text-[10px]"
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
                )}

                {/* 2. Sustainability Impact View */}
                {activeTab === 'IMPACT' && (
                  <div className="p-5 space-y-5 text-left text-xs">
                    <div>
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">CO2 Emissions Avoided</h4>
                      <p className="text-[10px] text-natural-muted mt-0.5 font-semibold">Rescuing meals using existing journeys prevents methane and transport carbon offsets.</p>
                    </div>

                    {/* SVG Line Graph representation */}
                    <div className="border border-natural-border rounded-xl p-4 bg-[#FAF9F5] shadow-xs relative">
                      <div className="h-44 w-full flex items-end justify-between relative pt-6 pb-2">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                          <div className="border-b border-dashed border-natural-border w-full h-px"></div>
                          <div className="border-b border-dashed border-natural-border w-full h-px"></div>
                          <div className="border-b border-dashed border-natural-border w-full h-px"></div>
                          <div className="border-b border-dashed border-natural-border w-full h-px"></div>
                        </div>

                        {/* Custom SVG Curve */}
                        <svg className="absolute inset-x-0 bottom-2 h-32 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#244F3C" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#244F3C" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0 80 Q 20 60 40 45 T 80 20 T 100 10 L 100 100 L 0 100 Z"
                            fill="url(#gradient-area)"
                          />
                          <path
                            d="M 0 80 Q 20 60 40 45 T 80 20 T 100 10"
                            fill="none"
                            stroke="#244F3C"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <circle cx="100" cy="10" r="5" fill="#244F3C" stroke="white" strokeWidth="2" />
                        </svg>

                        {/* Tooltip marker */}
                        <div className="absolute top-2 right-4 bg-white px-2 py-1 border border-natural-border rounded shadow-sm font-mono text-[9px] font-bold text-brand-700">
                          Total: {(vStats.mealsDelivered * 0.5 * 2.5).toFixed(1)} kg CO2e Offset
                        </div>
                      </div>
                      
                      {/* Timeline indices */}
                      <div className="flex justify-between border-t border-natural-border pt-2 text-[8px] font-mono font-bold text-natural-muted uppercase">
                        <span>May 1</span>
                        <span>May 10</span>
                        <span>May 20</span>
                        <span>May 31 (Today)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="p-3 border border-natural-border bg-white rounded-xl">
                        <span className="text-[8px] text-natural-muted uppercase font-bold tracking-wider block">Food Weight Avoided</span>
                        <strong className="text-sm font-mono text-natural-text font-black block mt-1">{(vStats.mealsDelivered * 0.5).toFixed(1)} kg</strong>
                        <span className="text-[8px] text-brand-600 font-bold block mt-1">✓ Diverted from landfill decomposition</span>
                      </div>
                      
                      <div className="p-3 border border-natural-border bg-white rounded-xl">
                        <span className="text-[8px] text-natural-muted uppercase font-bold tracking-wider block">Equivalent carbon offset</span>
                        <strong className="text-sm font-mono text-natural-text font-black block mt-1">{(vStats.mealsDelivered * 0.5 * 2.5).toFixed(1)} kg CO2e</strong>
                        <span className="text-[8px] text-brand-600 font-bold block mt-1">✓ Equivalent to 4 saplings planted</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. History list */}
                {activeTab === 'HISTORY' && (
                  <div>
                    {historyTasks.length === 0 ? (
                      <div className="p-12 text-center text-natural-muted space-y-4 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 opacity-80 shrink-0">
                          <img src={communityRewardImg} alt="No Rescues History" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs font-semibold">You have not completed any rescues yet. Accept matched transit offers to start.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-natural-border">
                        {historyTasks.map((t: any) => (
                          <div key={t.id} className="p-4 flex justify-between items-center text-xs text-left hover:bg-[#FAF9F5]">
                            <div className="space-y-1 flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center text-[7px] text-brand-700 bg-brand-50 border border-brand-100 font-black rounded px-1.5 py-0.5 uppercase tracking-wide">
                                  ✓ Verified Complete
                                </span>
                                <span className="text-[8px] font-mono text-natural-muted font-bold">#FD-{t.id.substring(0, 6).toUpperCase()}</span>
                              </div>
                              <h5 className="font-display font-black text-xs text-natural-text truncate uppercase mt-0.5">{t.foodListing.foodName}</h5>
                              <p className="text-[10px] text-natural-muted leading-relaxed font-semibold">
                                From: {t.foodListing.provider?.businessName || 'Provider'} ➔ To: {t.zone.name}
                              </p>
                              <span className="text-[8px] text-natural-muted block font-mono">
                                Quantity: {t.foodListing.quantity} {t.foodListing.unit}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <strong className="text-xs font-mono font-black text-brand-600 block">🪙 +{getExpectedRewardForTask(t)} coins</strong>
                              <span className="text-[8px] text-natural-muted block mt-0.5 font-mono">
                                {new Date(t.createdAt || new Date()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
