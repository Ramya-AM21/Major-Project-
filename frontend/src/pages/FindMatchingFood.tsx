import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  Navigation, MapPin, Compass, AlertCircle, RefreshCw, CheckCircle, Clock, Award, Shield, Trash2, ArrowRight
} from 'lucide-react';
import axios from 'axios';

interface VolunteerRoute {
  id: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  startName: string;
  endName: string;
  maxDeviation: number;
  status: string;
  currentLatitude?: number;
  currentLongitude?: number;
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

export const FindMatchingFood: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Route state
  const [activeRoute, setActiveRoute] = useState<VolunteerRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Form states (to start route)
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [endLat, setEndLat] = useState<number | null>(null);
  const [endLng, setEndLng] = useState<number | null>(null);
  const [maxDeviation, setMaxDeviation] = useState<number>(3.0);
  const [pickingLocation, setPickingLocation] = useState<'START' | 'END' | null>(null);
  const [startingRoute, setStartingRoute] = useState(false);

  // Matching Tasks states
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Geolocation / GPS states
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Fetch active route on mount
  const checkActiveRoute = async () => {
    setLoadingRoute(true);
    try {
      const res = await axios.get('/api/v1/volunteers/routes');
      const active = res.data.find((r: any) => r.status === 'ACTIVE');
      if (active) {
        setActiveRoute(active);
        if (active.currentLatitude) {
          setCurrentLat(active.currentLatitude);
          setCurrentLng(active.currentLongitude);
        } else {
          setCurrentLat(active.startLatitude);
          setCurrentLng(active.startLongitude);
        }
      } else {
        setActiveRoute(null);
      }
    } catch (e) {
      console.error("Failed to check active route state", e);
    } finally {
      setLoadingRoute(false);
    }
  };

  const fetchMatches = async () => {
    if (!activeRoute) return;
    setLoadingMatches(true);
    try {
      const res = await axios.get('/api/v1/volunteers/matching');
      setMatches(res.data || []);
    } catch (err: any) {
      setErrorStatus("Failed to query route matching database.");
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    checkActiveRoute();
  }, []);

  useEffect(() => {
    if (activeRoute) {
      fetchMatches();
    }
  }, [activeRoute?.id]);

  // watchPosition hook for capturing device coordinates
  useEffect(() => {
    if (!activeRoute || isSimulated) return;

    let watchId: number | null = null;
    if (navigator.geolocation) {
      // Get initial single position
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          setGpsAccuracy(accuracy);
          
          // Send coordinates update to active route
          axios.put(`/api/v1/volunteers/routes/${activeRoute.id}/location`, {
            latitude,
            longitude
          }).catch(e => console.warn("Failed to transmit coordinates", e));

          // Also report general location update
          axios.post('/api/v1/volunteers/location', {
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          }).catch(e => console.warn("Failed to update general location", e));
        },
        (err) => console.warn("GPS lookup failed", err),
        { enableHighAccuracy: true }
      );

      // Start watching stream
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          setGpsAccuracy(accuracy);

          // Update active route
          axios.put(`/api/v1/volunteers/routes/${activeRoute.id}/location`, {
            latitude,
            longitude
          }).catch(e => console.warn("Failed to stream coordinates", e));

          // Also report general location update
          axios.post('/api/v1/volunteers/location', {
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          }).catch(e => console.warn("Failed to update general location", e));
        },
        (err) => console.warn("GPS watching failed", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeRoute?.id, isSimulated]);

  // WebSocket subscriptions for real-time matches/assignment
  useEffect(() => {
    if (!activeRoute) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8081/ws/tracking`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.topic === 'FOOD_MATCH_FOUND') {
            // A new food match was created. Re-query backend matches.
            fetchMatches();
          } else if (data.topic === 'TASK_ACCEPTED') {
            // A task was accepted by someone. Immediately filter it from view.
            const acceptedData = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
            const acceptedTaskId = acceptedData.id;
            setMatches((prevMatches) => prevMatches.filter((m) => m.foodListing.id !== acceptedTaskId && m.routeId !== acceptedTaskId));
            fetchMatches(); // Also reload recommendations
          } else if (data.topic === 'TASK_UPDATE') {
            // Refetch matches
            fetchMatches();
          }
        } catch (wsErr) {
          console.error("WS parse error", wsErr);
        }
      };
    } catch (e) {
      console.warn("WebSocket coordination failed", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeRoute?.id]);

  const handleCoordinatesPick = (lat: number, lng: number) => {
    if (pickingLocation === 'START') {
      setStartLat(lat);
      setStartLng(lng);
      setPickingLocation(null);
    } else if (pickingLocation === 'END') {
      setEndLat(lat);
      setEndLng(lng);
      setPickingLocation(null);
    }
  };

  const handleStartRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    if (startLat === null || endLat === null) {
      setErrorStatus("Please pin both start and destination points on the map.");
      return;
    }
    if (!startName || !endName) {
      setErrorStatus("Please provide names for start and destination locations.");
      return;
    }

    setStartingRoute(true);
    try {
      const payload = {
        startLatitude: startLat,
        startLongitude: startLng,
        endLatitude: endLat,
        endLongitude: endLng,
        startName,
        endName,
        routeGeometry: `${startLat},${startLng};${endLat},${endLng}`,
        routeType: 'AD_HOC',
        activeFrom: '08:00 AM',
        activeUntil: '11:59 PM',
        maxDeviation,
        status: 'ACTIVE'
      };

      const res = await axios.post('/api/v1/volunteers/routes', payload);
      setActiveRoute(res.data);
      setCurrentLat(startLat!);
      setCurrentLng(startLng!);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || "Failed to start active route.");
    } finally {
      setStartingRoute(false);
    }
  };

  const handleCancelActiveRoute = async () => {
    if (!activeRoute) return;
    if (!window.confirm("Are you sure you want to stop this active route journey?")) return;

    setErrorStatus(null);
    try {
      // Put status = COMPLETED or delete
      await axios.delete(`/api/v1/volunteers/routes/${activeRoute.id}`);
      setActiveRoute(null);
      setMatches([]);
    } catch {
      setErrorStatus("Failed to cancel active route.");
    }
  };

  const handleAcceptMatch = async (rec: MatchRecommendation) => {
    setErrorStatus(null);
    setSuccessStatus(null);
    try {
      // Create task proposal first (if doesn't exist) or accept the existing task proposal
      // Let's check: does task exist? The recommend matching contains the food ID.
      // We can query task by food ID, or call the backend accept API using the matching recommendations.
      // Wait! Let's find if a proposed task already exists for this food listing.
      // Since the backend creates a DeliveryTask immediately on food listing publishing, we can query its task ID!
      // Wait, how do we get the task ID for the match recommendation?
      // Let's fetch the task for this foodListing ID:
      const tasksRes = await axios.get('/api/v1/tasks');
      const associatedTask = tasksRes.data.find(
        (t: any) => t.foodListing.id === rec.foodListing.id && (t.status === 'CREATED' || t.status === 'AVAILABLE')
      );

      if (!associatedTask) {
        throw new Error("Target delivery task is no longer available or was accepted.");
      }

      await axios.post(`/api/v1/tasks/${associatedTask.id}/accept`);
      setSuccessStatus("Delivery task accepted successfully! Navigate to your dashboard to complete the handover.");
      fetchMatches();
      
      // Auto redirect to volunteer dashboard after 2 seconds
      setTimeout(() => {
        navigate('/volunteer/dashboard');
      }, 2000);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || err.message || 'Could not accept this task matching offer.');
    }
  };

  const handleSimulateGPS = (lat: number, lng: number) => {
    setIsSimulated(true);
    setCurrentLat(lat);
    setCurrentLng(lng);
    setGpsAccuracy(10); // set mock accuracy

    axios.post('/api/v1/volunteers/location', {
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString()
    }).catch(err => console.warn("Failed to stream simulated coordinates", err));

    if (activeRoute) {
      axios.put(`/api/v1/volunteers/routes/${activeRoute.id}/location`, {
        latitude: lat,
        longitude: lng
      }).then(() => {
        fetchMatches(); // Recalculate matches for new location detours!
      }).catch(e => console.error("Simulated location sync error", e));
    }
  };

  const getExpectedReward = (rec: MatchRecommendation) => {
    const base = 10;
    const qty = rec.foodListing.quantity >= 50 ? 5 : rec.foodListing.quantity >= 30 ? 3 : rec.foodListing.quantity >= 10 ? 2 : 1;
    const dev = rec.deviation < 2.0 ? 3 : rec.deviation < 5.0 ? 2 : 1;
    return base + qty + dev + 3; // base + bonuses + verification
  };

  // Helper to compile markers
  const getMapMarkers = () => {
    const markers = [];
    
    // 1. Volunteer position
    markers.push({
      id: 'volunteer',
      latitude: currentLat,
      longitude: currentLng,
      title: isSimulated ? 'Your Position (Simulated)' : 'Your GPS Location',
      role: 'CURRENT' as const
    });

    // 2. Active route endpoints
    if (activeRoute) {
      markers.push({ id: 'start', latitude: activeRoute.startLatitude, longitude: activeRoute.startLongitude, title: `Start: ${activeRoute.startName}`, role: 'ZONE' as const });
      markers.push({ id: 'end', latitude: activeRoute.endLatitude, longitude: activeRoute.endLongitude, title: `Destination: ${activeRoute.endName}`, role: 'ZONE' as const });
    } else {
      if (startLat && startLng) {
        markers.push({ id: 'form-start', latitude: startLat, longitude: startLng, title: 'Start Location', role: 'ZONE' as const });
      }
      if (endLat && endLng) {
        markers.push({ id: 'form-end', latitude: endLat, longitude: endLng, title: 'End Location', role: 'ZONE' as const });
      }
    }

    // 3. Matched Pickups and zones
    matches.forEach(rec => {
      markers.push({
        id: `pickup-${rec.foodListing.id}`,
        latitude: rec.foodListing.pickupLatitude,
        longitude: rec.foodListing.pickupLongitude,
        title: `Pickup: ${rec.foodListing.foodName}`,
        description: rec.foodListing.provider.businessName,
        role: 'PROVIDER' as const
      });
      markers.push({
        id: `delivery-${rec.foodListing.id}`,
        latitude: rec.zone.latitude,
        longitude: rec.zone.longitude,
        title: `Dropoff: ${rec.zone.name}`,
        description: rec.zone.address,
        role: 'ZONE' as const
      });
    });

    return markers;
  };

  const getMapPolyline = () => {
    if (activeRoute) {
      return [
        [activeRoute.startLatitude, activeRoute.startLongitude] as [number, number],
        [activeRoute.endLatitude, activeRoute.endLongitude] as [number, number]
      ];
    }
    if (startLat && endLat) {
      return [
        [startLat, startLng!] as [number, number],
        [endLat, endLng!] as [number, number]
      ];
    }
    return [];
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-natural-border pb-5">
        <div>
          <h1 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Matching Food For Your Route</h1>
          <p className="text-xs text-natural-muted mt-1 font-semibold">Surplus food donations compatible with your travel itinerary.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          {activeRoute ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] font-black font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-pulse"></span>
              GPS MATCH RUNNING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF9F5] text-natural-muted text-[10px] font-black font-mono border border-natural-border tracking-wider uppercase">
              INACTIVE JOURNEY
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex items-start space-x-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
          <span>{errorStatus}</span>
        </div>
      )}

      {successStatus && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-xs text-emerald-800 flex items-start space-x-2 font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
          <span>{successStatus}</span>
        </div>
      )}

      {loadingRoute ? (
        <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2 bg-white rounded-2xl border border-natural-border shadow-xs">
          <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
          <span className="text-xs font-semibold">Verifying transit context...</span>
        </div>
      ) : !activeRoute ? (
        
        /* FORM TO START A JOURNEY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            <form onSubmit={handleStartRoute} className="bg-white border border-natural-border p-6 rounded-2xl shadow-xs space-y-4 flex-1">
              <div className="border-b border-natural-border pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Start A Delivery Journey</h3>
                <p className="text-[10px] text-natural-muted mt-0.5">Declare your endpoints and path parameters to look up compatibility matches.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Starting Location Name</label>
                  <input
                    type="text"
                    required
                    value={startName}
                    onChange={(e) => setStartName(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="E.g. Mysore Road Metro"
                  />
                  <button
                    type="button"
                    onClick={() => setPickingLocation('START')}
                    className={`mt-2 w-full text-center text-[9px] py-1.5 border rounded-lg font-black transition-all uppercase tracking-wider ${
                      pickingLocation === 'START'
                        ? 'border-brand-600 bg-brand-100 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-natural-muted hover:bg-gray-100'
                    }`}
                  >
                    {startLat ? '✓ Coordinates Selected' : 'Pin Start Location on Map'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Destination Location Name</label>
                  <input
                    type="text"
                    required
                    value={endName}
                    onChange={(e) => setEndName(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="E.g. Koramangala Socials"
                  />
                  <button
                    type="button"
                    onClick={() => setPickingLocation('END')}
                    className={`mt-2 w-full text-center text-[9px] py-1.5 border rounded-lg font-black transition-all uppercase tracking-wider ${
                      pickingLocation === 'END'
                        ? 'border-brand-600 bg-brand-100 text-brand-700'
                        : 'border-gray-200 bg-gray-50 text-natural-muted hover:bg-gray-100'
                    }`}
                  >
                    {endLat ? '✓ Coordinates Selected' : 'Pin End Location on Map'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted flex justify-between">
                    <span>Maximum detour range</span>
                    <span className="font-mono text-brand-650 font-black">{maxDeviation} km</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    value={maxDeviation}
                    onChange={(e) => setMaxDeviation(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-natural-border">
                <button
                  type="submit"
                  disabled={startingRoute}
                  className="btn-primary w-full flex justify-center"
                >
                  {startingRoute ? 'Activating GPS Route...' : 'Start My Route'}
                </button>
              </div>
            </form>

            <div className="p-4 bg-[#FAF9F5] border border-natural-border rounded-2xl text-xs text-natural-muted font-semibold leading-relaxed">
              <strong className="text-natural-text block mb-1">💡 Quick Simulator Mode:</strong>
              Use these shortcuts to seed coordinate configurations:
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartName("Mysore Road");
                    setEndName("Koramangala");
                    setStartLat(12.9515); setStartLng(77.5401);
                    setEndLat(12.9343); setEndLng(77.6253);
                  }}
                  className="p-1.5 border border-gray-300 bg-white hover:bg-[#FAF9F5] text-[8px] rounded-lg font-black uppercase tracking-wider transition-all"
                >
                  Mysore Rd ➔ Koramangala
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartName("Yelahanka");
                    setEndName("Whitefield");
                    setStartLat(13.0981); setStartLng(77.5961);
                    setEndLat(12.9698); setEndLng(77.7501);
                  }}
                  className="p-1.5 border border-gray-300 bg-white hover:bg-[#FAF9F5] text-[8px] rounded-lg font-black uppercase tracking-wider transition-all"
                >
                  Yelahanka ➔ Whitefield
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col min-h-[400px]">
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl mb-4 text-xs font-semibold text-brand-850 flex items-start space-x-2">
              <Compass className="w-4 h-4 shrink-0 text-brand-750 mt-0.5" />
              <span>
                {pickingLocation 
                  ? `Select coordinates for your ${pickingLocation} point by clicking anywhere on the map grid.`
                  : 'Double check details. Click map canvas directly to target coordinates.'}
              </span>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-natural-border min-h-[350px]">
              <MapView
                center={[12.9716, 77.5946]}
                zoom={11}
                onLocationSelect={handleCoordinatesPick}
                markers={getMapMarkers()}
                polylinePoints={getMapPolyline()}
              />
            </div>
          </div>
        </div>
      ) : (
        
        /* ACTIVE JOURNEY VIEW WITH LIVE GPS AND RECOMMENDATIONS */
        <div className="space-y-6">
          
          {/* Active Journey metadata card */}
          <div className="bg-white border border-natural-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-650 flex items-center justify-center font-bold">
                <Navigation className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-natural-muted tracking-wider font-mono">Active Transit Path</span>
                <h3 className="font-display font-black text-sm text-natural-text mt-0.5 flex items-center gap-1.5 uppercase">
                  {activeRoute.startName} <ArrowRight className="w-3.5 h-3.5 text-natural-muted" /> {activeRoute.endName}
                </h3>
                <div className="text-[10px] text-natural-muted mt-0.5 font-bold uppercase tracking-wider flex items-center gap-2 font-mono">
                  <span>Detour Limit: {activeRoute.maxDeviation} km</span>
                  <span>•</span>
                  <span>GPS Coords: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
                  {gpsAccuracy && (
                    <>
                      <span>•</span>
                      <span className="text-brand-600 font-bold">Accuracy: {Math.round(gpsAccuracy)}m</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchMatches}
                disabled={loadingMatches}
                className="btn-secondary py-2 px-3.5 normal-case"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingMatches ? 'animate-spin' : ''}`} /> Reload Matches
              </button>
              <button
                type="button"
                onClick={handleCancelActiveRoute}
                className="px-3.5 py-2 text-xs font-bold text-red-750 bg-red-50 hover:bg-red-100 border border-red-150 rounded-lg transition-all uppercase tracking-wider flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" /> Stop Route
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Live Map Panel */}
            <div className="lg:col-span-7 bg-white border border-natural-border rounded-2xl p-4 shadow-xs flex flex-col min-h-[450px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-brand-650" /> Active Location Tracking
                </span>
                <span className="text-[10px] bg-brand-50 text-brand-850 px-2 py-0.5 rounded font-mono font-bold uppercase border border-brand-100">
                  {isSimulated ? 'Coordinates Simulated' : 'Hardware GPS stream active'}
                </span>
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[300px]">
                <MapView
                  center={[currentLat, currentLng]}
                  zoom={12}
                  onLocationSelect={handleSimulateGPS}
                  markers={getMapMarkers()}
                  polylinePoints={getMapPolyline()}
                />
              </div>
              
              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-natural-border mt-3 text-[10px] text-natural-muted font-bold text-left leading-normal">
                📍 <strong>Live GPS Simulator:</strong> Click anywhere on the map or drag markers to simulate movement. Matches detours will automatically update in real time based on your position.
              </div>
            </div>

            {/* Matching Listings Ledger */}
            <div className="lg:col-span-5 bg-white border border-natural-border rounded-2xl shadow-xs flex flex-col overflow-hidden max-h-[560px]">
              <div className="p-4 border-b border-natural-border bg-[#FAF9F5]">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Surplus Deliveries Available</h3>
                <p className="text-[10px] text-natural-muted mt-0.5 font-bold">Real-time matching listings within detour range</p>
              </div>

              {loadingMatches ? (
                <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2 flex-1">
                  <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
                  <span className="text-xs font-bold font-mono">Recalculating matches...</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="p-12 text-center text-natural-muted space-y-3 flex-1 flex flex-col items-center justify-center text-left max-w-sm mx-auto">
                  <p className="text-xs font-bold text-center">No food deliveries currently match your route detour bounds.</p>
                  <p className="text-[10px] text-center font-semibold leading-relaxed">
                    New matching deliveries will appear automatically when restaurants publish surplus food nearby.
                  </p>
                  <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mt-2"></div>
                </div>
              ) : (
                <div className="divide-y divide-natural-border overflow-y-auto flex-1 bg-white">
                  {matches.map((rec) => {
                    const pickupDist = rec.foodListing.pickupLatitude 
                      ? Math.round(Math.sqrt(
                          Math.pow(currentLat - rec.foodListing.pickupLatitude, 2) +
                          Math.pow(currentLng - rec.foodListing.pickupLongitude, 2)
                        ) * 111.3 * 10) / 10
                      : 0.0;
                    
                    const expectedCoins = getExpectedReward(rec);

                    return (
                      <div 
                        key={rec.foodListing.id} 
                        className="p-4 hover:bg-brand-50/10 transition-all flex flex-col gap-3 text-xs text-natural-text"
                      >
                        <div className="flex gap-3">
                          {/* Info Column */}
                          <div className="flex-1 space-y-2 text-left">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[8px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-black uppercase font-mono">
                                {rec.matchingScore}% Match
                              </span>
                              <span className="text-[8px] bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                Detour: {rec.deviation.toFixed(1)} km
                              </span>
                              <span className="text-[8px] bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded font-bold font-mono">
                                Pickup: {pickupDist.toFixed(1)} km away
                              </span>
                            </div>

                            <div>
                              <h4 className="font-display font-black text-xs text-natural-text truncate uppercase leading-snug">{rec.foodListing.foodName}</h4>
                              <p className="text-[10px] text-natural-muted font-bold mt-0.5">{rec.foodListing.provider.businessName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2 rounded-lg border border-natural-border text-[9px] font-semibold font-mono">
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Rescue Target</span>
                                <span className="block text-natural-text truncate">{rec.zone.name}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Expiry Exits</span>
                                <span className="block text-red-650 font-extrabold flex items-center gap-0.5">
                                  <Clock className="w-3 h-3 text-red-600" />
                                  {new Date(rec.foodListing.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Accept Button Container */}
                        <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-3 bg-white">
                          <div className="text-left">
                            <span className="text-[8px] uppercase font-black text-brand-700 tracking-wider font-mono block">Coin payout</span>
                            <strong className="text-xs font-black text-brand-650 font-mono">🪙 {expectedCoins} pts</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptMatch(rec)}
                            className="btn-primary text-[10px] py-2 px-3.5"
                          >
                            Accept Delivery
                          </button>
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

export default FindMatchingFood;
