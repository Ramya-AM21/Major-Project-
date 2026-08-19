import React, { useState, useEffect } from 'react';
import { MapView } from '../components/MapView';
import { 
  ArrowLeft, Plus, Trash2, Loader2, Route, CheckCircle2, AlertCircle, MapPin, Clock, Compass, Search
} from 'lucide-react';
import axios from 'axios';
import volunteerCommuteImg from '../assets/volunteer_commute.png';

interface VolunteerRoute {
  id: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  startName: string;
  endName: string;
  routeType: string;
  activeFrom: string;
  activeUntil: string;
  maxDeviation?: number;
}

export const VolunteerRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<VolunteerRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Form parameters
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [endLat, setEndLat] = useState<number | null>(null);
  const [endLng, setEndLng] = useState<number | null>(null);

  const [routeType, setRouteType] = useState<'DAILY' | 'AD_HOC'>('DAILY');
  const [activeFrom, setActiveFrom] = useState('08:00 AM');
  const [activeUntil, setActiveUntil] = useState('09:00 AM');
  const [maxDeviation, setMaxDeviation] = useState<number>(5.0);

  // Nominatim autocomplete states
  const [originSearch, setOriginSearch] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [loadingOriginSuggestions, setLoadingOriginSuggestions] = useState(false);

  const [destSearch, setDestSearch] = useState('');
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [loadingDestSuggestions, setLoadingDestSuggestions] = useState(false);

  // OSRM calculated route preview
  const [previewRouteGeometry, setPreviewRouteGeometry] = useState<[number, number][]>([]);

  // Fetch routes list
  const fetchRoutesList = async () => {
    try {
      const res = await axios.get('/api/v1/volunteers/routes');
      setRoutes(res.data);
    } catch {
      setErrorText("Could not sync commute routes ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesList();
  }, []);

  // Origin Nominatim search autocomplete
  useEffect(() => {
    if (originSearch.length < 3) {
      setOriginSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoadingOriginSuggestions(true);
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: originSearch,
            format: 'json',
            limit: 5,
            addressdetails: 1
          }
        });
        setOriginSuggestions(res.data || []);
      } catch (err) {
        console.warn("Origin suggestions search failed", err);
      } finally {
        setLoadingOriginSuggestions(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [originSearch]);

  // Destination Nominatim search autocomplete
  useEffect(() => {
    if (destSearch.length < 3) {
      setDestSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoadingDestSuggestions(true);
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: destSearch,
            format: 'json',
            limit: 5,
            addressdetails: 1
          }
        });
        setDestSuggestions(res.data || []);
      } catch (err) {
        console.warn("Destination suggestions search failed", err);
      } finally {
        setLoadingDestSuggestions(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [destSearch]);

  const handleSelectOriginSuggestion = (suggestion: any) => {
    setStartName(suggestion.display_name);
    setStartLat(parseFloat(suggestion.lat));
    setStartLng(parseFloat(suggestion.lon));
    setOriginSuggestions([]);
    setOriginSearch(suggestion.display_name);
  };

  const handleSelectDestSuggestion = (suggestion: any) => {
    setEndName(suggestion.display_name);
    setEndLat(parseFloat(suggestion.lat));
    setEndLng(parseFloat(suggestion.lon));
    setDestSuggestions([]);
    setDestSearch(suggestion.display_name);
  };

  // OSRM route geometry calculation
  useEffect(() => {
    if (startLat && startLng && endLat && endLng) {
      const fetchOSRMPreview = async () => {
        try {
          const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`, {
            params: {
              overview: 'full',
              geometries: 'geojson'
            }
          });
          if (res.data && res.data.routes && res.data.routes.length > 0) {
            const coordinates = res.data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setPreviewRouteGeometry(coordinates);
          }
        } catch (err) {
          console.warn("OSRM routing failed", err);
          setPreviewRouteGeometry([ [startLat, startLng], [endLat, endLng] ]);
        }
      };
      fetchOSRMPreview();
    } else {
      setPreviewRouteGeometry([]);
    }
  }, [startLat, startLng, endLat, endLng]);

  const handleRegisterRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (startLat === null || startLng === null) {
      setErrorText("Please search and select an Origin starting point.");
      return;
    }
    if (endLat === null || endLng === null) {
      setErrorText("Please search and select a Destination point.");
      return;
    }
    if (!startName || !endName) {
      setErrorText("Please complete the labels of transit locations.");
      return;
    }

    setLoading(true);
    try {
      const geomString = previewRouteGeometry.map(p => `${p[0]},${p[1]}`).join(';');

      const payload = {
        startLatitude: startLat,
        startLongitude: startLng,
        endLatitude: endLat,
        endLongitude: endLng,
        startName,
        endName,
        routeGeometry: geomString,
        routeType,
        activeFrom,
        activeUntil,
        maxDeviation
      };

      await axios.post('/api/v1/volunteers/routes', payload);
      
      // Reset Form fields
      setStartName('');
      setEndName('');
      setOriginSearch('');
      setDestSearch('');
      setStartLat(null);
      setStartLng(null);
      setEndLat(null);
      setEndLng(null);
      setMaxDeviation(5.0);
      setPreviewRouteGeometry([]);

      fetchRoutesList();
    } catch (err: any) {
      setErrorText(err.response?.data?.message || 'Could not register commute route.');
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm("Delete this commute pathway? You will stop receiving matches for this path.")) return;
    try {
      await axios.delete(`/api/v1/volunteers/routes/${routeId}`);
      fetchRoutesList();
    } catch {
      alert("Failed to delete route.");
    }
  };

  const getMapMarkers = () => {
    const markers = [];
    if (startLat !== null && startLng !== null) {
      markers.push({ id: 'start', latitude: startLat, longitude: startLng, title: 'Origin: ' + startName, role: 'CURRENT' as const });
    }
    if (endLat !== null && endLng !== null) {
      markers.push({ id: 'end', latitude: endLat, longitude: endLng, title: 'Destination: ' + endName, role: 'VOLUNTEER' as const });
    }
    return markers;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left max-w-5xl mx-auto">
      
      {/* List / Register form */}
      <div className="lg:col-span-6 space-y-6">
        <div className="border-b border-natural-border pb-5">
          <h2 className="text-2xl font-display font-black text-natural-text tracking-tight uppercase">Travel Commute Routes</h2>
          <p className="text-xs text-natural-muted mt-0.5 font-semibold">Declare your usual journeys to match route surplus pickups.</p>
        </div>

        <div className="bg-white border border-natural-border p-4 rounded-2xl flex items-center space-x-4 shadow-xs">
          <div className="flex-1">
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">Commute-Based Redistribution</h3>
            <p className="text-[10px] text-natural-muted leading-relaxed font-semibold mt-1">
              Specify your usual origin and destination points. E-Meal dynamically matches active donations along your route, ensuring zero-carbon detour efficiency.
            </p>
          </div>
          <div className="w-20 h-20 shrink-0 rounded-xl bg-brand-50/50 border border-brand-150 overflow-hidden flex items-center justify-center p-1.5">
            <img src={volunteerCommuteImg} alt="Commute Route Illustration" className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>

        {errorText && (
          <div className="p-4 rounded-xl bg-red-55/10 border border-red-200 text-xs text-red-750 flex items-start space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Input Form with Nominatim geocoding autocomplete */}
        <form onSubmit={handleRegisterRoute} className="bg-white border border-natural-border p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="font-bold text-xs text-natural-text border-b border-natural-border pb-2 uppercase tracking-wider font-display">Add Commute Pathway</h3>
          
          <div className="space-y-4">
            {/* Origin Autocomplete Search Box */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Search Origin Starting Point</label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  required
                  value={originSearch}
                  onChange={(e) => setOriginSearch(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Type origin start address..."
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {loadingOriginSuggestions && (
                  <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-natural-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {originSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectOriginSuggestion(sug)}
                      className="p-2.5 hover:bg-brand-50/50 cursor-pointer transition-colors text-[11px] text-natural-text truncate"
                    >
                      {sug.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Autocomplete Search Box */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Search Destination Point</label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  required
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Type destination address..."
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {loadingDestSuggestions && (
                  <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-natural-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {destSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDestSuggestion(sug)}
                      className="p-2.5 hover:bg-brand-50/50 cursor-pointer transition-colors text-[11px] text-natural-text truncate"
                    >
                      {sug.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Transit Mode</label>
              <select
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as any)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="DAILY">DAILY</option>
                <option value="AD_HOC">AD HOC (One Time)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Active From</label>
              <input
                type="text"
                required
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                placeholder="09:00 AM"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Active Until</label>
              <input
                type="text"
                required
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                placeholder="10:00 AM"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted flex justify-between">
              <span>Acceptable Route Detour Range</span>
              <span className="font-mono text-brand-600 font-black">{maxDeviation} km</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.5"
              value={maxDeviation}
              onChange={(e) => setMaxDeviation(Number(e.target.value))}
              className="mt-1.5 w-full accent-brand-600 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex justify-center text-[10px]"
          >
            {loading ? 'Syncing Pathway...' : 'Register Commute Route'}
          </button>
        </form>

        {/* List of registered ones */}
        <div className="bg-white border border-natural-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-natural-border bg-[#FAF9F5]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text font-display">Declared Pathways</h3>
          </div>
          {routes.length === 0 ? (
            <div className="p-8 text-center text-xs text-natural-muted font-semibold">
              No registered commute routes found. Search and register origin/destination above.
            </div>
          ) : (
            <div className="divide-y divide-natural-border">
              {routes.map((rt) => (
                <div key={rt.id} className="p-4 hover:bg-[#FAF9F5] transition-colors flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <h5 className="font-display font-black text-natural-text uppercase tracking-wider truncate flex items-center gap-1">
                      <Route className="w-4 h-4 text-brand-600 shrink-0" /> {rt.startName.split(',')[0]} ➔ {rt.endName.split(',')[0]}
                    </h5>
                    <div className="text-[9px] text-natural-muted mt-2 flex flex-wrap gap-1.5 font-bold uppercase tracking-wider font-mono">
                      <span className="bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded">{rt.routeType}</span>
                      <span className="bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded">{rt.activeFrom} - {rt.activeUntil}</span>
                      <span className="bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded">Detour: {rt.maxDeviation || 5.0} km</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoute(rt.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Map selector pane */}
      <div className="lg:col-span-6 flex flex-col min-h-[400px]">
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl mb-4 text-xs font-semibold text-brand-850 flex items-start space-x-2">
          <Compass className="w-4 h-4 shrink-0 text-brand-750 mt-0.5" />
          <span>
            Search addresses on the left. The map will display markers and calculate the actual road geometry path.
          </span>
        </div>
        <div className="flex-1 min-h-[350px] relative overflow-hidden rounded-2xl border border-natural-border">
          <MapView
            center={[startLat || 12.9716, startLng || 77.5946]}
            zoom={12}
            markers={getMapMarkers()}
            polylinePoints={previewRouteGeometry}
            interactive={false}
          />
        </div>
      </div>

    </div>
  );
};

export default VolunteerRoutes;
