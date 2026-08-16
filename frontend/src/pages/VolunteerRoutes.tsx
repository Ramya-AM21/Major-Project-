import React, { useState, useEffect } from 'react';
import { MapView } from '../components/MapView';
import { 
  ArrowLeft, Plus, Trash2, Loader2, Route, CheckCircle2, AlertCircle
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

  // Compile markers to draw registered paths
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
          <h2 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Configure Commute Routes</h2>
          <p className="text-xs text-natural-muted mt-1 font-semibold">Specify usual routes so we can query suitable surplus pick offers on your path</p>
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Origin Name</label>
              <input
                type="text"
                required
                value={startName}
                onChange={(e) => setStartName(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                placeholder="E.g. Home"
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
                {startLat ? 'Origin Coordinates set ✓' : 'Pin Origin'}
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Destination Name</label>
              <input
                type="text"
                required
                value={endName}
                onChange={(e) => setEndName(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                placeholder="E.g. College"
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
                {endLat ? 'Destination set ✓' : 'Pin Destination'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Transit Mode</label>
              <select
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as any)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
              >
                <option value="DAILY">DAILY</option>
                <option value="AD_HOC">AD HOC (One Time)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Start Time</label>
              <input
                type="text"
                required
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                placeholder="09:00 AM"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">End Time</label>
              <input
                type="text"
                required
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                className="mt-1.5 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                placeholder="10:00 AM"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted flex justify-between">
              <span>Maximum acceptable route deviation</span>
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
            className="btn-primary w-full flex justify-center"
          >
            {loading ? 'Registering...' : 'Register Travel Route'}
          </button>
        </form>

        {/* List of registered ones */}
        <div className="bg-white border border-natural-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-natural-border bg-[#FAF9F5]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">Registered Commutes</h3>
          </div>
          {routes.length === 0 ? (
            <div className="p-8 text-center text-xs text-natural-muted font-semibold">
              No registered commute routes found. Use the map to declare commutes.
            </div>
          ) : (
            <div className="divide-y divide-natural-border">
              {routes.map((rt) => (
                <div key={rt.id} className="p-4 hover:bg-[#FAF9F5] transition-colors flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-natural-text uppercase tracking-wider">{rt.startName} ➔ {rt.endName}</h5>
                    <div className="text-[9px] text-natural-muted mt-1.5 flex flex-wrap gap-2 font-bold uppercase tracking-wider">
                      <span className="bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-mono font-extrabold">{rt.routeType}</span>
                      <span className="bg-brand-100 text-brand-850 px-1.5 py-0.5 rounded font-mono font-extrabold">{rt.activeFrom} - {rt.activeUntil}</span>
                      <span className="bg-brand-50 border border-brand-200 text-brand-700 px-1.5 py-0.5 rounded font-mono font-extrabold">Detour: {rt.maxDeviation || 5.0} km</span>
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
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl mb-4 text-xs font-semibold text-brand-850 flex items-start space-x-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-brand-750 mt-0.5" />
          <span>
            {pickingLocation 
              ? `Move cursor to your ${pickingLocation} target on the map canvas and click to set coordinates.`
              : 'Commute drawing: Click starting/ending hooks inside coordinates pickers to set travel bounds.'}
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
