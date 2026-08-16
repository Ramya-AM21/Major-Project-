import React, { useState, useEffect } from 'react';
import { MapView } from '../components/MapView';
import { 
  ArrowLeft, Plus, Trash2, Loader2, Route, CheckCircle2, AlertCircle, MapPin, Clock, Compass
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
  
  // Which marker is currently selected (for coordinates input helper)
  const [pickingLocation, setPickingLocation] = useState<'START' | 'END' | null>(null);

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
    setErrorText(null);
  };

  const handleRegisterRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (startLat === null || startLng === null) {
      setErrorText("Please pick an origin start point on the map canvas.");
      return;
    }
    if (endLat === null || endLng === null) {
      setErrorText("Please pick a destination end point on the map canvas.");
      return;
    }
    if (!startName || !endName) {
      setErrorText("Please complete the labels of transit locations (e.g. Home, Office).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        startLatitude: startLat,
        startLongitude: startLng,
        endLatitude: endLat,
        endLongitude: endLng,
        startName,
        endName,
        routeGeometry: `${startLat},${startLng};${endLat},${endLng}`,
        routeType,
        activeFrom,
        activeUntil,
        maxDeviation
      };

      await axios.post('/api/v1/volunteers/routes', payload);
      
      // Reset Form fields
      setStartName('');
      setEndName('');
      setStartLat(null);
      setStartLng(null);
      setEndLat(null);
      setEndLng(null);
      setMaxDeviation(5.0);

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
      markers.push({ id: 'start', latitude: startLat, longitude: startLng, title: 'Start: ' + (startName || 'Origin'), role: 'CURRENT' as const });
    }
    if (endLat !== null && endLng !== null) {
      markers.push({ id: 'end', latitude: endLat, longitude: endLng, title: 'End: ' + (endName || 'Destination'), role: 'VOLUNTEER' as const });
    }
    return markers;
  };

  const currentPolyline: [number, number][] = (startLat && endLat) ? [
    [startLat, startLng!],
    [endLat, endLng!]
  ] : [];

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
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex items-start space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleRegisterRoute} className="bg-white border border-natural-border p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="font-bold text-xs text-natural-text border-b border-natural-border pb-2 uppercase tracking-wider">Add Commute Pathway</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Origin Location Name</label>
              <input
                type="text"
                required
                value={startName}
                onChange={(e) => setStartName(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                placeholder="E.g. Home"
              />
              <button
                type="button"
                onClick={() => setPickingLocation('START')}
                className={`mt-2 w-full text-center text-[9px] py-1.5 border rounded-lg font-black transition-all uppercase tracking-wider ${
                  pickingLocation === 'START'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-gray-50 text-natural-muted hover:bg-gray-100'
                }`}
              >
                {startLat ? 'Origin Captured ✓' : 'Pin Origin'}
              </button>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Destination Location Name</label>
              <input
                type="text"
                required
                value={endName}
                onChange={(e) => setEndName(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                placeholder="E.g. Office"
              />
              <button
                type="button"
                onClick={() => setPickingLocation('END')}
                className={`mt-2 w-full text-center text-[9px] py-1.5 border rounded-lg font-black transition-all uppercase tracking-wider ${
                  pickingLocation === 'END'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-gray-50 text-natural-muted hover:bg-gray-100'
                }`}
              >
                {endLat ? 'Destination Captured ✓' : 'Pin Destination'}
              </button>
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
              <span className="font-mono text-brand-650 font-black">{maxDeviation} km</span>
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
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Declared Pathways</h3>
          </div>
          {routes.length === 0 ? (
            <div className="p-8 text-center text-xs text-natural-muted font-semibold">
              No registered commute routes found. Pin endpoints on the map grid.
            </div>
          ) : (
            <div className="divide-y divide-natural-border">
              {routes.map((rt) => (
                <div key={rt.id} className="p-4 hover:bg-[#FAF9F5] transition-colors flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <h5 className="font-display font-black text-natural-text uppercase tracking-wider truncate flex items-center gap-1">
                      <Route className="w-4 h-4 text-brand-600 shrink-0" /> {rt.startName} ➔ {rt.endName}
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
            {pickingLocation 
              ? `Select coordinates for your ${pickingLocation} point by clicking anywhere on the map grid.`
              : 'Pin location coordinate points by selecting Pin Origin/Destination buttons, then clicking map.'}
          </span>
        </div>
        <div className="flex-1 min-h-[350px] relative overflow-hidden rounded-2xl border border-natural-border">
          <MapView
            center={[12.9716, 77.5946]}
            zoom={12}
            onLocationSelect={handleCoordinatesPick}
            markers={getMapMarkers()}
            polylinePoints={currentPolyline}
          />
        </div>
      </div>

    </div>
  );
};

export default VolunteerRoutes;
