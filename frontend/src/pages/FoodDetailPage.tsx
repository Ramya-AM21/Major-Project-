import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { ArrowLeft, Clock, MapPin, User, ChevronRight, HelpCircle } from 'lucide-react';
import axios from 'axios';

interface FoodListing {
  id: string;
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  preparationTime: string;
  expiryTime: string;
  status: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  provider: {
    businessName: string;
    licenseNumber: string;
  };
}

interface DeliveryTask {
  id: string;
  status: string;
  routeDistance: number;
  routeDeviation: number;
  matchingScore: number;
  volunteer?: {
    user: {
      name: string;
      phoneNumber: string;
    };
  };
  zone?: {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface Verification {
  pickupOtp?: string;
  deliveryOtp?: string;
  pickupTimestamp?: string;
  deliveryTimestamp?: string;
  verificationConfidence?: number;
  deliveryRadiusVerified?: boolean;
}

export const FoodDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<FoodListing | null>(null);
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);

  // Time ticker
  const [nowTime, setNowTime] = useState(new Date());

  const fetchDetails = async () => {
    try {
      const listingRes = await axios.get(`/api/v1/food/${id}`);
      setListing(listingRes.data);

      // Check if task exists for this listing
      const allTasks = await axios.get('/api/v1/tasks');
      const matchedTask = allTasks.data.find((t: any) => t.foodListing?.id === id);
      
      if (matchedTask) {
        setTask(matchedTask);
        // Load verification details
        try {
          const verRes = await axios.get(`/api/v1/verification/task/${matchedTask.id}`);
          setVerification(verRes.data);
        } catch {
          console.log("No verification record yet");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
        <span className="text-xs font-semibold">Loading surplus history...</span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-sm font-semibold">Listing record not found.</p>
        <Link to="/provider/dashboard" className="text-xs text-brand-605 font-bold hover:underline">
          Back to console
        </Link>
      </div>
    );
  }

  // Timer values
  const diff = new Date(listing.expiryTime).getTime() - nowTime.getTime();
  const isExpired = diff <= 0;
  const getTimerString = () => {
    if (isExpired) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Determine timeline step index (0 to 5)
  const getTimelineStep = () => {
    const s = listing.status;
    if (s === 'EXPIRED') return -1;
    if (s === 'CANCELLED') return -2;
    if (s === 'AVAILABLE') return 0;
    if (s === 'MATCHED') return 1;
    if (s === 'IN_TRANSIT') return 2;
    if (s === 'DELIVERED' || s === 'COMPLETED') {
      if (verification?.deliveryTimestamp) return 4;
      return 3; // Delivered but verification confidence still completing
    }
    return 0;
  };

  const currentStep = getTimelineStep();
  const stages = [
    { label: 'Published', desc: 'Listing is public' },
    { label: 'Matched', desc: 'Volunteer assigned' },
    { label: 'Picked Up', desc: 'OTP code verified' },
    { label: 'In Transit', desc: 'Delivery in flight' },
    { label: 'Delivered', desc: 'Reached zone' },
    { label: 'Verified', desc: 'GPS radius cleared' }
  ];

  // Map markers compile
  const mapMarkers: any[] = [
    {
      id: 'pickup',
      latitude: listing.pickupLatitude,
      longitude: listing.pickupLongitude,
      title: listing.provider.businessName,
      description: 'Surplus ready at provider location',
      role: 'PROVIDER' as const
    }
  ];

  if (task && task.zone) {
    mapMarkers.push({
      id: 'delivery',
      latitude: task.zone.latitude,
      longitude: task.zone.longitude,
      title: task.zone.name,
      description: task.zone.address,
      role: 'ZONE' as const
    });
  }

  const mapPolyline: [number, number][] = (task && task.zone) ? [
    [listing.pickupLatitude, listing.pickupLongitude],
    [task.zone.latitude, task.zone.longitude]
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation header */}
      <div className="flex items-center">
        <Link
          to="/provider/dashboard"
          className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" /> Back to surplus ledger
        </Link>
      </div>

      {/* Main card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left pane: Details and Timeline */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 text-left">
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                listing.category === 'VEG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {listing.category}
              </span>
              <h2 className="text-xl font-display font-extrabold text-gray-900 tracking-tight mt-1">
                {listing.foodName}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Quantity</span>
              <span className="font-display font-black text-gray-950">{listing.quantity} {listing.unit}</span>
            </div>
          </div>

          {/* Expiry Bar */}
          <div className="p-4 bg-brand-50/40 border border-brand-100 rounded-xl flex items-center justify-between">
            <span className="text-xs text-brand-850 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Consumable Safety Timer
            </span>
            <span className={`text-sm font-mono font-black py-0.5 px-3 rounded-full ${
              isExpired ? 'bg-red-100 text-red-800' : 'bg-brand-100 text-brand-900'
            }`}>
              {getTimerString()}
            </span>
          </div>

          {/* Timeline workflow details */}
          <div className="space-y-4 pt-4 border-t border-gray-150">
            <h3 className="font-display font-semibold text-sm text-gray-901">Redistribution Timeline</h3>
            
            {currentStep < 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-750 font-medium">
                {currentStep === -1 ? 'This surplus listing expired before a volunteer matched.' : 'This surplus listing was cancelled.'}
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-gray-150">
                {stages.map((st, idx) => {
                  const done = idx <= currentStep;
                  return (
                    <div key={st.label} className="relative flex items-start text-left">
                      <div className={`absolute top-0.5 -left-[20px] w-[11px] h-[11px] rounded-full border-2 transition-all ${
                        done ? 'bg-brand-600 border-white ring-2 ring-brand-200' : 'bg-white border-gray-300'
                      }`}></div>
                      <div>
                        <h4 className={`text-xs font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {st.label}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coordination Details */}
          {task && (
            <div className="space-y-4 pt-4 border-t border-gray-150">
              <h3 className="font-display font-semibold text-sm text-gray-901">Matching Coordination</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-405 font-bold block uppercase tracking-wider">Matched Volunteer</span>
                  <span className="font-semibold text-gray-900 mt-1 block">
                    {task.volunteer ? task.volunteer.user.name : 'Rahul Sharma'}
                  </span>
                  <span className="text-gray-400 block mt-0.5">
                    {task.volunteer ? task.volunteer.user.phoneNumber : '9876543210'}
                  </span>
                </div>

                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-405 font-bold block uppercase tracking-wider">Drop Shelter Zone</span>
                  <span className="font-semibold text-gray-900 mt-1 block">
                    {task.zone ? task.zone.name : 'Central Community Zone'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed truncate">
                    {task.zone ? task.zone.address : 'Cubbon Road Shelter'}
                  </p>
                </div>
              </div>

              {/* OTP presentation for Provider screen */}
              {verification?.pickupOtp && listing.status === 'AVAILABLE' && (
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-700 block">Pickup Security OTP</span>
                  <span className="text-xl font-mono font-black text-brand-900 tracking-widest mt-1 block">
                    {verification.pickupOtp}
                  </span>
                  <span className="text-[10px] text-brand-700 block mt-1">
                    Provide this code to the volunteer upon hand-off.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right pane: Map View and details */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Map */}
          <div className="h-72 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden p-3 flex-1">
            <MapView
              markers={mapMarkers}
              polylinePoints={mapPolyline}
              interactive={false}
            />
          </div>

          {/* Audit parameters */}
          {verification?.deliveryTimestamp && (
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-left text-xs space-y-3">
              <span className="font-bold text-gray-900 block">Verification Audit Ledger</span>
              <div className="space-y-1.5 font-medium text-gray-600">
                <div className="flex justify-between">
                  <span>OTP Check:</span>
                  <span className="text-green-700 font-bold">Passed</span>
                </div>
                <div className="flex justify-between">
                  <span>GPS Radius Check:</span>
                  <span className={verification.deliveryRadiusVerified ? 'text-green-700 font-bold' : 'text-amber-700'}>
                    {verification.deliveryRadiusVerified ? 'Radius Verified (< 250m)' : 'Flagged Anomaly (> 250m)'}
                  </span>
                </div>
                {verification.verificationConfidence && (
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5">
                    <span>Audit Confidence:</span>
                    <span className="font-extrabold text-gray-900">
                      {Math.round(verification.verificationConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
