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
        if (res.data && res.data.length > 0) {
          setSelectedZoneId(res.data[0].id);
        }
      } catch (e) {
        console.error("Could not fetch active zones list", e);
      }
    };
    fetchZones();
  }, []);

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
      // Expiry time is computed dynamically as: prep_time + safe_consumption_hours
      const expiryDate = new Date(prepDate.getTime() + safeConsumptionHrs * 60 * 60 * 1000);

      const payload = {
        foodName,
        category,
        quantity,
        unit,
        allergens,
        preparationTime: prepDate.toISOString(),
        expiryTime: expiryDate.toISOString(),
        pickupAddress,
        pickupLatitude: latitude,
        pickupLongitude: longitude,
        destinationZone: {
          id: selectedZoneId
        },
        status: 'AVAILABLE'
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

          {/* Section 2: Expiry & Safe Windows */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">2. Consumption Safety Timers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <span className="text-[10px] text-natural-muted mt-1 block font-semibold">
                  Expiries trigger auto-removal bounds to avoid safety breaches.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Target Community Zone */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">3. Target Community Zone</h3>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Select Recipient Shelter / Redistribution Center</label>
              <select
                required
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
              >
                <option value="">-- Select Target Zone --</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} — {zone.address} (Priority: {zone.priorityScore || 'Medium'})
                  </option>
                ))}
              </select>
            </div>
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
