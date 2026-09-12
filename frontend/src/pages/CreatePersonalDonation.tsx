import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import axios from 'axios';
import { 
  Heart, 
  Camera, 
  Sparkles, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  FileText,
  ShieldCheck
} from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export const CreatePersonalDonation: React.FC = () => {
  const { providerProfile } = useAuth();
  const navigate = useNavigate();

  // Mode: 'AI_ASSISTED' or 'MANUAL'
  const [entryMethod, setEntryMethod] = useState<'AI_ASSISTED' | 'MANUAL'>('AI_ASSISTED');

  // Occasion
  const [donationOccasion, setDonationOccasion] = useState<string>('BIRTHDAY');

  // Form Fields
  const [foodName, setFoodName] = useState<string>('');
  const [category, setCategory] = useState<string>('VEG'); // VEG, NON_VEG, EGG
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('MEALS'); // MEALS, KG
  const [description, setDescription] = useState<string>('');
  const [allergens, setAllergens] = useState<string>('');
  const [safeConsumptionHours, setSafeConsumptionHours] = useState<number>(3);
  const [preparationTime, setPreparationTime] = useState<string>(
    new Date(Date.now() - 30 * 60 * 1000).toISOString().slice(0, 16)
  );

  // Distribution Session
  const [distributionSession, setDistributionSession] = useState<'AFTERNOON' | 'NIGHT'>('AFTERNOON');

  // Location
  const [pickupAddress, setPickupAddress] = useState<string>(providerProfile?.address || '');
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(providerProfile?.latitude || null);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(providerProfile?.longitude || null);

  // Destination Zone
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  // Image & AI state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchZones();
    if (providerProfile) {
      if (!pickupAddress) setPickupAddress(providerProfile.address || '');
      if (pickupLatitude === null) setPickupLatitude(providerProfile.latitude || null);
      if (pickupLongitude === null) setPickupLongitude(providerProfile.longitude || null);
    }
  }, [providerProfile]);

  const fetchZones = async () => {
    try {
      const response = await axios.get('/api/v1/zones');
      const data = response.data || [];
      setZones(data);
      if (data.length > 0) {
        setSelectedZoneId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch distribution zones', e);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    if (entryMethod === 'AI_ASSISTED') {
      await analyzeImageWithAi(file);
    }
  };

  const analyzeImageWithAi = async (file: File) => {
    setAiAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/v1/food/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const resData = response.data;
      setAiAnalysisResult(resData);

      if (resData.imageUrl) {
        setImageUrl(resData.imageUrl);
      }

      // Populate extracted fields into editable form controls
      if (resData) {
        const f = resData.food || {};
        const extracted = resData.extractedDetails || {};

        const extractedName = f.foodName || resData.food_name || extracted.suggestedFoodName || (resData.visible_labels && resData.visible_labels.join(', ')) || '';
        if (extractedName) setFoodName(extractedName);

        const extractedCat = f.category || resData.food_category || extracted.suggestedCategory || '';
        if (extractedCat) {
          const catUpper = extractedCat.toUpperCase();
          if (catUpper.includes('NON') || catUpper.includes('MEAT') || catUpper.includes('CHICKEN') || catUpper.includes('FISH')) {
            setCategory('NON_VEG');
          } else if (catUpper.includes('EGG')) {
            setCategory('EGG');
          } else {
            setCategory('VEG');
          }
        }

        const extractedQty = f.quantity !== undefined && f.quantity !== null && f.quantity !== '' ? f.quantity : (resData.estimated_quantity || extracted.suggestedQuantity);
        if (extractedQty !== undefined && extractedQty !== null && extractedQty !== '') {
          const parsed = parseFloat(String(extractedQty).replace(/[^\d\.]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            setQuantity(String(parsed));
          }
        }

        const extractedUnit = f.unit || resData.unit || extracted.suggestedUnit;
        if (extractedUnit) setUnit(extractedUnit);

        const extractedDesc = f.description || resData.description;
        if (extractedDesc) setDescription(extractedDesc);

        const extractedAllergens = f.allergens || (resData.possible_allergens && resData.possible_allergens.join(', ')) || extracted.suggestedAllergens;
        if (extractedAllergens) setAllergens(extractedAllergens);
      }
    } catch (err: any) {
      console.warn('AI Image analysis error:', err);
      // Fallback: donor can edit manually
      setError('AI food scanning couldn\'t recognize all fields automatically. You can fill or edit the details manually below.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setPickupLatitude(lat);
    setPickupLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!foodName || !foodName.trim()) {
      setError('Please provide a food item name.');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!selectedZoneId) {
      setError('Please select a target distribution zone.');
      return;
    }
    if (!pickupAddress || pickupLatitude === null || pickupLongitude === null) {
      setError('Please specify a valid pickup address and location coordinates.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        foodName: foodName.trim(),
        category,
        quantity: numQty,
        unit,
        description: description.trim(),
        allergens: allergens.trim(),
        preparationTime: new Date(preparationTime).toISOString(),
        safeConsumptionHours: safeConsumptionHours || 3,
        distributionSession,
        donationOccasion,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        destinationZone: { id: selectedZoneId },
        imageUrl,
        entryMethod,
        status: 'AVAILABLE'
      };

      await axios.post('/api/v1/food', payload);
      navigate('/donor/dashboard');
    } catch (err: any) {
      console.error('Error submitting personal donation:', err);
      setError(err.response?.data?.message || 'Failed to submit food donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
      
      {/* Back Button */}
      <button
        onClick={() => navigate('/donor/dashboard')}
        className="inline-flex items-center space-x-1 text-xs font-bold text-natural-muted hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Donor Dashboard</span>
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left border-b border-natural-border pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-700 uppercase tracking-wider font-mono">
            <Heart className="w-3.5 h-3.5 text-brand-600" />
            <span>Personal Surplus Food Donation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-natural-text tracking-tight uppercase">
            Donate Surplus Food
          </h1>
          <p className="text-xs text-natural-muted max-w-2xl font-semibold">
            Have surplus food from a celebration or event? Schedule it for distribution and match directly with local volunteers on active commute routes through FoodBridge.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Donation Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-natural-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Section 1: Event Occasion */}
        <div className="space-y-3 pb-6 border-b border-natural-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-natural-text font-display">
            1. Celebration / Event Occasion
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'BIRTHDAY', label: 'Birthday' },
              { id: 'ANNIVERSARY', label: 'Anniversary' },
              { id: 'WEDDING', label: 'Wedding / Function' },
              { id: 'COLLEGE_EVENT', label: 'College Event' },
              { id: 'CORPORATE_EVENT', label: 'Corporate Event' },
              { id: 'COMMUNITY_EVENT', label: 'Community Gathering' },
              { id: 'OTHER', label: 'Other Gathering' },
            ].map((occ) => (
              <button
                key={occ.id}
                type="button"
                onClick={() => setDonationOccasion(occ.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all border ${
                  donationOccasion === occ.id
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm scale-[1.02]'
                    : 'bg-white text-natural-text border-natural-border hover:bg-brand-50/60 hover:text-brand-700'
                }`}
              >
                {occ.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Entry Method & Photo AI Analysis */}
        <div className="space-y-4 pb-6 border-b border-natural-border">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-natural-text font-display">
              2. Food Entry Method
            </label>
            <div className="flex space-x-2 bg-natural-bg p-1 rounded-lg border border-natural-border">
              <button
                type="button"
                onClick={() => setEntryMethod('AI_ASSISTED')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  entryMethod === 'AI_ASSISTED' ? 'bg-white text-brand-700 shadow-xs' : 'text-natural-muted'
                }`}
              >
                AI Photo Scanning
              </button>
              <button
                type="button"
                onClick={() => setEntryMethod('MANUAL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  entryMethod === 'MANUAL' ? 'bg-white text-brand-700 shadow-xs' : 'text-natural-muted'
                }`}
              >
                Manual Entry
              </button>
            </div>
          </div>

          {/* Photo Upload Box */}
          <div className="border-2 border-dashed border-natural-border rounded-2xl p-6 text-center hover:border-brand-500 transition-colors bg-brand-50/20">
            {imagePreview ? (
              <div className="space-y-3">
                <img src={imagePreview} alt="Food Upload" className="max-h-48 rounded-xl mx-auto shadow-sm object-cover" />
                <div className="flex justify-center space-x-2">
                  <label className="cursor-pointer text-xs font-bold text-brand-700 hover:text-brand-850 bg-white px-3 py-1.5 rounded-lg border border-natural-border shadow-xs">
                    Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer space-y-2 block">
                <Camera className="w-8 h-8 text-brand-500 mx-auto" />
                <div className="text-xs font-bold text-natural-text font-display">Upload Photo of Surplus Food</div>
                <p className="text-[11px] text-natural-muted max-w-xs mx-auto">
                  Our Gemini Vision AI will analyze food item name, category, and quantity suggestions.
                </p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {aiAnalyzing && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 flex items-center space-x-2 font-semibold">
              <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
              <span>Analyzing image with Gemini Vision AI... extracting details...</span>
            </div>
          )}

          {aiAnalysisResult && (
            <div className="p-3 bg-brand-50/80 border border-brand-200 rounded-xl text-xs text-brand-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>AI Suggestions Extracted! Review and edit values below before confirming.</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Food Details */}
        <div className="space-y-4 pb-6 border-b border-natural-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-natural-text font-display">
            3. Food Details
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-natural-text mb-1">Food Name / Description *</label>
              <input
                type="text"
                required
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="E.g. Veg Biryani & Paneer Gravy"
                className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-natural-text mb-1">Dietary Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
              >
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
                <option value="EGG">Egg</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-natural-text mb-1">Approx. Quantity *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="E.g. 25"
                className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-natural-text mb-1">Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
              >
                <option value="MEALS">Meals / Plates</option>
                <option value="KG">Kilograms (KG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-natural-text mb-1">Safe Consumption Window *</label>
              <select
                value={safeConsumptionHours}
                onChange={(e) => setSafeConsumptionHours(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
              >
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours (Standard)</option>
                <option value={4}>4 Hours</option>
                <option value={5}>5 Hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-natural-text mb-1">Allergens (Optional)</label>
            <input
              type="text"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              placeholder="E.g. Dairy, Nuts, Gluten (or Leave blank)"
              className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-natural-text mb-1">Detailed Event Notes (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Freshly cooked biryani from birthday dinner, packed in covered trays."
              className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
            />
          </div>
        </div>

        {/* Section 4: Distribution Session */}
        <div className="space-y-3 pb-6 border-b border-natural-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-natural-text font-display">
            4. Distribution Session Window
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setDistributionSession('AFTERNOON')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                distributionSession === 'AFTERNOON'
                  ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                  : 'border-natural-border hover:border-brand-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-natural-text font-display">Afternoon Session</span>
                <Clock className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-natural-muted mt-1">1:00 PM – 3:00 PM</p>
            </div>

            <div
              onClick={() => setDistributionSession('NIGHT')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                distributionSession === 'NIGHT'
                  ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                  : 'border-natural-border hover:border-brand-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-natural-text font-display">Night Session</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-natural-muted mt-1">8:00 PM – 10:00 PM</p>
            </div>
          </div>
        </div>

        {/* Section 5: Pickup Location & Target Zone */}
        <div className="space-y-4 pb-6 border-b border-natural-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-natural-text font-display">
            5. Pickup Address & Target Zone
          </label>

          <div>
            <label className="block text-xs font-semibold text-natural-text mb-1">Pickup Address *</label>
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Enter exact pickup location address"
              className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-natural-text mb-2">Pin Pickup Spot On Map *</label>
            <div className="h-48 rounded-xl border border-natural-border overflow-hidden relative">
              <MapView
                center={[pickupLatitude || 12.9716, pickupLongitude || 77.5946]}
                zoom={13}
                onLocationSelect={handleLocationSelect}
                markers={pickupLatitude !== null && pickupLongitude !== null ? [
                  { id: 'pickup', latitude: pickupLatitude, longitude: pickupLongitude, title: 'Pickup Point', role: 'PROVIDER' }
                ] : []}
              />
            </div>
            {pickupLatitude !== null && pickupLongitude !== null && (
              <div className="text-[10px] text-natural-muted font-mono mt-1 text-right">
                Lat: {pickupLatitude.toFixed(5)} | Lng: {pickupLongitude.toFixed(5)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-natural-text mb-1">Destination Zone *</label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full px-3 py-2 border border-natural-border rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {z.address}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Disclaimer / Safety Notice */}
        <div className="p-3 bg-brand-50/50 border border-brand-200 rounded-xl text-[11px] text-natural-text flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <span>
            Food information is checked against platform safety rules; donors remain responsible for providing accurate food preparation and freshness details.
          </span>
        </div>

        {/* Submit CTA */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/donor/dashboard')}
            className="px-4 py-2.5 border border-natural-border text-natural-text font-bold rounded-xl text-xs hover:bg-natural-bg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-2 uppercase tracking-wider"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Donation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Personal Food Donation</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
