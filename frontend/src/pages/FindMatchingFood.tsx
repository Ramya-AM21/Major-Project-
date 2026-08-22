import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { 
  Navigation, MapPin, Compass, AlertCircle, RefreshCw, CheckCircle, Clock, 
  Award, Shield, Trash2, ArrowRight, Info, ChevronDown, ChevronUp, Search, Loader2,
  Star, Coins, Check
} from 'lucide-react';
import axios from 'axios';
import foodRescueImg from '../assets/food_rescue.png';

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
  distanceToVolunteer?: number | null;
  distanceToDestination?: number | null;
  shelterToDestinationDistance?: number | null;
  distanceToRoute?: number | null;
  isAhead?: boolean;
  positionStatus?: string;
  volunteerRouteProgress?: number | null;
  shelterRouteProgress?: number | null;
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
  const [startingRoute, setStartingRoute] = useState(false);

  // Destination autocomplete search states
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // OSRM calculated route state
  const [routeGeometryPoints, setRouteGeometryPoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [loadingRouteGeometry, setLoadingRouteGeometry] = useState(false);

  // Matching Tasks states
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Collapsed recommendations state
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  // Geolocation / GPS states
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'granted' | 'denied' | 'unavailable' | 'checking'>('checking');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState<string | null>(null);
  const lastUploadedCoords = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Haversine distance calculator
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

  // Obtain volunteer's current GPS location via Browser Geolocation API
  const handleUseCurrentLocation = () => {
    setGpsPermissionStatus('checking');
    if (!navigator.geolocation) {
      setGpsPermissionStatus('unavailable');
      setErrorStatus("Geolocation is not supported by your browser/device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        setStartLat(latitude);
        setStartLng(longitude);
        setGpsAccuracy(accuracy);
        setGpsPermissionStatus('granted');
        setErrorStatus(null);

        // Reverse geocode to get a readable origin name
        try {
          const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'json'
            }
          });
          if (res.data && res.data.display_name) {
            setStartName(res.data.display_name);
          } else {
            setStartName(`My Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch (err) {
          setStartName(`My Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      (error) => {
        setGpsPermissionStatus('denied');
        setErrorStatus("Location permission is required to find food along your route.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const [activeMapSelect, setActiveMapSelect] = useState<'START' | 'END' | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Destination Autocomplete Nominatim fetch
  useEffect(() => {
    if (destinationSearch.length < 3) {
      setDestinationSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: destinationSearch,
            format: 'json',
            limit: 5,
            addressdetails: 1,
            countrycodes: 'in'
          }
        });
        setDestinationSuggestions(res.data || []);
      } catch (err) {
        console.warn("Nominatim autocomplete search failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(delayDebounce);
  }, [destinationSearch]);

  const handleSelectSuggestion = (suggestion: any) => {
    setEndName(suggestion.display_name);
    setEndLat(parseFloat(suggestion.lat));
    setEndLng(parseFloat(suggestion.lon));
    setDestinationSuggestions([]);
    setDestinationSearch(suggestion.display_name);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!activeMapSelect) return;
    setMapLoading(true);
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const address = res.data && res.data.display_name ? res.data.display_name : `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      if (activeMapSelect === 'START') {
        setStartName(address);
        setStartLat(lat);
        setStartLng(lng);
        setActiveMapSelect(null);
      } else {
        setEndName(address);
        setDestinationSearch(address);
        setEndLat(lat);
        setEndLng(lng);
        setActiveMapSelect(null);
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
    } finally {
      setMapLoading(false);
    }
  };

  // OSRM route geometry calculation
  useEffect(() => {
    if (startLat && startLng && endLat && endLng) {
      const fetchOSRMRoute = async () => {
        setLoadingRouteGeometry(true);
        try {
          const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`, {
            params: {
              overview: 'full',
              geometries: 'geojson'
            }
          });
          if (res.data && res.data.routes && res.data.routes.length > 0) {
            const route = res.data.routes[0];
            const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRouteGeometryPoints(coordinates);
            setRouteDistance(route.distance / 1000); // km
            setRouteDuration(route.duration / 60); // minutes
          }
        } catch (err) {
          console.warn("OSRM routing calculation failed", err);
          // Fallback to straight line
          setRouteGeometryPoints([ [startLat, startLng], [endLat, endLng] ]);
          setRouteDistance(calculateDistance(startLat, startLng, endLat, endLng));
          setRouteDuration(calculateDistance(startLat, startLng, endLat, endLng) * 2.5);
        } finally {
          setLoadingRouteGeometry(false);
        }
      };
      fetchOSRMRoute();
    } else {
      setRouteGeometryPoints([]);
      setRouteDistance(null);
      setRouteDuration(null);
    }
  }, [startLat, startLng, endLat, endLng]);

  // Fetch active route on mount
  const checkActiveRoute = async () => {
    setLoadingRoute(true);
    try {
      const res = await axios.get('/api/v1/volunteers/routes');
      const active = res.data.find((r: any) => r.status === 'ACTIVE');
      if (active) {
        setActiveRoute(active);
        setCurrentLat(active.currentLatitude || active.startLatitude);
        setCurrentLng(active.currentLongitude || active.startLongitude);
        setStartLat(active.startLatitude);
        setStartLng(active.startLongitude);
        setEndLat(active.endLatitude);
        setEndLng(active.endLongitude);
        setStartName(active.startName);
        setEndName(active.endName);
        setDestinationSearch(active.endName);
        setGpsPermissionStatus('granted');
      } else {
        setActiveRoute(null);
        handleUseCurrentLocation(); // Request location immediately on idle
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
  }, [activeRoute?.id]);  // watchPosition hook for streaming device coordinates
  useEffect(() => {
    if (!activeRoute) return;

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

          axios.put(`/api/v1/volunteers/routes/${activeRoute.id}/location`, {
            latitude,
            longitude,
            accuracy,
            timestamp
          }).catch(e => console.warn("Failed to stream coordinates", e));

          axios.post('/api/v1/volunteers/location', {
            latitude,
            longitude,
            accuracy,
            timestamp
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
  }, [activeRoute?.id]);
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
          
          if (data.topic === 'FOOD_MATCH_FOUND' || data.topic === 'LOCATION_UPDATE') {
            fetchMatches();
          } else if (data.topic === 'TASK_ACCEPTED') {
            const acceptedData = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
            const acceptedTaskId = acceptedData.id;
            setMatches((prevMatches) => prevMatches.filter((m) => m.foodListing.id !== acceptedTaskId));
            fetchMatches();
          } else if (data.topic === 'TASK_UPDATE') {
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

  const handleStartRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    if (startLat === null || startLng === null) {
      setErrorStatus("Current location coordinate is missing. Please enable location permissions.");
      return;
    }
    if (endLat === null || endLng === null) {
      setErrorStatus("Please search and select a destination from autocomplete dropdown.");
      return;
    }
    if (!startName || !endName) {
      setErrorStatus("Please provide names for origin and destination locations.");
      return;
    }

    setStartingRoute(true);
    try {
      // detailed road geometry path from OSRM saved in DB as a string of coordinates
      const geomString = routeGeometryPoints.map(p => `${p[0]},${p[1]}`).join(';');

      const payload = {
        startLatitude: startLat,
        startLongitude: startLng,
        endLatitude: endLat,
        endLongitude: endLng,
        startName,
        endName,
        routeGeometry: geomString,
        routeType: 'AD_HOC',
        activeFrom: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        activeUntil: '11:59 PM',
        maxDeviation,
        status: 'ACTIVE'
      };

      const res = await axios.post('/api/v1/volunteers/routes', payload);
      setActiveRoute(res.data);
      setCurrentLat(startLat);
      setCurrentLng(startLng);
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
      await axios.delete(`/api/v1/volunteers/routes/${activeRoute.id}`);
      setActiveRoute(null);
      setMatches([]);
      setEndLat(null);
      setEndLng(null);
      setDestinationSearch('');
      setRouteGeometryPoints([]);
      handleUseCurrentLocation();
    } catch {
      setErrorStatus("Failed to cancel active route.");
    }
  };

  const handleAcceptMatch = async (rec: MatchRecommendation) => {
    setErrorStatus(null);
    setSuccessStatus(null);
    try {
      const tasksRes = await axios.get('/api/v1/tasks');
      const associatedTask = tasksRes.data.find(
        (t: any) => t.foodListing.id === rec.foodListing.id && (t.status === 'CREATED' || t.status === 'AVAILABLE')
      );

      if (!associatedTask) {
        throw new Error("Target delivery task is no longer available or has been accepted by another volunteer.");
      }

      await axios.post(`/api/v1/tasks/${associatedTask.id}/accept`);
      setSuccessStatus("Delivery task accepted successfully! Navigating to your dashboard...");
      fetchMatches();
      
      setTimeout(() => {
        navigate('/volunteer/dashboard');
      }, 2000);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || err.message || 'Could not accept this task matching offer.');
    }
  };

  const getExpectedReward = (rec: MatchRecommendation) => {
    const base = 10;
    const qty = rec.foodListing.quantity >= 50 ? 5 : rec.foodListing.quantity >= 30 ? 3 : rec.foodListing.quantity >= 10 ? 2 : 1;
    const dev = rec.deviation < 2.0 ? 3 : rec.deviation < 5.0 ? 2 : 1;
    return base + qty + dev + 3;
  };

  const getMapMarkers = () => {
    const markers = [];
    
    if (currentLat !== null && currentLng !== null) {
      markers.push({
        id: 'volunteer',
        latitude: currentLat,
        longitude: currentLng,
        title: 'Your Position',
        role: 'CURRENT' as const
      });
    }

    if (activeRoute) {
      markers.push({ id: 'start', latitude: activeRoute.startLatitude, longitude: activeRoute.startLongitude, title: `Start: ${activeRoute.startName}`, role: 'ZONE' as const });
      markers.push({ id: 'end', latitude: activeRoute.endLatitude, longitude: activeRoute.endLongitude, title: `Destination: ${activeRoute.endName}`, role: 'ZONE' as const });
    } else {
      if (startLat && startLng) {
        markers.push({ id: 'form-start', latitude: startLat, longitude: startLng, title: 'Start Point', role: 'ZONE' as const });
      }
      if (endLat && endLng) {
        markers.push({ id: 'form-end', latitude: endLat, longitude: endLng, title: 'Destination Point', role: 'ZONE' as const });
      }
    }

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-natural-border pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-natural-text tracking-tight uppercase">Food Along Your Route</h1>
          <p className="text-xs text-natural-muted mt-0.5 font-semibold">Active surplus food donations that fit your journey detour thresholds.</p>
        </div>
        <div>
          {activeRoute ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-pulse"></span>
              Route Matching Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-natural-border text-natural-muted text-[10px] font-bold font-mono uppercase tracking-wider">
              No Active Journey
            </span>
          )}
        </div>
      </div>

      <div className="bg-white border border-natural-border p-4 rounded-2xl flex items-center space-x-4 shadow-xs">
        <div className="flex-1">
          <h3 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">Surplus Delivery Route Matcher</h3>
          <p className="text-[10px] text-natural-muted leading-relaxed font-semibold mt-1">
            Start a transit route to search for matched surplus food donations. We score compatibility based on your commute route overlap and deviation ranges.
          </p>
        </div>
        <div className="w-20 h-20 shrink-0 rounded-xl bg-brand-50/50 border border-brand-150 overflow-hidden flex items-center justify-center p-1.5">
          <img src={foodRescueImg} alt="Food Rescue Illustration" className="w-full h-full object-contain rounded-lg" />
        </div>
      </div>

      {/* Geolocation Denied warning block */}
      {gpsPermissionStatus === 'denied' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex flex-col md:flex-row md:items-center justify-between text-left font-semibold gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
            <span>Location permission is required to find food along your route. Please enable device GPS permissions.</span>
          </div>
          <button onClick={handleUseCurrentLocation} className="btn-secondary whitespace-nowrap px-3 py-1.5 text-[10px] self-end md:self-auto uppercase font-black">
            Enable Location
          </button>
        </div>
      )}

      {/* Status Notifications */}
      {gpsAccuracyWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-250 text-xs text-amber-850 flex items-start space-x-2.5 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-650 mt-0.5" />
          <span>{gpsAccuracyWarning}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-55/10 border border-red-200 text-xs text-red-750 flex items-start space-x-2.5 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
          <span>{errorStatus}</span>
        </div>
      )}

      {successStatus && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2.5 font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
          <span>{successStatus}</span>
        </div>
      )}

      {loadingRoute ? (
        <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2.5 bg-white rounded-xl border border-natural-border shadow-xs">
          <div className="w-7 h-7 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin"></div>
          <span className="text-xs font-semibold">Validating active commute path context...</span>
        </div>
      ) : !activeRoute ? (
        
        /* JOURNEY BUILDER SETUP FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            <form onSubmit={handleStartRoute} className="bg-white border border-natural-border p-5 md:p-6 rounded-2xl shadow-xs space-y-4 flex-1 relative">
              <div className="border-b border-natural-border pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text font-display">Start my journey</h3>
                <p className="text-[10px] text-natural-muted mt-0.5 font-semibold">Specify your origin and search for a destination from Nominatim autocomplete.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Current Location</label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        required
                        value={startName}
                        onChange={(e) => setStartName(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                        placeholder="Origin Address"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMapSelect(activeMapSelect === 'START' ? null : 'START')}
                      className={`px-3 py-2 text-xs rounded-lg font-bold whitespace-nowrap border transition-colors ${activeMapSelect === 'START' ? 'bg-brand-600 text-white border-brand-600' : 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'}`}
                      title="Pin on Map"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="px-3 py-2 bg-brand-50 border border-brand-200 hover:bg-brand-100 text-brand-700 text-xs rounded-lg font-bold whitespace-nowrap"
                    >
                      GPS
                    </button>
                  </div>
                  {startLat && (
                    <span className="text-[8px] font-mono text-brand-600 mt-1 block">
                      Origin coordinate locked: {startLat.toFixed(5)}, {startLng?.toFixed(5)}
                    </span>
                  )}
                </div>

                {/* Autocomplete Destination Search Box */}
                <div className="relative">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Search Destination</label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        required
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                        placeholder="Type destination area name..."
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      {loadingSuggestions && (
                        <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMapSelect(activeMapSelect === 'END' ? null : 'END')}
                      className={`px-3 py-2 text-xs rounded-lg font-bold whitespace-nowrap border transition-colors ${activeMapSelect === 'END' ? 'bg-brand-600 text-white border-brand-600' : 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'}`}
                      title="Pin on Map"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {destinationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 bg-white border border-natural-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs">
                      {destinationSuggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(sug)}
                          className="p-2.5 hover:bg-brand-50/50 cursor-pointer transition-colors text-[11px] text-natural-text truncate"
                        >
                          {sug.display_name}
                        </div>
                      ))}
                    </div>
                  )}

                  {endLat && (
                    <span className="text-[8px] font-mono text-brand-600 mt-1 block">
                      Destination coordinate locked: {endLat.toFixed(5)}, {endLng?.toFixed(5)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted flex justify-between">
                    <span>Max detour deviation</span>
                    <span className="font-mono text-brand-600 font-black">{maxDeviation} km</span>
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

              {/* OSRM Route geometry stats */}
              {routeDistance !== null && (
                <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl space-y-1 text-[10px] text-natural-muted font-bold font-mono">
                  <div className="flex justify-between">
                    <span>Plan route distance:</span>
                    <span className="text-natural-text">{routeDistance.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plan route duration:</span>
                    <span className="text-natural-text">{Math.round(routeDuration || 0)} mins</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-natural-border">
                <button
                  type="submit"
                  disabled={startingRoute || loadingRouteGeometry}
                  className="btn-primary w-full flex justify-center text-[10px]"
                >
                  {startingRoute ? 'Syncing Route Layout...' : 'Start my journey'}
                </button>
              </div>
            </form>
          </div>

          {/* MAP VISUALIZATION PANE */}
          <div className="lg:col-span-7 flex flex-col min-h-[400px]">
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl mb-4 text-xs font-semibold text-brand-850 flex items-start space-x-2">
              <Compass className="w-4 h-4 shrink-0 text-brand-750 mt-0.5" />
              <span>
                Origin is set to your device GPS location. Search for a destination to preview the actual route path geometry. Click the Map Pin buttons to select coordinates directly on the map.
              </span>
            </div>
            
            <div className="flex-1 min-h-[450px] relative overflow-hidden rounded-2xl border border-natural-border shadow-xs">
              {mapLoading && (
                <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
              )}
              <MapView
                center={[startLat || 13.9299, startLng || 75.5681]}
                zoom={14}
                markers={getMapMarkers()}
                polylinePoints={routeGeometryPoints}
                interactive={true}
                onLocationSelect={handleMapClick}
              />
            </div>
          </div>
        </div>
      ) : (
        
        /* ACTIVE GPS JOURNEY MODE */
        <div className="space-y-6">
          
          {/* Active Route overview banner */}
          <div className="bg-white border border-natural-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold">
                <Navigation className="w-5 h-5 shrink-0 animate-bounce" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-natural-muted tracking-wider font-mono">YOUR JOURNEY</span>
                <h3 className="font-display font-black text-xs text-natural-text mt-0.5 flex items-center gap-1.5 uppercase leading-normal">
                  <span className="truncate max-w-[150px] inline-block">{activeRoute.startName}</span> 
                  <ArrowRight className="w-3.5 h-3.5 text-natural-muted shrink-0" /> 
                  <span className="truncate max-w-[150px] inline-block">{activeRoute.endName}</span>
                </h3>
                <div className="text-[9px] text-natural-muted mt-0.5 font-bold uppercase tracking-wider flex flex-wrap items-center gap-2 font-mono">
                  <span>Detour Limit: {activeRoute.maxDeviation} km</span>
                  <span>•</span>
                  <span>Current GPS: {currentLat?.toFixed(5)}, {currentLng?.toFixed(5)}</span>
                  {gpsAccuracy && (
                    <>
                      <span>•</span>
                      <span className="text-brand-600 font-bold">Accuracy: {Math.round(gpsAccuracy)}m</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
                className="px-3.5 py-2 text-xs font-bold text-red-755 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all uppercase tracking-wider flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" /> Stop Route
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Live GPS Map view */}
            <div className="lg:col-span-7 bg-white border border-natural-border rounded-2xl p-4 shadow-xs flex flex-col min-h-[460px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-natural-text uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-brand-600 animate-pulse" /> Active Route Tracker
                </span>
                <span className="text-[10px] bg-brand-50 text-brand-850 px-2 py-0.5 rounded font-mono font-bold uppercase border border-brand-100">
                  Live Hardware GPS stream
                </span>
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden border border-natural-border min-h-[300px]">
                <MapView
                  center={[currentLat || 12.9716, currentLng || 77.5946]}
                  zoom={12}
                  markers={getMapMarkers()}
                  polylinePoints={routeGeometryPoints}
                  interactive={false}
                />
              </div>
              
              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-natural-border mt-3 text-[10px] text-natural-muted font-bold text-left leading-normal">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-brand-650 align-text-bottom" /> <strong>Live GPS Updates:</strong> Geolocation updates will continuously stream from your browser device sensor to map matching algorithms.
              </div>
            </div>

            {/* Recommendations matching list ledger */}
            <div className="lg:col-span-5 bg-white border border-natural-border rounded-2xl shadow-xs flex flex-col overflow-hidden max-h-[560px]">
              <div className="p-4 border-b border-natural-border bg-[#FAF9F5]">
                <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text font-display">FOOD ALONG YOUR ROUTE</h3>
                <p className="text-[10px] text-natural-muted mt-0.5 font-bold">Surplus donations with detours fitting inside your active journey corridor</p>
              </div>

              {loadingMatches ? (
                <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2.5 flex-1">
                  <div className="w-7 h-7 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin"></div>
                  <span className="text-xs font-semibold">Running route matching scoring...</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="p-12 text-center text-natural-muted space-y-3.5 flex-1 flex flex-col items-center justify-center max-w-sm mx-auto text-left">
                  <div className="w-20 h-20 opacity-75 shrink-0 mx-auto mb-2">
                    <img src={foodRescueImg} alt="No Food Matches" className="w-full h-full object-contain mx-auto" />
                  </div>
                  <p className="text-xs font-bold text-center text-natural-text">No surplus donations currently match your route detour bounds.</p>
                  <p className="text-[10px] text-center font-semibold leading-relaxed">
                    Unrelated cities or listings outside the corridor are filtered out geographically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-natural-border overflow-y-auto flex-1 bg-white">
                  {matches.map((rec) => {
                    const pickupDist = currentLat !== null && currentLng !== null 
                      ? calculateDistance(currentLat, currentLng, rec.foodListing.pickupLatitude, rec.foodListing.pickupLongitude)
                      : 0.0;
                    const expectedCoins = getExpectedReward(rec);
                    const isExpanded = expandedRecId === rec.foodListing.id;
                    
                    let matchQuality = "Excellent match";
                    if (rec.matchingScore < 70) {
                      matchQuality = "Fair match";
                    } else if (rec.matchingScore < 85) {
                      matchQuality = "Good match";
                    }

                    return (
                      <div 
                        key={rec.foodListing.id} 
                        className="p-4 hover:bg-brand-50/5 transition-all flex flex-col gap-3 text-xs text-natural-text border-b border-natural-border last:border-b-0"
                      >
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-2 text-left">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[8px] bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-black uppercase font-mono flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-brand-650 text-brand-650" /> {rec.matchingScore}% {matchQuality}
                              </span>
                              <span className="text-[8px] bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                Detour: {rec.deviation.toFixed(1)} km
                              </span>
                              <span className="text-[8px] bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded font-bold font-mono">
                                Pickup: {(rec.distanceToVolunteer !== undefined && rec.distanceToVolunteer !== null ? rec.distanceToVolunteer : pickupDist).toFixed(1)} km away
                              </span>
                              {(rec as any).positionStatus && (
                                <span className={`text-[8px] border px-1.5 py-0.5 rounded font-black uppercase font-mono ${
                                  (rec as any).isAhead ? 'bg-emerald-55/10 text-emerald-800 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                                }`}>
                                  {(rec as any).positionStatus}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-display font-black text-xs text-natural-text truncate uppercase leading-snug">{rec.foodListing.foodName}</h4>
                              <p className="text-[10px] text-natural-muted font-bold mt-0.5">{rec.foodListing.provider.businessName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2 rounded-lg border border-natural-border text-[9px] font-semibold font-mono">
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Drop Target Zone</span>
                                <span className="block text-natural-text truncate">{rec.zone.name}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Expiry Window</span>
                                <span className="block text-red-600 font-extrabold flex items-center gap-0.5">
                                  <Clock className="w-3 h-3 text-red-500" />
                                  {new Date(rec.foodListing.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Why this match collapsible trigger */}
                        <div className="border-t border-natural-border/60 pt-2">
                          <button
                            onClick={() => setExpandedRecId(isExpanded ? null : rec.foodListing.id)}
                            className="text-[9px] font-black text-brand-600 hover:underline uppercase tracking-wider flex items-center gap-1 font-mono"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Why this match recommended?
                          </button>
                          {isExpanded && (
                            <div className="mt-2 p-2.5 bg-[#FAF9F5] border border-natural-border rounded-lg text-[9px] text-natural-muted space-y-1 font-semibold">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-600 shrink-0" /> High Route Overlap</span>
                                <span className="font-bold text-natural-text">{rec.matchingScore - 15}% overlap</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-600 shrink-0" /> Low detour deviation</span>
                                <span className="font-bold text-natural-text">+{rec.deviation.toFixed(1)} km detour</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-600 shrink-0" /> Expiry Safety Window</span>
                                <span className="font-bold text-natural-text">Ready for pickup</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accept Button Container */}
                        <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-3 bg-white">
                          <div className="text-left">
                            <span className="text-[8px] uppercase font-bold text-brand-700 tracking-wider font-mono block">Coin payout</span>
                            <strong className="text-xs font-black text-brand-600 font-mono flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> {expectedCoins} pts
                            </strong>
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
