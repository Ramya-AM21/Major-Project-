import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export const CreateFoodListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Basic Form States
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<'VEG' | 'NON-VEG' | 'EGG'>('VEG');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<'MEALS' | 'KG'>('MEALS');
  const [allergens, setAllergens] = useState('');

  // Expiry / Safety States
  const [safeConsumptionHrs, setSafeConsumptionHrs] = useState<number>(3); // default 3 hours
  const [distributionSession, setDistributionSession] = useState<'AFTERNOON' | 'NIGHT'>('AFTERNOON');
  const [sessionConfig, setSessionConfig] = useState<any>(null);
  const [prepTime, setPrepTime] = useState(() => {
    // Current local time formatted for datetime-local input
    const now = new Date();
    // Offset local timezone
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
  });

  // Pickup coordinates from current provider (if user profile has it, or selected on map)
  const [pickupAddress, setPickupAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Destination Zones states
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  // Status handlers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load defaults on mount
  const [filteredZones, setFilteredZones] = useState<any[]>([]);
 
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
 
  useEffect(() => {
    // Pre-fill location coordinates from provider credentials if cache is available
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.provider) {
        setPickupAddress(parsed.provider.address || '');
        setLatitude(parsed.provider.latitude || null);
        setLongitude(parsed.provider.longitude || null);
      }
    }
 
    const fetchZones = async () => {
      try {
        const res = await axios.get('/api/v1/zones');
        setZones(res.data || []);
      } catch (e) {
        console.error("Could not fetch active zones list", e);
      }
    };
    fetchZones();

    const fetchSessionConfig = async () => {
      try {
        const res = await axios.get('/api/v1/sessions/config');
        setSessionConfig(res.data);
      } catch (e) {
        console.error("Could not fetch sessions configuration", e);
      }
    };
    fetchSessionConfig();
  }, []);
 
  useEffect(() => {
    if (latitude === null || longitude === null) {
      setFilteredZones(zones);
      return;
    }
    const computed = zones
      .map(zone => {
        const dist = calculateDistance(latitude, longitude, zone.latitude, zone.longitude);
        return { ...zone, distanceToPickup: dist };
      })
      .filter(zone => zone.distanceToPickup <= 25.0) // 25 km threshold
      .sort((a, b) => a.distanceToPickup - b.distanceToPickup);
 
    setFilteredZones(computed);
 
    if (computed.length > 0) {
      const exists = computed.some(z => z.id === selectedZoneId);
      if (!exists) {
        setSelectedZoneId(computed[0].id);
      }
    } else {
      setSelectedZoneId('');
    }
  }, [latitude, longitude, zones]);
 
  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError("Please input a valid quantity amount.");
      return;
    }
    if (!pickupAddress) {
      setError("Please define a pickup street address.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please select pickup coordinates on the map view.");
      return;
    }
    if (!selectedZoneId) {
      setError("Please select a target destination zone.");
      return;
    }

    setLoading(true);
    try {
      const prepDate = new Date(prepTime);

      const payload = {
        foodName,
        category,
        quantity,
        unit,
        allergens,
        preparationTime: prepDate.toISOString(),
        safeConsumptionHours: safeConsumptionHrs,
        distributionSession: distributionSession,
        pickupAddress,
        pickupLatitude: latitude,
        pickupLongitude: longitude,
        destinationZone: {
          id: selectedZoneId
        }
      };

      await axios.post('/api/v1/food', payload);
      setSuccess(true);
      setTimeout(() => {
        navigate('/provider/dashboard');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish surplus food details.');
    } finally {
      // Done
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-650">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-display font-black text-natural-text tracking-tight uppercase">Surplus Donation Published</h2>
        <p className="text-xs text-natural-muted font-semibold leading-relaxed">
          Your donation has been published. We are finding a suitable route-compatible volunteer and routing options.
        </p>
        <span className="text-[10px] text-brand-700 bg-brand-50 border border-brand-100 px-3.5 py-1 rounded-full animate-pulse font-bold uppercase tracking-wider">
          Redirecting to dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center text-left">
        <button
          onClick={() => navigate('/provider/dashboard')}
          className="inline-flex items-center text-[10px] font-bold text-brand-500 hover:text-brand-700 transition-colors gap-1 uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to surplus ledger
        </button>
      </div>

      <div className="bg-white border border-natural-border rounded-2xl shadow-xs p-6 md:p-8">
        <div className="border-b border-natural-border pb-5 mb-6 text-left">
          <h2 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Declare Kitchen Surplus</h2>
          <p className="text-xs text-natural-muted mt-1 font-semibold">Specify detailed food categories, allergens, and coordinate directions for pickups</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-650 flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Section 1: Food details */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">1. Surplus Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Food Description Name</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. Mixed Veg curry & parotas"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Category Class</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                >
                  <option value="VEG">Vegetarian (VEG)</option>
                  <option value="NON_VEG">Non-Vegetarian (NON-VEG)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Meals Count Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. 25"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Counting Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'MEALS' | 'KG')}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                >
                  <option value="MEALS">MEALS</option>
                  <option value="KG">KG</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Allergens Declared</label>
                <input
                  type="text"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. Nuts, Dairy (leave empty if none)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Distribution Session & Safety Timers */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">2. Distribution Session & Consumption Safety Timers</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Distribution Session</label>
                <select
                  value={distributionSession}
                  onChange={(e) => setDistributionSession(e.target.value as any)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                >
                  <option value="AFTERNOON">Afternoon Distribution (1:00 PM - 3:00 PM)</option>
                  <option value="NIGHT">Night Distribution (8:00 PM - 10:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Kitchen Preparation Time</label>
                <input
                  type="datetime-local"
                  required
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Safe Consumption Window (Hours)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="12"
                  value={safeConsumptionHrs || ''}
                  onChange={(e) => setSafeConsumptionHrs(Number(e.target.value))}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. 3 hours"
                />
              </div>
            </div>

            {/* Calculations Preview Panel */}
            <div className="p-4 bg-brand-50/20 border border-brand-100 rounded-xl space-y-1.5 text-xs text-brand-850 font-semibold">
              <div className="flex justify-between">
                <span>Selected Session Window:</span>
                <span className="font-bold">
                  {distributionSession === 'AFTERNOON' 
                    ? `${sessionConfig?.AFTERNOON?.start || '13:00'} - ${sessionConfig?.AFTERNOON?.end || '15:00'}`
                    : `${sessionConfig?.NIGHT?.start || '20:00'} - ${sessionConfig?.NIGHT?.end || '22:00'}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Calculated Food Expiry Time:</span>
                <span className="font-bold text-red-650">
                  {new Date(new Date(prepTime).getTime() + safeConsumptionHrs * 60 * 60 * 1000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t border-brand-100/50 pt-1.5 mt-1.5 text-[11px]">
                <span>Effective Availability Bounds:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-100">
                  From: {distributionSession === 'AFTERNOON' ? '1:00 PM' : '8:00 PM'} | Until: MIN(Session End, Food Expiry)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Target Community Zone */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">3. Target Community Zone</h3>
            
            {latitude !== null && filteredZones.length === 0 ? (
              <div className="bg-[#FAF9F5] border border-brand-100 p-4 rounded-xl space-y-3">
                <div className="flex items-start space-x-2 text-xs font-semibold text-brand-850">
                  <AlertCircle className="w-4 h-4 shrink-0 text-brand-650 mt-0.5" />
                  <span>No active redistribution shelters found within 25 km of your location. You can quickly register a local shelter in your area:</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Shelter Name</label>
                    <input
                      type="text"
                      id="quick-shelter-name"
                      placeholder="e.g. Mumbai Community Shelter"
                      className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-natural-muted">Shelter Address</label>
                    <input
                      type="text"
                      id="quick-shelter-address"
                      placeholder="e.g. Bandra West, Mumbai"
                      className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const nameEl = document.getElementById('quick-shelter-name') as HTMLInputElement;
                    const addrEl = document.getElementById('quick-shelter-address') as HTMLInputElement;
                    if (!nameEl?.value || !addrEl?.value) {
                      setError("Please provide both name and address for the new shelter.");
                      return;
                    }
                    setError(null);
                    try {
                      // Slight offset to represent a real delivery trip (approx 500m to 1km)
                      const offsetLat = (latitude || 0) + 0.006;
                      const offsetLng = (longitude || 0) + 0.006;
                      
                      const newZonePayload = {
                        name: nameEl.value,
                        address: addrEl.value,
                        latitude: offsetLat,
                        longitude: offsetLng,
                        capacity: 150,
                        operatingHours: "08:00 AM - 09:00 PM",
                        priorityScore: 7.5,
                        status: "ACTIVE"
                      };
                      const res = await axios.post('/api/v1/zones', newZonePayload);
                      
                      // Refetch all zones to reload dropdown lists
                      const refetchRes = await axios.get('/api/v1/zones');
                      setZones(refetchRes.data || []);
                      setSelectedZoneId(res.data.id);
                    } catch (err: any) {
                      setError("Failed to create shelter: " + (err.response?.data?.message || err.message));
                    }
                  }}
                  className="btn-secondary py-1.5 px-3 text-[10px]"
                >
                  Register & Select Local Shelter
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Select Recipient Shelter / Redistribution Center</label>
                <select
                  required
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                >
                  <option value="">-- Select Target Zone --</option>
                  {filteredZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {zone.address} (Priority: {zone.priorityScore || 'Medium'}) {zone.distanceToPickup !== undefined ? `[${zone.distanceToPickup.toFixed(1)} km away]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 4: GPS coords pick */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">4. Pickup Geolocation</h3>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Pickup Street Address Description</label>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                placeholder="Business suite, floor, street details"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted mb-2">
                Pin Location on Map Canvas (click on target area)
              </label>
              <div className="h-64 rounded-xl overflow-hidden border border-natural-border relative">
                <MapView
                  center={latitude !== null && longitude !== null ? [latitude, longitude] : [12.9716, 77.5946]}
                  zoom={12}
                  onLocationSelect={handleLocationSelect}
                  markers={latitude !== null && longitude !== null ? [
                    { id: 'selected', latitude, longitude, title: foodName || 'Pickup Location', role: 'PROVIDER' }
                  ] : []}
                />
              </div>
              {latitude !== null && longitude !== null && (
                <div className="text-[9px] text-right font-mono text-natural-muted mt-1.5 font-bold">
                  Latitude: {latitude.toFixed(5)} | Longitude: {longitude.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-natural-border">
            <button
              type="button"
              onClick={() => navigate('/provider/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
