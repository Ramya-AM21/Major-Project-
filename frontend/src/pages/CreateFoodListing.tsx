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
      // Wait, let's query the specific provider endpoints or fallback to cached values
      if (parsed && parsed.provider) {
        setPickupAddress(parsed.provider.address || '');
        setLatitude(parsed.provider.latitude || null);
        setLongitude(parsed.provider.longitude || null);
      }
    }
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
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-650">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-display font-extrabold text-gray-900 tracking-tight">Surplus Donation Published</h2>
        <p className="text-sm text-gray-500">
          Your donation has been published. We are finding a suitable route-compatible volunteer and routing options.
        </p>
        <span className="text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full animate-pulse">
          Redirecting to dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/provider/dashboard')}
          className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" /> Back to surplus ledger
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 md:p-8">
        <div className="border-b border-gray-150 pb-5 mb-6">
          <h2 className="text-xl font-display font-bold text-gray-900 tracking-tight">Declare Kitchen Surplus</h2>
          <p className="text-xs text-gray-500 mt-1">Specify detailed food categories, allergens, and coordinate directions for pickups</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-650 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Section 1: Food details */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-gray-900">1. Surplus Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Surplus Food Name</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="E.g. Mixed Veg Curry & Roti"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Category Tag</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="VEG">VEG (Vegetarian)</option>
                  <option value="NON-VEG">NON-VEG (Meat/Poultry)</option>
                  <option value="EGG">EGG (Egg-based dishes)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Quantity Amount</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="E.g. 35"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Measurement Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="MEALS">MEALS (Individual Portions)</option>
                  <option value="KG">KG (Kilograms)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Allergen Safety Notes</label>
                <input
                  type="text"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="E.g. Wheat Gluten, Dairy (Optional)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Expiry & Safe Windows */}
          <div className="space-y-4 pt-4 border-t border-gray-150">
            <h3 className="font-display font-semibold text-sm text-gray-900">2. Consumption Safety Timers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Kitchen Preparation Time</label>
                <input
                  type="datetime-local"
                  required
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Safe Consumption Window (Hours)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="12"
                  value={safeConsumptionHrs || ''}
                  onChange={(e) => setSafeConsumptionHrs(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="E.g. 3 hours"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Expiries trigger auto-removal bounds to avoid safety breaches.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: GPS coords pick */}
          <div className="space-y-4 pt-4 border-t border-gray-150">
            <h3 className="font-display font-semibold text-sm text-gray-900">3. Pickup Geolocation coordinates</h3>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700">Pickup Street Address Description</label>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Business suite, floor, street details"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Pin Location on Map Canvas (click on target area)
              </label>
              <div className="h-72 rounded-xl overflow-hidden border border-gray-250 relative">
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
                <div className="text-[10px] text-right font-mono text-gray-500 mt-1">
                  Latitude: {latitude.toFixed(5)} | Longitude: {longitude.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-150">
            <button
              type="button"
              onClick={() => navigate('/provider/dashboard')}
              className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
