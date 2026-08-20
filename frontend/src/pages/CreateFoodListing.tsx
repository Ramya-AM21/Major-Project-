import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle2, Camera, Upload, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import axios from 'axios';

export const CreateFoodListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Choice State: null | 'MANUAL' | 'AI_ASSISTED'
  const [entryMethod, setEntryMethod] = useState<'MANUAL' | 'AI_ASSISTED' | null>(null);
  const [step, setStep] = useState<number>(0); // 0: choice screen, 1: photo upload, 2: edit/review form

  // Photo States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form States
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<'VEG' | 'NON_ZEG' | 'NON_VEG' | 'EGG'>('VEG');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState<'MEALS' | 'KG'>('MEALS');
  const [allergens, setAllergens] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState('Vegetarian');
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiDetected, setAiDetected] = useState<boolean>(false);
  const [aiExtractedData, setAiExtractedData] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // AI suggestion flags for UI indicators
  const [aiSuggestedFields, setAiSuggestedFields] = useState<{ 
    foodName?: boolean; 
    category?: boolean;
    foodType?: boolean;
    description?: boolean;
    quantity?: boolean;
    unit?: boolean;
    safeConsumptionHours?: boolean;
    allergens?: boolean;
  }>({});

  // Expiry / Safety States
  const [safeConsumptionHrs, setSafeConsumptionHrs] = useState<number | ''>(''); // Required input
  const [distributionSession, setDistributionSession] = useState<'AFTERNOON' | 'NIGHT'>('AFTERNOON');
  const [sessionConfig, setSessionConfig] = useState<any>(null);
  const [prepTime, setPrepTime] = useState(() => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
  });

  // Pickup location state
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
      .filter(zone => zone.distanceToPickup <= 25.0)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setAiError(null);
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setImageUrl('');
    setAiError(null);
  };

  const handleAnalyzeFood = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setAiError(null);
    setError(null);

    const providerFoodDetails = {
      foodName,
      category,
      quantity: quantity !== '' ? Number(quantity) : null,
      unit,
      allergens,
      safeConsumptionHours: safeConsumptionHrs !== '' ? Number(safeConsumptionHrs) : null,
      description,
      foodType
    };

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('providerFoodDetails', JSON.stringify(providerFoodDetails));

    try {
      const res = await axios.post('/api/provider/food/analyze-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = res.data;
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }

      if (data.success && data.food) {
        const f = data.food;
        
        // Populate fields and set AI suggestion indicators
        const newSuggested: any = {};

        if (f.foodName) {
          setFoodName(f.foodName);
          if (!foodName) newSuggested.foodName = true;
        }
        if (f.category) {
          const cat = f.category === 'NON_ZEG' ? 'NON_VEG' : f.category;
          setCategory(cat as any);
          if (!category || category === 'VEG') newSuggested.category = true;
        }
        if (f.foodType) {
          setFoodType(f.foodType);
          if (!foodType) newSuggested.foodType = true;
        }
        if (f.description) {
          setDescription(f.description);
          if (!description) newSuggested.description = true;
        }
        if (f.quantity !== undefined && f.quantity !== null && f.quantity !== '') {
          setQuantity(Number(f.quantity));
          if (!quantity) newSuggested.quantity = true;
        }
        if (f.unit) {
          setUnit(f.unit as 'MEALS' | 'KG');
          if (!unit || unit === 'MEALS') newSuggested.unit = true;
        }
        if (f.allergens) {
          setAllergens(f.allergens);
          if (!allergens) newSuggested.allergens = true;
        }
        if (f.safeConsumptionHours !== undefined && f.safeConsumptionHours !== null && f.safeConsumptionHours !== '') {
          setSafeConsumptionHrs(Number(f.safeConsumptionHours));
          if (!safeConsumptionHrs) newSuggested.safeConsumptionHours = true;
        }
        
        setAiSuggestedFields(newSuggested);

        // Store AI metadata
        if (data.ai) {
          setAiConfidence(data.ai.confidence);
          setAiExtractedData(data.ai.extractedData);
        }
        setAiDetected(true);
        setAiSource(data.source);
        
        // Show confirmation screen
        setShowConfirmation(true);
      } else {
        setAiError("We could not confidently identify the food. You can enter the details manually.");
        setStep(2); // Let provider proceed manually
      }
    } catch (err: any) {
      setAiError("We could not confidently identify the food. You can enter the details manually.");
      setStep(2); // Let provider proceed manually
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!quantity || quantity <= 0) {
      setError("Please input a valid quantity amount.");
      return;
    }
    if (!safeConsumptionHrs || safeConsumptionHrs <= 0) {
      setError("Please specify the safe consumption window duration.");
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
        safeConsumptionHours: Number(safeConsumptionHrs),
        distributionSession: distributionSession,
        pickupAddress,
        pickupLatitude: latitude,
        pickupLongitude: longitude,
        destinationZone: {
          id: selectedZoneId
        },
        entryMethod: entryMethod || 'MANUAL',
        imageUrl: imageUrl,
        
        // AI metadata and new fields
        description,
        foodType,
        aiDetected,
        aiConfidence,
        aiExtractedData,
        providerConfirmed: entryMethod === 'AI_ASSISTED',
        aiSource
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

  // STEP 0: Entry Method Choice Screen
  if (entryMethod === null) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center py-12">
        <h2 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Add Surplus Food</h2>
        <p className="text-xs text-natural-muted font-semibold">Choose how you want to add your surplus food listing.</p>
        
        <div className="grid grid-cols-1 gap-4 mt-6">
          <button
            onClick={() => {
              setEntryMethod('MANUAL');
              setStep(2);
            }}
            className="p-6 border border-natural-border rounded-2xl hover:border-brand-500 hover:bg-brand-50/10 text-left transition-all group"
          >
            <h3 className="font-bold text-sm text-natural-text uppercase group-hover:text-brand-600">Manual Entry</h3>
            <p className="text-xs text-natural-muted mt-1 font-medium">Enter food details manually.</p>
          </button>

          <button
            onClick={() => {
              setEntryMethod('AI_ASSISTED');
              setStep(1);
            }}
            className="p-6 border border-natural-border rounded-2xl hover:border-brand-500 hover:bg-brand-50/10 text-left transition-all group flex items-start justify-between"
          >
            <div>
              <h3 className="font-bold text-sm text-natural-text uppercase group-hover:text-brand-600">AI-Assisted Entry</h3>
              <p className="text-xs text-natural-muted mt-1 font-medium">Capture or upload a food photo and let AI help fill the details.</p>
            </div>
            <Sparkles className="w-5 h-5 text-brand-550 shrink-0 ml-4 mt-1" />
          </button>
        </div>

        <button
          onClick={() => navigate('/provider/dashboard')}
          className="mt-6 inline-flex items-center text-[10px] font-bold text-brand-500 hover:text-brand-700 transition-colors gap-1 uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to surplus ledger
        </button>
      </div>
    );
  }

  // STEP 1: AI Photo Upload / Capture Interface
  if (entryMethod === 'AI_ASSISTED' && step === 1) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center text-left">
          <button
            onClick={() => setEntryMethod(null)}
            className="inline-flex items-center text-[10px] font-bold text-brand-500 hover:text-brand-700 transition-colors gap-1 uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to method choice
          </button>
        </div>

        <div className="bg-white border border-natural-border rounded-2xl shadow-xs p-6 text-center space-y-6">
          <div className="text-left border-b border-natural-border pb-4">
            <h3 className="font-display font-black text-natural-text tracking-tight uppercase flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-brand-550" /> AI-Assisted Food Entry
            </h3>
            <p className="text-xs text-natural-muted mt-1 font-semibold">Upload or capture a clear photo of the prepared surplus food listing.</p>
          </div>

          {!imagePreviewUrl ? (
            <div className="grid grid-cols-2 gap-4">
              <label className="p-8 border-2 border-dashed border-natural-border rounded-2xl hover:border-brand-500 hover:bg-brand-50/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Camera className="w-8 h-8 text-natural-muted mb-2.5" />
                <span className="text-[10px] font-black text-natural-text uppercase tracking-wider">Capture Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <label className="p-8 border-2 border-dashed border-natural-border rounded-2xl hover:border-brand-500 hover:bg-brand-50/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Upload className="w-8 h-8 text-natural-muted mb-2.5" />
                <span className="text-[10px] font-black text-natural-text uppercase tracking-wider">Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-natural-border">
                <img
                  src={imagePreviewUrl}
                  alt="Food listing preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-650 hover:bg-red-50 text-[10px] font-bold uppercase rounded-lg tracking-wider transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 border border-natural-border text-natural-text hover:bg-natural-hover text-[10px] font-bold uppercase rounded-lg tracking-wider cursor-pointer transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleAnalyzeFood}
                disabled={analyzing}
                className="w-full btn-primary flex justify-center items-center gap-2 mt-4"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Image...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Analyze Food Details
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI Confirmation screen
  if (entryMethod === 'AI_ASSISTED' && showConfirmation) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white border border-natural-border rounded-2xl shadow-xs p-6 text-center space-y-6">
          <div className="text-left border-b border-natural-border pb-4">
            <h3 className="font-display font-black text-natural-text tracking-tight uppercase flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-brand-550" /> AI Detection Results
            </h3>
            <p className="text-xs text-natural-muted mt-1 font-semibold">The AI has analyzed your food photo.</p>
          </div>

          <div className="space-y-4 text-left">
            <div className="p-4 bg-brand-50/20 border border-brand-100 rounded-xl space-y-2 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-natural-muted">Suggested Food Name:</span>
                <span className="font-bold text-natural-text">{foodName || "Not detected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-natural-muted">Suggested Food Type:</span>
                <span className="font-bold text-natural-text">{foodType || "Not detected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-natural-muted">Suggested Category:</span>
                <span className="font-bold text-natural-text">{category || "Not detected"}</span>
              </div>
              {description && (
                <div className="flex flex-col border-t border-brand-100/50 pt-2 mt-2">
                  <span className="text-natural-muted">Description:</span>
                  <span className="font-normal text-natural-text mt-1">{description}</span>
                </div>
              )}
              {aiConfidence !== null && (
                <div className="flex justify-between border-t border-brand-100/50 pt-2 mt-2">
                  <span className="text-natural-muted">AI Confidence:</span>
                  <span className="font-bold text-brand-700">{(aiConfidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setStep(2);
                }}
                className="w-full btn-primary py-2.5 text-xs font-bold"
              >
                Accept & Continue
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setStep(2);
                }}
                className="w-full btn-secondary py-2.5 text-xs font-bold"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Fill Form (Common for Manual and Review AI Suggestions)
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center text-left">
        <button
          onClick={() => {
            setEntryMethod(null);
            setStep(0);
            handleRemovePhoto();
          }}
          className="inline-flex items-center text-[10px] font-bold text-brand-500 hover:text-brand-700 transition-colors gap-1 uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to method choice
        </button>
      </div>

      <div className="bg-white border border-natural-border rounded-2xl shadow-xs p-6 md:p-8">
        <div className="border-b border-natural-border pb-5 mb-6 text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-black text-natural-text tracking-tight uppercase flex items-center gap-2">
              {entryMethod === 'AI_ASSISTED' && <Sparkles className="w-5 h-5 text-brand-550" />}
              {entryMethod === 'AI_ASSISTED' ? 'Review AI Surplus Declaration' : 'Declare Kitchen Surplus'}
            </h2>
            <p className="text-xs text-natural-muted mt-1 font-semibold">
              {entryMethod === 'AI_ASSISTED' 
                ? 'Check the AI suggested fields below, complete the required details, and publish.' 
                : 'Specify detailed food categories, allergens, and coordinate directions for pickups.'}
            </p>
          </div>
          {entryMethod === 'AI_ASSISTED' && (
            <span className="self-start md:self-center text-[9px] font-bold bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 rounded-full uppercase tracking-wider">
              AI-Assisted Entry Mode
            </span>
          )}
        </div>

        {aiError && (
          <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700 flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-orange-650" />
            <span className="font-semibold">{aiError}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-650 flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-650" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {entryMethod === 'AI_ASSISTED' && aiConfidence !== null && (
          <div className="mb-6 p-4 rounded-xl bg-brand-50 border border-brand-100 text-xs text-brand-850 flex items-start space-x-2 text-left font-semibold">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-brand-650 animate-pulse" />
            <span>
              AI Suggested Details (Confidence: <span className="font-bold text-brand-705">{(aiConfidence * 100).toFixed(0)}%</span> via {aiSource}). Feel free to review or override any field.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {entryMethod === 'AI_ASSISTED' && imagePreviewUrl && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Surplus Food Photo</label>
              <div className="relative max-w-sm aspect-video rounded-xl overflow-hidden border border-natural-border">
                <img
                  src={imagePreviewUrl}
                  alt="Food surplus"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Section 1: Food details */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">1. Surplus Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Food Description Name</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.foodName && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => {
                    setFoodName(e.target.value);
                    if (aiSuggestedFields.foodName) {
                      setAiSuggestedFields(prev => ({ ...prev, foodName: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. Mixed Veg curry & parotas"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Category Class</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.category && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as any);
                    if (aiSuggestedFields.category) {
                      setAiSuggestedFields(prev => ({ ...prev, category: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                >
                  <option value="VEG">Vegetarian (VEG)</option>
                  <option value="NON_VEG">Non-Vegetarian (NON-VEG)</option>
                  <option value="EGG">Egg (EGG)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Food Type</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.foodType && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <input
                  type="text"
                  value={foodType}
                  onChange={(e) => {
                    setFoodType(e.target.value);
                    if (aiSuggestedFields.foodType) {
                      setAiSuggestedFields(prev => ({ ...prev, foodType: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. Vegetarian, Non-Vegetarian, Vegan, Egg"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Description</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.description && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (aiSuggestedFields.description) {
                      setAiSuggestedFields(prev => ({ ...prev, description: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. Freshly cooked white rice with mixed vegetables"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Meals Count Quantity</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.quantity && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value === '' ? '' : Number(e.target.value));
                    if (aiSuggestedFields.quantity) {
                      setAiSuggestedFields(prev => ({ ...prev, quantity: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. 25"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Counting Unit</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.unit && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value as 'MEALS' | 'KG');
                    if (aiSuggestedFields.unit) {
                      setAiSuggestedFields(prev => ({ ...prev, unit: false }));
                    }
                  }}
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
                <div className="flex items-center gap-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted">Safe Consumption Window (Hours)</label>
                  {entryMethod === 'AI_ASSISTED' && aiSuggestedFields.safeConsumptionHours && (
                    <span className="text-[8px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">AI Suggested</span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="12"
                  value={safeConsumptionHrs}
                  onChange={(e) => {
                    setSafeConsumptionHrs(e.target.value === '' ? '' : Number(e.target.value));
                    if (aiSuggestedFields.safeConsumptionHours) {
                      setAiSuggestedFields(prev => ({ ...prev, safeConsumptionHours: false }));
                    }
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="E.g. 3"
                />
              </div>
            </div>

            {/* Calculations Preview Panel */}
            {safeConsumptionHrs !== '' && (
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
                    {new Date(new Date(prepTime).getTime() + Number(safeConsumptionHrs) * 60 * 60 * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-brand-100/50 pt-1.5 mt-1.5 text-[11px]">
                  <span>Effective Availability Bounds:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-100">
                    From: {distributionSession === 'AFTERNOON' ? '1:00 PM' : '8:00 PM'} | Until: MIN(Session End, Food Expiry)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Target Community Zone */}
          <div className="space-y-4 pt-4 border-t border-natural-border">
            <h3 className="font-bold text-xs uppercase tracking-wider text-natural-text">3. Target Community Zone</h3>
            
            {latitude !== null && filteredZones.length === 0 ? (
              <div className="bg-[#FAF9F5] border border-brand-100 p-4 rounded-xl space-y-3 text-left">
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
              onClick={() => {
                setEntryMethod(null);
                setStep(0);
                handleRemovePhoto();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Publishing...' : 'Confirm & Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
