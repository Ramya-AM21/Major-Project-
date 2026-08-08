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
        activeUntil
      };

      await axios.post('/api/v1/volunteers/routes', payload);
      
      // Reset Form fields
      setStartName('');
      setEndName('');
      setStartLat(null);
      setStartLng(null);
      setEndLat(null);
      setEndLng(null);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      
      {/* List / Register form */}
      <div className="lg:col-span-6 space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-gray-901 tracking-tight">Configure Commute Routes</h2>
          <p className="text-xs text-gray-500 mt-1">Specify usual routes so we can query suitable surplus pick offers on your path</p>
        </div>

        {errorText && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-650 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleRegisterRoute} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="font-semibold text-xs text-gray-900 border-b border-gray-100 pb-2">Add Commute Pathway</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700">Origin Name</label>
              <input
                type="text"
                required
                value={startName}
                onChange={(e) => setStartName(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-[#faf9f6]/40 focus:outline-none"
                placeholder="E.g. Home"
              />
              <button
                type="button"
                onClick={() => setPickingLocation('START')}
                className={`mt-1.5 w-full text-center text-[10px] py-1 border rounded font-semibold transition-all ${
                  pickingLocation === 'START'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {startLat ? 'Origin Coordinates set ✓' : 'Pin Origin start coordinates'}
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700">Destination Name</label>
              <input
                type="text"
                required
                value={endName}
                onChange={(e) => setEndName(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-[#faf9f6]/40 focus:outline-none"
                placeholder="E.g. College"
              />
              <button
                type="button"
                onClick={() => setPickingLocation('END')}
                className={`mt-1.5 w-full text-center text-[10px] py-1 border rounded font-semibold transition-all ${
                  pickingLocation === 'END'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {endLat ? 'Destination coordinates set ✓' : 'Pin Destination coordinates'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700">Transit Mode</label>
              <select
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as any)}
                className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value="DAILY">DAILY</option>
                <option value="AD_HOC">AD HOC (One Time)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700">Start Time</label>
              <input
                type="text"
                required
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-lg text-xs bg-[#faf9f6]/40"
                placeholder="09:00 AM"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700">End Time</label>
              <input
                type="text"
                required
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-lg text-xs bg-[#faf9f6]/40"
                placeholder="10:00 AM"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none shadow-sm transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Travel Route'}
          </button>
        </form>

        {/* List of registered ones */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-150">
            <h3 className="font-semibold text-xs text-gray-901">Registered Commutes</h3>
          </div>
          {routes.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No registered commute routes found. Use the map to declare commutes.
            </div>
          ) : (
            <div className="divide-y divide-gray-150">
              {routes.map((rt) => (
                <div key={rt.id} className="p-4 hover:bg-[#FAF9F6]/20 transition-colors flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold text-gray-900">{rt.startName} ➔ {rt.endName}</h5>
                    <div className="text-[10px] text-gray-400 mt-1 flex space-x-2 font-medium">
                      <span>{rt.routeType}</span>
                      <span>•</span>
                      <span>{rt.activeFrom} - {rt.activeUntil}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoute(rt.id)}
                    className="p-1 text-red-505 hover:bg-red-50 text-red-600 rounded transition-colors"
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
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl mb-4 text-xs font-medium text-brand-850 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-brand-650 mt-0.5" />
          <span>
            {pickingLocation 
              ? `Move cursor to your ${pickingLocation} target on the map canvas and click to set coordinates.`
              : 'Commute drawing: Click starting/ending hooks inside coordinates pickers to set travel bounds.'}
          </span>
        </div>
        <div className="flex-1 min-h-[350px] relative overflow-hidden rounded-2xl border border-gray-200">
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
