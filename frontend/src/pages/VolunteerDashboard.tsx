import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  CheckCircle2, AlertTriangle, Truck, MapPin, Navigation, Clock, ShieldAlert, Award, 
  AlertCircle, Camera, Heart, Trophy, Sparkles, ChevronRight, Activity, Calendar, ShieldCheck, Check,
  RefreshCw, Map, User, ShoppingBag, Eye, HelpCircle, ArrowRight, Compass, ChevronDown, ChevronUp, Loader2,
  Star, Coins, PartyPopper, Lightbulb, XCircle, Utensils, X
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
    source?: string;
  };
  routeId: string | null;
  deviation: number;
  matchingScore: number;
  distanceToDestination?: number | null;
}

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active task details
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null);

  // Recommendations, stats, and history
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'IMPACT' | 'HISTORY' | 'SHELTERS'>('MATCHES');

  // Shelter deliveries states
  const [availableShelterDeliveries, setAvailableShelterDeliveries] = useState<any[]>([]);
  const [activeShelterTask, setActiveShelterTask] = useState<any | null>(null);
  const [shelterOtp, setShelterOtp] = useState('');
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  const [quantityReason, setQuantityReason] = useState('');
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [signature, setSignature] = useState('');
  const [completingShelterTask, setCompletingShelterTask] = useState(false);
  const [showCompletedReward, setShowCompletedReward] = useState<any | null>(null);
  const [sessionConfig, setSessionConfig] = useState<any>(null);

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

  const getActiveSessionDetails = () => {
    if (!sessionConfig) return null;
    const now = new Date();
    // Convert to target timezone (e.g. Asia/Kolkata)
    const options = { timeZone: sessionConfig.timezone, hour12: false, hour: '2-digit', minute: '2-digit' } as const;
    const istString = now.toLocaleTimeString('en-US', options);
    const [hStr, mStr] = istString.split(':');
    const hours = parseInt(hStr);
    const minutes = parseInt(mStr);
    const currentMins = hours * 60 + minutes;

    // Parse afternoon start & end
    const [aftStartH, aftStartM] = (sessionConfig.AFTERNOON.start).split(':').map(Number);
    const [aftEndH, aftEndM] = (sessionConfig.AFTERNOON.end).split(':').map(Number);
    const aftStartMins = aftStartH * 60 + aftStartM;
    const aftEndMins = aftEndH * 60 + aftEndM;

    // Parse night start & end
    const [nightStartH, nightStartM] = (sessionConfig.NIGHT.start).split(':').map(Number);
    const [nightEndH, nightEndM] = (sessionConfig.NIGHT.end).split(':').map(Number);
    const nightStartMins = nightStartH * 60 + nightStartM;
    const nightEndMins = nightEndH * 60 + nightEndM;

    if (currentMins >= aftStartMins && currentMins <= aftEndMins) {
      return {
        active: true,
        name: 'Afternoon Distribution Session',
        remaining: aftEndMins - currentMins,
        window: `${sessionConfig.AFTERNOON.start} - ${sessionConfig.AFTERNOON.end}`
      };
    } else if (currentMins >= nightStartMins && currentMins <= nightEndMins) {
      return {
        active: true,
        name: 'Night Distribution Session',
        remaining: nightEndMins - currentMins,
        window: `${sessionConfig.NIGHT.start} - ${sessionConfig.NIGHT.end}`
      };
    }

    // Calculate next session
    let nextSessionName = '';
    let nextSessionWindow = '';
    let minutesToNext = 0;
    if (currentMins < aftStartMins) {
      nextSessionName = 'Afternoon Distribution';
      nextSessionWindow = `${sessionConfig.AFTERNOON.start} - ${sessionConfig.AFTERNOON.end}`;
      minutesToNext = aftStartMins - currentMins;
    } else if (currentMins < nightStartMins) {
      nextSessionName = 'Night Distribution';
      nextSessionWindow = `${sessionConfig.NIGHT.start} - ${sessionConfig.NIGHT.end}`;
      minutesToNext = nightStartMins - currentMins;
    } else {
      nextSessionName = 'Afternoon Distribution (Tomorrow)';
      nextSessionWindow = `${sessionConfig.AFTERNOON.start} - ${sessionConfig.AFTERNOON.end}`;
      minutesToNext = (24 * 60 - currentMins) + aftStartMins;
    }

    return {
      active: false,
      nextName: nextSessionName,
      nextWindow: nextSessionWindow,
      minutesToNext
    };
  };

  // OSRM route geometry states
  const [routeGeometryPoints, setRouteGeometryPoints] = useState<[number, number][]>([]);
  const [loadingRouteGeometry, setLoadingRouteGeometry] = useState(false);

  // Community Need Report Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportAddress, setReportAddress] = useState('');
  const [reportCity, setReportCity] = useState('');
  const [reportState, setReportState] = useState('');
  const [reportCountry, setReportCountry] = useState('');
  const [reportEstimatedPeople, setReportEstimatedPeople] = useState(10);
  const [reportCategory, setReportCategory] = useState('FOOD');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidenceUrl, setReportEvidenceUrl] = useState('');
  const [reportTimeObserved, setReportTimeObserved] = useState(() => new Date().toISOString().slice(0, 16));
  const [reportingError, setReportingError] = useState<string | null>(null);
  const [reportingSuccess, setReportingSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [existingDuplicateZone, setExistingDuplicateZone] = useState<any | null>(null);
  const [isReportingLocation, setIsReportingLocation] = useState(false);
  const [reportLatitude, setReportLatitude] = useState<number | null>(null);
  const [reportLongitude, setReportLongitude] = useState<number | null>(null);
  const [reportGpsAccuracy, setReportGpsAccuracy] = useState<number | null>(null);

  const resetReportForm = () => {
    setReportName('');
    setReportAddress('');
    setReportCity('');
    setReportState('');
    setReportCountry('');
    setReportEstimatedPeople(10);
    setReportCategory('FOOD');
    setReportDescription('');
    setReportEvidenceUrl('');
    setReportTimeObserved(new Date().toISOString().slice(0, 16));
    setReportingError(null);
    setReportingSuccess(false);
    setDuplicateWarning(false);
    setExistingDuplicateZone(null);
    setReportLatitude(null);
    setReportLongitude(null);
    setReportGpsAccuracy(null);
  };

  const captureReportGpsLocation = () => {
    setIsReportingLocation(true);
    setReportingError(null);
    if (!navigator.geolocation) {
      setReportingError("Browser geolocation is not supported by your device.");
      setIsReportingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy > 2000) {
          setReportingError(`Location accuracy is too low (${Math.round(accuracy)} meters). Please try again in an area with a clearer GPS signal.`);
          setIsReportingLocation(false);
          return;
        }
        setReportLatitude(latitude);
        setReportLongitude(longitude);
        setReportGpsAccuracy(accuracy);
        
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.data && res.data.address) {
            const addr = res.data.address;
            const street = addr.road || addr.pedestrian || addr.suburb || '';
            const houseNumber = addr.house_number || '';
            const fullStreet = houseNumber ? `${houseNumber} ${street}`.trim() : street;
            
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const country = addr.country || '';
            const landmark = addr.amenity || addr.building || addr.shop || addr.leisure || '';

            if (landmark) setReportName(`Near ${landmark}`);
            else if (fullStreet) setReportName(`Near ${fullStreet}`);
            
            if (fullStreet) setReportAddress(fullStreet);
            if (city) setReportCity(city);
            if (state) setReportState(state);
            if (country) setReportCountry(country);
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }

        setIsReportingLocation(false);
      },
      (error) => {
        setReportingError("Failed to fetch GPS coordinates. Please grant location permissions.");
        setIsReportingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleReportSubmit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    setReportingError(null);

    if (reportLatitude === null || reportLongitude === null) {
      setReportingError("GPS coordinates are required. Please capture your location first.");
      return;
    }
    if (!reportName.trim()) {
      setReportingError("Please enter a location name.");
      return;
    }
    if (!reportAddress.trim()) {
      setReportingError("Please enter an address.");
      return;
    }
    if (!reportCity.trim()) {
      setReportingError("Please enter a city.");
      return;
    }

    try {
      const payload = {
        name: reportName,
        latitude: reportLatitude,
        longitude: reportLongitude,
        address: reportAddress,
        city: reportCity,
        state: reportState || "State",
        country: reportCountry || "India",
        estimatedPeople: reportEstimatedPeople,
        needCategory: reportCategory,
        description: reportDescription,
        evidenceUrl: reportEvidenceUrl,
        validFrom: new Date(reportTimeObserved).toISOString()
      };

      const res = await axios.post(`/api/v1/zones/community-needs?force=${force}`, payload);
      setReportingSuccess(true);
      fetchVolunteerData();
      setTimeout(() => {
        setIsReportModalOpen(false);
        resetReportForm();
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateWarning(true);
        setExistingDuplicateZone(err.response.data.existingZone);
      } else {
        setReportingError(err.response?.data?.message || "Failed to submit community need report.");
      }
    }
  };

  const handleConfirmExistingDuplicate = async () => {
    if (!existingDuplicateZone) return;
    setReportingError(null);
    try {
      const payload = {
        estimatedPeople: reportEstimatedPeople,
        description: reportDescription
      };
      await axios.post(`/api/v1/zones/community-needs/${existingDuplicateZone.id}/confirm`, payload);
      setReportingSuccess(true);
      fetchVolunteerData();
      setTimeout(() => {
        setIsReportModalOpen(false);
        resetReportForm();
      }, 2000);
    } catch (err: any) {
      setReportingError(err.response?.data?.message || "Failed to confirm existing community need.");
    }
  };

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

      // Sync shelter deliveries
      try {
        const myDeliveriesRes = await axios.get('/api/v1/volunteer/deliveries');
        const activeST = myDeliveriesRes.data.find(
          (d: any) => d.status !== 'DELIVERED' && d.status !== 'FAILED' && d.status !== 'CANCELLED'
        );
        setActiveShelterTask(activeST || null);

        const lat = currentLat || 12.9716;
        const lng = currentLng || 77.5946;
        const availRes = await axios.get(`/api/v1/volunteer/available-deliveries?volunteerLat=${lat}&volunteerLng=${lng}`);
        setAvailableShelterDeliveries(availRes.data || []);
      } catch (shelterErr) {
        console.error("Failed to load shelter deliveries", shelterErr);
      }
    } catch (e: any) {
      console.error(e);
      setErrorStatus("Failed to load volunteer commute console datasets.");
    } finally {
      setLoading(false);
    }
  };

  const fetchShelterDeliveries = async () => {
    try {
      const myDeliveriesRes = await axios.get('/api/v1/volunteer/deliveries');
      const activeST = myDeliveriesRes.data.find(
        (d: any) => d.status !== 'DELIVERED' && d.status !== 'FAILED' && d.status !== 'CANCELLED'
      );
      setActiveShelterTask(activeST || null);

      const lat = currentLat || 12.9716;
      const lng = currentLng || 77.5946;
      const availRes = await axios.get(`/api/v1/volunteer/available-deliveries?volunteerLat=${lat}&volunteerLng=${lng}`);
      setAvailableShelterDeliveries(availRes.data || []);
    } catch (e) {
      console.error("Failed to fetch shelter deliveries", e);
    }
  };

  useEffect(() => {
    if (currentLat !== null && currentLng !== null) {
      fetchShelterDeliveries();
    }
  }, [currentLat, currentLng]);

  useEffect(() => {
    handleRequestLocation();
    fetchVolunteerData();

    axios.get('/api/v1/sessions/config')
      .then(res => setSessionConfig(res.data))
      .catch(err => console.error("Could not load sessions configuration", err));

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

          if (accuracy > 2000) {
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

  // --- Shelter Deliveries Actions ---

  const handleAcceptShelterDelivery = async (reqId: string) => {
    try {
      await axios.post(`/api/v1/volunteer/deliveries/${reqId}/accept`);
      alert("Delivery accepted! Navigation active.");
      fetchVolunteerData();
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to accept delivery.");
    }
  };

  const handleStartShelterDelivery = async (id: string) => {
    try {
      await axios.post(`/api/v1/volunteer/deliveries/${id}/start`, {
        currentLat,
        currentLng
      });
      alert("Delivery navigation started!");
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to start delivery.");
    }
  };

  const handleArriveShelterDelivery = async (id: string) => {
    try {
      await axios.post(`/api/v1/volunteer/deliveries/${id}/arrive`, {
        currentLat,
        currentLng
      });
      alert("Arrived successfully! Please request handover OTP from the coordinator.");
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to arrive at location.");
    }
  };

  const handleVerifyShelterOtp = async (id: string) => {
    if (!shelterOtp.trim()) {
      alert("Please enter the 6-digit OTP.");
      return;
    }
    try {
      await axios.post(`/api/v1/volunteer/deliveries/${id}/verify-otp`, {
        otp: shelterOtp
      });
      alert("OTP Handover verified! Please take a photo proof to complete delivery.");
      setShelterOtp('');
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Invalid OTP code.");
    }
  };

  const handleUploadShelterProof = async (id: string, file: File) => {
    if (!currentLat || !currentLng) {
      alert("GPS coordinates are required to upload photo proof.");
      return;
    }
    setSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("latitude", currentLat.toString());
      formData.append("longitude", currentLng.toString());

      await axios.post(`/api/v1/volunteer/deliveries/${id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Photo proof successfully uploaded!");
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to upload photo proof.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleCompleteShelterDelivery = async (id: string) => {
    if (!repName.trim()) {
      alert("Please enter Representative Name.");
      return;
    }
    if (actualQuantity < activeShelterTask.foodRequirement.quantityRequired && !quantityReason.trim()) {
      alert("A short explanation is required when the delivered quantity is lower than required.");
      return;
    }
    setCompletingShelterTask(true);
    try {
      const payload = {
        actualQuantity,
        reason: quantityReason,
        representativeName: repName,
        representativePhone: repPhone,
        digitalSignature: signature
      };
      await axios.post(`/api/v1/volunteer/deliveries/${id}/complete`, payload);
      alert("Handover completed! 15 tokens awarded.");
      
      // Reset active variables
      setRepName('');
      setRepPhone('');
      setQuantityReason('');
      setSignature('');
      
      fetchVolunteerData();
      fetchShelterDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to complete delivery.");
    } finally {
      setCompletingShelterTask(false);
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
        longitude: currentLng,
        accuracy: gpsAccuracy,
        timestamp: new Date().toISOString()
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
        accuracy: gpsAccuracy,
        timestamp: new Date().toISOString(),
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
      if (gpsAccuracy !== null) {
        formData.append("accuracy", gpsAccuracy.toString());
      }

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
            <div className="w-14 h-14 bg-brand-50 border border-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <PartyPopper className="w-8 h-8 text-brand-600" />
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
                <span className="text-lg font-mono font-black text-natural-text">{showCompletedReward.prevBalance}  {showCompletedReward.newBalance}</span>
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
          <button
            onClick={() => { resetReportForm(); setIsReportModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-natural-border hover:bg-[#FAF9F5]/80 text-natural-text text-[9px] font-mono tracking-wider font-bold uppercase transition-all bg-white shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-brand-600" /> Report Community Need
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-55/10 border border-emerald-100 text-emerald-800 text-[9px] font-bold font-mono tracking-wider uppercase">
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
          <span>Detour warning: You are currently moving away from your active delivery route bounds ({activeTask.status.includes('PICKUP') ? distanceToPickup.toFixed(1) : distanceToDestination.toFixed(1)} km away).</span>
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
                <Loader2 className="w-3 h-3 inline mr-1 animate-spin text-brand-600 align-text-bottom" /> Recalculating actual road routing geometry via OSRM...
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
                      <span><Lightbulb className="w-3.5 h-3.5 inline mr-1 text-accent-700 align-text-bottom" /> <strong>Simulation OTP:</strong> <code>{verificationData.pickupOtp}</code></span>
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
                      <span><Lightbulb className="w-3.5 h-3.5 inline mr-1 text-accent-700 align-text-bottom" /> <strong>Simulation OTP:</strong> <code>{verificationData.deliveryOtp}</code></span>
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
                      <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-650 shrink-0" /> Verification rejected. Photo matched duplicate hashes or failed content metrics. Please upload a genuine, distinct picture.</span>
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
                  <Clock className="w-8 h-8 mx-auto text-amber-600 animate-pulse" />
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
                      <div className="flex items-center gap-1.5 text-brand-700"><Check className="w-3.5 h-3.5 stroke-[3] text-brand-650 shrink-0" /> Metadata Signature received</div>
                      <div className="flex items-center gap-1.5 text-brand-700"><Check className="w-3.5 h-3.5 stroke-[3] text-brand-650 shrink-0" /> GPS Location verified</div>
                      
                      <div className={`flex items-center gap-1.5 ${activeTask.status === 'VERIFIED' || activeTask.status === 'REWARD_CREDITED' ? 'text-brand-700' : 'text-brand-400 animate-pulse'}`}>
                        {activeTask.status === 'VERIFIED' || activeTask.status === 'REWARD_CREDITED' ? (
                          <><Check className="w-3.5 h-3.5 stroke-[3] text-brand-650 shrink-0" /> Image approved</>
                        ) : (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Running AI object inference...</>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 ${activeTask.status === 'REWARD_CREDITED' ? 'text-brand-700 font-black' : 'text-brand-400 animate-pulse font-black'}`}>
                        {activeTask.status === 'REWARD_CREDITED' ? (
                          <><Check className="w-3.5 h-3.5 stroke-[3] text-brand-650 shrink-0" /> Coins credited</>
                        ) : (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Processing reward tokens...</>
                        )}
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
                          {stp.done ? <Check className="w-2.5 h-2.5 stroke-[4]" /> : idx + 1}
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
                  <X className="w-3.5 h-3.5 inline mr-1 text-red-650 align-text-bottom" /> Release Active Rescue Task
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeShelterTask ? (
        /* ================= ACTIVE SHELTER STATE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
          
          {/* Active Navigation & Actions Column */}
          <div className="lg:col-span-6 bg-white border border-brand-200 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-brand-650"></div>
            
            <div>
              <div className="flex justify-between items-start mb-4 bg-white">
                <div>
                  <span className="text-[9px] bg-brand-50 border border-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Shelter Handover Active
                  </span>
                  <h3 className="text-base font-bold text-natural-text mt-1">{activeShelterTask.foodRequirement.shelter.name}</h3>
                  <p className="text-xs text-gray-500">{activeShelterTask.foodRequirement.shelter.address}</p>
                </div>
                <span className="text-xs font-mono font-bold text-gray-655 bg-gray-50 px-2 py-1 border border-gray-200 rounded uppercase">
                  Status: {activeShelterTask.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Requirements summary */}
              <div className="bg-[#FAF9F5]/60 p-4 rounded-xl border border-gray-150 mb-5 text-xs space-y-2">
                <p><strong>Food Target:</strong> {activeShelterTask.foodRequirement.quantityRequired} {activeShelterTask.foodRequirement.unit} of {activeShelterTask.foodRequirement.foodType}</p>
                <p><strong>People to serve:</strong> {activeShelterTask.foodRequirement.peopleToServe} people</p>
                <p><strong>Coordinator:</strong> {activeShelterTask.foodRequirement.coordinator?.name} ({activeShelterTask.foodRequirement.coordinator?.email})</p>
                {activeShelterTask.foodRequirement.instructions && (
                  <p className="text-brand-800 bg-brand-50/50 p-2 rounded border border-brand-100 mt-2">
                    <strong>Instructions:</strong> "{activeShelterTask.foodRequirement.instructions}"
                  </p>
                )}
              </div>

              {/* Handover Stages */}
              <div className="space-y-4">
                
                {/* Stage 1: Navigate */}
                {activeShelterTask.status === 'ASSIGNED' && (
                  <div className="p-4 border border-brand-200 bg-brand-50/20 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Please start navigation to the shelter location when you are ready to depart.</p>
                    <button
                      onClick={() => handleStartShelterDelivery(activeShelterTask.id)}
                      className="w-full bg-brand-650 hover:bg-brand-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <Navigation className="w-4 h-4" />
                      Start Navigation Route
                    </button>
                  </div>
                )}

                {/* Stage 2: Arrive */}
                {activeShelterTask.status === 'OUT_FOR_DELIVERY' && (
                  <div className="p-4 border border-brand-200 bg-brand-50/20 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Drive to the shelter location. Once you are within 100 meters, click "Confirm Arrival".</p>
                    <button
                      onClick={() => handleArriveShelterDelivery(activeShelterTask.id)}
                      className="w-full bg-brand-650 hover:bg-brand-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <MapPin className="w-4 h-4" />
                      Confirm Arrival (Geofence Check)
                    </button>
                  </div>
                )}

                {/* Stage 3: OTP verification */}
                {activeShelterTask.status === 'ARRIVED' && (
                  <div className="p-4 border border-amber-205 bg-amber-50/30 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Request the 6-digit handover OTP from the shelter representative/coordinator and enter below:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={shelterOtp}
                        onChange={e => setShelterOtp(e.target.value)}
                        className="border border-gray-300 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white font-mono text-center tracking-widest text-lg"
                      />
                      <button
                        onClick={() => handleVerifyShelterOtp(activeShelterTask.id)}
                        className="bg-brand-650 hover:bg-brand-700 text-white font-semibold px-4 rounded-lg text-xs transition whitespace-nowrap"
                      >
                        Verify OTP
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage 4: Photo Proof & Complete */}
                {(activeShelterTask.status === 'VERIFICATION_PENDING' || activeShelterTask.status === 'ARRIVED') && (
                  <div className="space-y-4">
                    {/* Photo Upload */}
                    <div className="p-4 border border-gray-200 rounded-xl space-y-3 bg-white">
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Handover Evidence Photo *</span>
                      {activeShelterTask.photoUrl ? (
                        <div className="flex items-center gap-3 bg-emerald-55/30 border border-emerald-200 p-2.5 rounded-lg">
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span className="text-xs text-emerald-800 font-semibold">Photo Proof Uploaded!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer border border-gray-300 px-4 py-2 hover:bg-gray-50 rounded-lg transition text-xs font-semibold text-gray-700 bg-white">
                            <Camera className="w-4 h-4" />
                            Capture/Upload Photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              className="hidden" 
                              onChange={e => e.target.files && handleUploadShelterProof(activeShelterTask.id, e.target.files[0])}
                            />
                          </label>
                          <span className="text-xs text-gray-550 font-semibold">Take real-time dropoff photo</span>
                        </div>
                      )}
                    </div>

                    {/* Receipt Handover details Form */}
                    {activeShelterTask.photoUrl && (
                      <div className="p-4 border border-gray-250 rounded-xl bg-white space-y-4">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Receipt Confirmation Details</span>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-450 mb-0.5">Delivered Qty *</label>
                            <input
                              type="number"
                              value={actualQuantity}
                              onChange={e => setActualQuantity(parseFloat(e.target.value))}
                              className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-450 mb-0.5">Shortage Reason</label>
                            <input
                              type="text"
                              placeholder="Required if quantity is lower"
                              value={quantityReason}
                              onChange={e => setQuantityReason(e.target.value)}
                              className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-450 mb-0.5">Rep Name *</label>
                            <input
                              type="text"
                              value={repName}
                              onChange={e => setRepName(e.target.value)}
                              className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-450 mb-0.5">Rep Phone</label>
                            <input
                              type="text"
                              value={repPhone}
                              onChange={e => setRepPhone(e.target.value)}
                              className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-gray-450 mb-0.5">Digital Signature Initials *</label>
                          <input
                            type="text"
                            placeholder="Type initials to sign handover"
                            value={signature}
                            onChange={e => setSignature(e.target.value)}
                            className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none w-full bg-white font-mono"
                          />
                        </div>

                        <button
                          onClick={() => handleCompleteShelterDelivery(activeShelterTask.id)}
                          disabled={completingShelterTask}
                          className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition"
                        >
                          {completingShelterTask ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Completing Handover...
                            </>
                          ) : 'Submit Handover Confirmation'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cancel task action */}
            <div className="pt-4 border-t border-red-50 mt-4">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to release this shelter delivery task? It will return to the available queue.")) {
                    try {
                      setActiveShelterTask(null);
                    } catch {
                      alert("Failed to release task.");
                    }
                  }
                }}
                className="w-full py-2 bg-red-55/10 hover:bg-red-50 text-red-650 border border-red-100 font-bold text-[9px] rounded-lg transition-colors uppercase tracking-widest text-center animate-none"
              >
                <X className="w-3.5 h-3.5 inline mr-1 text-red-650 align-text-bottom" /> Release Active Shelter Task
              </button>
            </div>

          </div>

          {/* Map & Target Coordinates Column */}
          <div className="lg:col-span-6 bg-white border border-natural-border rounded-2xl p-4 shadow-xs flex flex-col min-h-[460px]">
            <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[350px]">
              <MapView 
                center={[activeShelterTask.foodRequirement.shelter.latitude, activeShelterTask.foodRequirement.shelter.longitude]}
                zoom={14}
                interactive={false}
                markers={[
                  {
                    id: 'shelter-dest',
                    latitude: activeShelterTask.foodRequirement.shelter.latitude,
                    longitude: activeShelterTask.foodRequirement.shelter.longitude,
                    title: activeShelterTask.foodRequirement.shelter.name,
                    role: 'ZONE'
                  },
                  ...(currentLat && currentLng ? [{
                    id: 'volunteer-current',
                    latitude: currentLat,
                    longitude: currentLng,
                    title: 'Your Current Position',
                    role: 'CURRENT' as const
                  }] : [])
                ]}
                polylinePoints={
                  currentLat && currentLng 
                    ? [[currentLat, currentLng], [activeShelterTask.foodRequirement.shelter.latitude, activeShelterTask.foodRequirement.shelter.longitude]]
                    : []
                }
              />
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
                <div className="text-2xl font-mono font-black text-natural-text mt-2 flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-brand-650 text-brand-650" /> {vStats.rating.toFixed(1)}
                </div>
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
                <div className="text-2xl font-mono font-black text-brand-600 mt-2 flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-brand-600" /> {vStats.tokens} coins
                </div>
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
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-brand-650 align-text-bottom" /> <strong>Live GPS stream:</strong> Geolocation updates will continuously stream from your browser device sensor to map matching algorithms.
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
                <button
                  onClick={() => setActiveTab('SHELTERS')}
                  className={`pb-2.5 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'SHELTERS' ? 'border-brand-600 text-brand-700' : 'border-transparent text-natural-muted hover:text-natural-text'
                  }`}
                >
                  Shelter Deliveries ({availableShelterDeliveries.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto bg-white">
                
                {/* 1. Matches list */}
                {activeTab === 'MATCHES' && (
                  <div>
                    {/* Active Session Check */}
                    {(() => {
                      const session = getActiveSessionDetails();
                      if (!session) return null;
                      if (!session.active) {
                        return (
                          <div className="p-8 text-center text-natural-muted space-y-4 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-amber-50 rounded-full border border-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
                              <Clock className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-display font-black text-natural-text uppercase tracking-tight">No food distribution session is currently active</h4>
                            <p className="text-xs font-semibold text-natural-muted">
                              Next scheduled window: <strong className="text-brand-650">{session.nextName} ({session.nextWindow})</strong>
                            </p>
                            <div className="border-t border-natural-border pt-4 w-full text-center">
                              <button
                                onClick={() => { resetReportForm(); setIsReportModalOpen(true); }}
                                className="btn-primary py-2 px-4 text-xs tracking-wider font-mono uppercase inline-flex items-center gap-1.5 mx-auto"
                              >
                                Report Community Need
                              </button>
                            </div>
                          </div>
                        );
                      }
                      
                      if (recommendations.length === 0) {
                        return (
                          <div className="p-12 text-center text-natural-muted space-y-4 flex flex-col items-center justify-center text-left">
                            <div className="w-20 h-20 opacity-80 shrink-0 mx-auto">
                              <img src={foodRescueImg} alt="No Food Matches" className="w-full h-full object-contain" />
                            </div>
                            <h4 className="text-sm font-display font-black text-natural-text text-center uppercase tracking-tight">Find Food Along Your Route</h4>
                            <p className="text-xs font-semibold text-natural-muted text-center max-w-sm">No verified food-need locations are currently available along your route.</p>
                            <div className="border-t border-natural-border pt-4 w-full text-center space-y-3">
                              <p className="text-xs font-bold text-natural-text">Know a location where people need food?</p>
                              <button
                                onClick={() => { resetReportForm(); setIsReportModalOpen(true); }}
                                className="btn-primary py-2 px-4 text-xs tracking-wider font-mono uppercase inline-flex items-center gap-1.5 mx-auto"
                              >
                                Report Community Need
                              </button>
                            </div>
                            <div className="text-center pt-2 w-full">
                              <Link to="/volunteer/routes" className="text-[10px] font-bold text-brand-650 hover:underline uppercase">
                                Configure Commute Routes
                              </Link>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <div className="p-3.5 bg-brand-50 border-b border-brand-100 text-left flex justify-between items-center text-[10px] text-brand-850 font-bold uppercase tracking-wider">
                            <span>Active Window: {session.window}</span>
                            <span>Remaining: {session.remaining} mins</span>
                          </div>
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
                                        <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-650"><Utensils className="w-5 h-5" /></div>
                                      )}
                                      <span className={`absolute top-1 left-1 text-[7px] font-black px-1 py-0.5 rounded tracking-wide border shadow-xs ${
                                        isVeg ? 'bg-emerald-55/10 text-emerald-800 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                        {rec.foodListing.category}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0 text-left space-y-1 text-xs">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[8px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-black uppercase font-mono flex items-center gap-0.5">
                                          <Star className="w-2.5 h-2.5 fill-brand-650 text-brand-650" /> {rec.matchingScore}% {matchQuality}
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
                                      <div className="truncate">
                                        <span className="font-bold text-natural-text uppercase text-[8px] tracking-wider mr-1">Destination:</span> 
                                        {rec.zone.name}
                                        <span className={`ml-2 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                          rec.zone.source === 'COMMUNITY_REPORTED'
                                            ? 'bg-amber-50 text-amber-850 border border-amber-250' 
                                            : 'bg-brand-50 text-brand-700 border border-brand-100'
                                        }`}>
                                          {rec.zone.source === 'COMMUNITY_REPORTED' ? 'Verified community report' : 'Verified destination'}
                                        </span>
                                      </div>
                                      <div className="text-[9px] font-mono font-semibold text-natural-muted mt-0.5">
                                        {rec.distanceToDestination ? rec.distanceToDestination.toFixed(1) : '2.1'} km ahead • {rec.deviation.toFixed(1)} km route deviation
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 shrink-0 self-end sm:self-auto">
                                      <div className="text-right">
                                        <span className="text-[8px] uppercase font-bold text-brand-700 tracking-wider block font-mono font-black">Est Payout</span>
                                        <strong className="text-xs font-mono font-black text-brand-600 flex items-center gap-1">
                                          <Coins className="w-3.5 h-3.5" /> {expectedCoins} coins
                                        </strong>
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
                        </div>
                      );
                    })()}
                  </div>
                )}                {/* 2. Sustainability Impact View */}
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
                        <span className="text-[8px] text-brand-600 font-bold block mt-1"> Diverted from landfill decomposition</span>
                      </div>
                      
                      <div className="p-3 border border-natural-border bg-white rounded-xl">
                        <span className="text-[8px] text-natural-muted uppercase font-bold tracking-wider block">Equivalent carbon offset</span>
                        <strong className="text-sm font-mono text-natural-text font-black block mt-1">{(vStats.mealsDelivered * 0.5 * 2.5).toFixed(1)} kg CO2e</strong>
                        <span className="text-[8px] text-brand-600 font-bold block mt-1"> Equivalent to 4 saplings planted</span>
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
                                   Verified Complete
                                </span>
                                <span className="text-[8px] font-mono text-natural-muted font-bold">#FD-{t.id.substring(0, 6).toUpperCase()}</span>
                              </div>
                              <h5 className="font-display font-black text-xs text-natural-text truncate uppercase mt-0.5">{t.foodListing.foodName}</h5>
                              <p className="text-[10px] text-natural-muted leading-relaxed font-semibold">
                                From: {t.foodListing.provider?.businessName || 'Provider'}  To: {t.zone.name}
                              </p>
                              <span className="text-[8px] text-natural-muted block font-mono">
                                Quantity: {t.foodListing.quantity} {t.foodListing.unit}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <strong className="text-xs font-mono font-black text-brand-600 block"> +{getExpectedRewardForTask(t)} coins</strong>
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

                {/* 4. Shelter list */}
                {activeTab === 'SHELTERS' && (
                  <div className="p-4 space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Available Shelter Food Handover Tasks</h3>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed font-semibold">
                      Claim verified requirements from city shelters, route with geofencing, and confirm handovers with OTP & photos.
                    </p>

                    {availableShelterDeliveries.length === 0 ? (
                      <div className="p-8 text-center text-gray-450 text-xs bg-gray-50 rounded-xl">
                        No active shelter requirements available in your city.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableShelterDeliveries.map((item: any) => {
                          const req = item.requirement;
                          const distance = item.distance;
                          return (
                            <div key={req.id} className="border border-gray-200 rounded-xl p-4 bg-[#FAF9F5]/40 flex flex-col justify-between items-stretch gap-3">
                              <div>
                                <h4 className="font-bold text-xs text-gray-900 uppercase">{req.shelter.name}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">{req.shelter.address}</p>
                                <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-semibold">
                                  <span className="bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded font-bold">
                                    {req.quantityRequired} {req.unit} ({req.foodType})
                                  </span>
                                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                                    Distance: {distance !== undefined && distance !== null ? `${distance.toFixed(2)} km` : 'N/A'}
                                  </span>
                                  <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded uppercase font-extrabold text-[8px] tracking-wider">
                                    {req.priority}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAcceptShelterDelivery(req.id)}
                                className="w-full px-4 py-2 bg-brand-650 hover:bg-brand-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
                              >
                                Accept Task
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Report Community Need Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-natural-text/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-natural-border shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col text-left overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-natural-border flex justify-between items-center bg-[#FAF9F5]">
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">Report Community Need</h3>
              <button onClick={() => { setIsReportModalOpen(false); resetReportForm(); }} className="text-natural-muted hover:text-natural-text transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={(e) => handleReportSubmit(e, false)} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {reportingError && (
                <div className="p-3 bg-red-55/15 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{reportingError}</span>
                </div>
              )}

              {reportingSuccess && (
                <div className="p-3 bg-emerald-55/10 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <Check className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>Thank you! Your report has been submitted for verification.</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="p-4 bg-amber-50 border border-amber-250 rounded-xl space-y-3">
                  <div className="flex items-start gap-2 text-xs font-semibold text-amber-850">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>A similar community need location already exists nearby:</span>
                  </div>
                  {existingDuplicateZone && (
                    <div className="text-[11px] bg-white border border-amber-200 rounded-lg p-2 font-semibold font-mono space-y-1">
                      <div>Name: {existingDuplicateZone.name}</div>
                      <div>Address: {existingDuplicateZone.address}</div>
                      <div>People: ~{existingDuplicateZone.estimatedPeople} • Reports: {existingDuplicateZone.reportCount}</div>
                    </div>
                  )}
                  <p className="text-[10px] text-natural-muted font-semibold">
                    You can confirm this existing location (to strengthen its confidence signals) or submit yours anyway if you believe it is different.
                  </p>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={handleConfirmExistingDuplicate}
                      className="btn-primary text-[10px] py-1.5 px-3 uppercase tracking-wider font-mono"
                    >
                      Confirm Existing Location
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleReportSubmit(e, true)}
                      className="btn-secondary text-[10px] py-1.5 px-3 uppercase tracking-wider font-mono bg-white"
                    >
                      Submit Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* Form inputs */}
              {!duplicateWarning && !reportingSuccess && (
                <>
                  {/* GPS Capture Button */}
                  <div className="bg-[#FAF9F5] border border-natural-border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-natural-text">
                      <span>1. Capture GPS Location</span>
                      {reportLatitude !== null && reportLongitude !== null && (
                        <span className="text-[9px] font-mono font-black text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded uppercase">
                          Location Secured
                        </span>
                      )}
                    </div>
                    
                    {reportLatitude !== null && reportLongitude !== null ? (
                      <div className="text-[10px] font-mono text-natural-muted space-y-1 font-semibold">
                        <div>Latitude: {reportLatitude.toFixed(6)}</div>
                        <div>Longitude: {reportLongitude.toFixed(6)}</div>
                        <div>Accuracy: ±{Math.round(reportGpsAccuracy || 0)} meters</div>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-natural-muted font-semibold">
                        The platform requires precise device coordinates to verify community need points. Handheld address lookup is restricted.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={isReportingLocation}
                      onClick={captureReportGpsLocation}
                      className="btn-secondary w-full py-2 text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-1.5 bg-white border border-natural-border"
                    >
                      {isReportingLocation ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Capturing Coordinates...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5 text-brand-650" /> Capture My GPS Location
                        </>
                      )}
                    </button>
                  </div>

                  {/* Address Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">Location Name / Landmark</label>
                      <input
                        type="text"
                        required
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="e.g. Near Kalayan Shelter Care"
                        className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">Street Address</label>
                      <input
                        type="text"
                        required
                        value={reportAddress}
                        onChange={(e) => setReportAddress(e.target.value)}
                        placeholder="e.g. 100 Feet Road, Indiranagar"
                        className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* City, State, Country */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">City</label>
                      <input
                        type="text"
                        required
                        value={reportCity}
                        onChange={(e) => setReportCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full border border-natural-border rounded-lg p-2 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">State</label>
                      <input
                        type="text"
                        value={reportState}
                        onChange={(e) => setReportState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full border border-natural-border rounded-lg p-2 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">Country</label>
                      <input
                        type="text"
                        value={reportCountry}
                        onChange={(e) => setReportCountry(e.target.value)}
                        placeholder="e.g. India"
                        className="w-full border border-natural-border rounded-lg p-2 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Est People & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">Estimated People in Need</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={reportEstimatedPeople}
                        onChange={(e) => setReportEstimatedPeople(parseInt(e.target.value) || 1)}
                        className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-natural-text">
                      <label className="block">Need Category</label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold font-mono"
                      >
                        <option value="FOOD">FOOD SUPPORT</option>
                        <option value="SHELTER">SHELTER NEED</option>
                        <option value="WATER">CLEAN WATER</option>
                        <option value="OTHER">OTHER SUPPORT</option>
                      </select>
                    </div>
                  </div>

                  {/* Time Observed */}
                  <div className="space-y-1.5 text-xs font-bold text-natural-text">
                    <label className="block">Time Observed</label>
                    <input
                      type="datetime-local"
                      required
                      value={reportTimeObserved}
                      onChange={(e) => setReportTimeObserved(e.target.value)}
                      className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold font-mono"
                    />
                  </div>

                  {/* Description & Evidence */}
                  <div className="space-y-1.5 text-xs font-bold text-natural-text">
                    <label className="block">Observation Description</label>
                    <textarea
                      required
                      rows={2}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Explain what was observed (e.g. community members gathered awaiting food service)."
                      className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs font-bold text-natural-text">
                    <label className="block">Evidence Photo URL (Optional)</label>
                    <input
                      type="url"
                      value={reportEvidenceUrl}
                      onChange={(e) => setReportEvidenceUrl(e.target.value)}
                      placeholder="e.g. https://storage.platform.org/evidence.jpg"
                      className="w-full border border-natural-border rounded-lg p-2.5 bg-[#FAF9F5] focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="btn-primary w-full py-2.5 text-xs uppercase font-mono tracking-wider font-bold"
                    >
                      Submit Community Report
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
