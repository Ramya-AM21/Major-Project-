import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import {
  MapPin, ClipboardList, CheckCircle2, AlertTriangle, Clock, RefreshCw, Upload,
  PlusCircle, ShieldCheck, UserCheck, Check, Trash2, ShieldAlert, Loader2
} from 'lucide-react';
import axios from 'axios';

interface Shelter {
  id: string;
  name: string;
  shelterType: string;
  city: string;
  area: string;
  address: string;
  contactName: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
  documentUrl?: string;
  verificationStatus: string;
  rejectionReason?: string;
}

interface FoodRequirement {
  id: string;
  shelter: Shelter;
  foodType: string;
  quantityRequired: number;
  unit: string;
  peopleToServe: number;
  requiredDate: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  priority: string;
  status: string;
  instructions?: string;
  accessibilityInfo?: string;
  emergencyNotes?: string;
}

interface DeliveryAssignment {
  id: string;
  foodRequirement: FoodRequirement;
  volunteer: {
    id: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
  assignedAt: string;
  status: string;
  otp: string;
  expectedDeliveryTime?: string;
  photoUrl?: string;
  photoTimestamp?: string;
  photoLatitude?: number;
  photoLongitude?: number;
  actualDeliveredQuantity?: number;
  quantityReason?: string;
  representativeName?: string;
  representativePhone?: string;
  confirmationTimestamp?: string;
  digitalSignature?: string;
  arrivalTimestamp?: string;
  completedAt?: string;
}

export const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'ADD_SHELTER' | 'ADD_REQUIREMENT'>('MONITOR');
  
  // Data lists
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [requirements, setRequirements] = useState<FoodRequirement[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form: Shelter
  const [shelterName, setShelterName] = useState('');
  const [shelterType, setShelterType] = useState('NGO');
  const [shelterCity, setShelterCity] = useState('Bengaluru');
  const [shelterArea, setShelterArea] = useState('');
  const [shelterAddress, setShelterAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shelterSubmitting, setShelterSubmitting] = useState(false);
  const [shelterMessage, setShelterMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form: Requirement
  const [selectedShelterId, setSelectedShelterId] = useState('');
  const [foodType, setFoodType] = useState('');
  const [qtyRequired, setQtyRequired] = useState(10);
  const [unit, setUnit] = useState('MEALS');
  const [peopleToServe, setPeopleToServe] = useState(10);
  const [additionalReqs, setAdditionalReqs] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('14:00');
  const [priority, setPriority] = useState('MEDIUM');
  const [instructions, setInstructions] = useState('');
  const [accessibilityInfo, setAccessibilityInfo] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqMessage, setReqMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sheltersRes, reqsRes, deliveriesRes] = await Promise.all([
        axios.get('/api/v1/coordinator/shelters'),
        axios.get('/api/v1/coordinator/requirements'),
        axios.get('/api/v1/coordinator/deliveries')
      ]);
      setShelters(sheltersRes.data || []);
      setRequirements(reqsRes.data || []);
      setDeliveries(deliveriesRes.data || []);
    } catch (e) {
      console.error("Failed to load coordinator data context", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          alert("Could not fetch GPS coords: " + error.message);
        }
      );
    } else {
      alert("Browser location services not supported.");
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleShelterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShelterSubmitting(true);
    setShelterMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", shelterName);
      formData.append("shelterType", shelterType);
      formData.append("city", shelterCity);
      formData.append("area", shelterArea);
      formData.append("address", shelterAddress);
      formData.append("contactName", contactName);
      formData.append("contactPhone", contactPhone);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await axios.post('/api/v1/coordinator/shelters', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShelterMessage({ type: 'success', text: 'Shelter added successfully and submitted for Admin verification!' });
      
      // Reset form
      setShelterName('');
      setShelterArea('');
      setShelterAddress('');
      setContactName('');
      setContactPhone('');
      setSelectedFile(null);
      
      fetchData();
      setTimeout(() => setActiveTab('MONITOR'), 1500);
    } catch (error: any) {
      setShelterMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit shelter verification. Make sure proof file is uploaded.' 
      });
    } finally {
      setShelterSubmitting(false);
    }
  };

  const handleRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShelterId) {
      alert("Please select a registered shelter.");
      return;
    }
    setReqSubmitting(true);
    setReqMessage(null);

    try {
      const reqDateStr = requiredDate ? new Date(requiredDate).toISOString() : new Date().toISOString();
      const payload = {
        shelterId: selectedShelterId,
        foodType,
        quantityRequired: qtyRequired,
        unit,
        peopleToServe,
        additionalRequirements: additionalReqs,
        dietaryNotes,
        requiredDate: reqDateStr,
        deliveryStartTime: startTime,
        deliveryEndTime: endTime,
        priority,
        instructions,
        accessibilityInfo,
        emergencyNotes
      };

      await axios.post('/api/v1/coordinator/requirements', payload);

      setReqMessage({ type: 'success', text: 'Food requirement posted successfully!' });
      
      // Reset form
      setFoodType('');
      setQtyRequired(10);
      setPeopleToServe(10);
      setAdditionalReqs('');
      setDietaryNotes('');
      setRequiredDate('');
      setInstructions('');
      setAccessibilityInfo('');
      setEmergencyNotes('');

      fetchData();
      setTimeout(() => setActiveTab('MONITOR'), 1500);
    } catch (error: any) {
      setReqMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to create food requirement.' 
      });
    } finally {
      setReqSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-emerald-50 text-emerald-800 border-emerald-250';
      case 'PENDING_VERIFICATION': return 'bg-amber-50 text-amber-800 border-amber-250';
      case 'REJECTED': return 'bg-rose-50 text-rose-800 border-rose-250';
      case 'FULFILLED':
      case 'DELIVERED': return 'bg-blue-50 text-blue-800 border-blue-250';
      case 'EXPIRED': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-natural-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-natural-text flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-brand-650" />
            Coordinator Control Panel
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name || 'Coordinator'}. Setup verified need centers, post food targets, and monitor real-time handovers.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('ADD_SHELTER')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 flex items-center gap-1.5 border ${
              activeTab === 'ADD_SHELTER' 
                ? 'bg-brand-650 text-white border-brand-650 shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Shelter
          </button>
          <button 
            disabled={shelters.filter(s => s.verificationStatus === 'VERIFIED').length === 0}
            onClick={() => setActiveTab('ADD_REQUIREMENT')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 flex items-center gap-1.5 border ${
              activeTab === 'ADD_REQUIREMENT' 
                ? 'bg-brand-650 text-white border-brand-650 shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Post Requirement
          </button>
          <button 
            onClick={fetchData}
            className="p-2 border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-600 transition"
            title="Refresh statistics"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-150 ${
              activeTab === 'MONITOR'
                ? 'border-brand-650 text-brand-650 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Monitoring & Handover Log
          </button>
          <button
            onClick={() => setActiveTab('ADD_SHELTER')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-150 ${
              activeTab === 'ADD_SHELTER'
                ? 'border-brand-650 text-brand-650 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Registered Need Locations ({shelters.length})
          </button>
        </nav>
      </div>

      {/* Main View Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-150">
          <Loader2 className="w-8 h-8 text-brand-650 animate-spin" />
          <span className="text-sm font-semibold text-gray-500 mt-2">Retrieving coordinator contexts...</span>
        </div>
      ) : activeTab === 'MONITOR' ? (
        <div className="space-y-6">
          
          {/* Active Requirements List */}
          <div className="bg-white rounded-2xl border border-natural-border shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-natural-text text-base">Shelter Food Requirements</h3>
                <p className="text-xs text-gray-500">Trace the distribution lifecycle from coordinator post to volunteer delivery completion.</p>
              </div>
            </div>

            {requirements.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No food requirements created. Post a requirement to start routing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase font-bold tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="px-6 py-4">Shelter</th>
                      <th className="px-6 py-4">Food Request</th>
                      <th className="px-6 py-4">Required Date</th>
                      <th className="px-6 py-4">Time Window</th>
                      <th className="px-6 py-4 text-center">Shelter Verification</th>
                      <th className="px-6 py-4 text-center">Requirement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {requirements.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-medium text-natural-text">
                          <div>{req.shelter.name}</div>
                          <div className="text-xs font-normal text-gray-400 flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {req.shelter.area}, {req.shelter.city}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-natural-text">{req.quantityRequired} {req.unit}</span>
                          <div className="text-xs text-gray-400 mt-0.5">{req.foodType} ({req.peopleToServe} people)</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {new Date(req.requiredDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {req.deliveryStartTime} - {req.deliveryEndTime}
                          <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] border font-black ${getPriorityColor(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.shelter.verificationStatus)}`}>
                            {req.shelter.verificationStatus === 'VERIFIED' ? <ShieldCheck className="w-3.5 h-3.5" /> : null}
                            {req.shelter.verificationStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delivery & Handover Log */}
          <div className="bg-white rounded-2xl border border-natural-border shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-natural-text text-base">Active Handover Monitor</h3>
              <p className="text-xs text-gray-500">Track volunteers delivering food to your need centers, check evidence, and verify quantities.</p>
            </div>

            {deliveries.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No active delivery assignments found.
              </div>
            ) : (
              <div className="space-y-4 p-5">
                {deliveries.map((del) => (
                  <div key={del.id} className="border border-gray-150 rounded-xl p-5 hover:shadow-xs transition duration-200 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                      <div>
                        <h4 className="font-bold text-sm text-natural-text">{del.foodRequirement.shelter.name}</h4>
                        <span className="text-xs text-gray-400 font-mono">Assignment ID: {del.id.substring(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-650 bg-brand-50 px-2.5 py-1 rounded border border-brand-200">
                          Handover OTP: {del.otp}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(del.status)}`}>
                          {del.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Volunteer details */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Volunteer Details</span>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800">{del.volunteer.user.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{del.volunteer.user.email}</p>
                          <p className="text-xs text-gray-500">{del.volunteer.user.phone}</p>
                          <p className="text-xs text-gray-400 mt-2">Claimed: {new Date(del.assignedAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Requirement & Delivered quantities */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quantity Handover Audit</span>
                        <div className="text-sm space-y-1">
                          <p className="text-gray-700">Target Required: <span className="font-bold">{del.foodRequirement.quantityRequired} {del.foodRequirement.unit}</span></p>
                          <p className="text-gray-700">Actual Handed Over: <span className="font-bold text-brand-700">{del.actualDeliveredQuantity !== null ? `${del.actualDeliveredQuantity} ${del.foodRequirement.unit}` : 'Pending dropoff'}</span></p>
                          
                          {del.quantityReason && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2 rounded text-xs mt-2">
                              <strong>Discrepancy Note:</strong> "{del.quantityReason}"
                            </div>
                          )}

                          {del.representativeName && (
                            <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-2 rounded text-xs mt-2">
                              <strong>Receipt Confirmed By:</strong> {del.representativeName} ({del.representativePhone || 'N/A'})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Proof Metadata */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Photo Evidence</span>
                        {del.photoUrl ? (
                          <div className="space-y-2">
                            <a href={del.photoUrl} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition relative group">
                              <img src={del.photoUrl} alt="Delivery proof" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition font-semibold">View Full</div>
                            </a>
                            <div className="text-xs text-gray-400 font-mono space-y-0.5">
                              <p>Geotag: {del.photoLatitude?.toFixed(5)}, {del.photoLongitude?.toFixed(5)}</p>
                              <p>Captured: {new Date(del.photoTimestamp || '').toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center text-xs text-gray-400">
                            No photo proof submitted yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'ADD_SHELTER' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Register Shelter Form */}
          <div className="bg-white p-6 rounded-2xl border border-natural-border shadow-xs">
            <h3 className="font-bold text-natural-text text-lg flex items-center gap-2 mb-4 border-b border-gray-150 pb-2">
              <PlusCircle className="w-5 h-5 text-brand-650" />
              Register Shelter / Need Location
            </h3>

            {shelterMessage && (
              <div className={`p-4 rounded-xl text-sm mb-4 border ${
                shelterMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {shelterMessage.text}
              </div>
            )}

            <form onSubmit={handleShelterSubmit} className="space-y-4 text-sm text-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Shelter / Organization Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={shelterName} 
                    onChange={e => setShelterName(e.target.value)} 
                    placeholder="e.g. Hope Orphanage Welfare"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Shelter / Center Type *</label>
                  <select 
                    value={shelterType} 
                    onChange={e => setShelterType(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  >
                    <option value="NGO">NGO Shelter</option>
                    <option value="ORPHANAGE">Orphanage</option>
                    <option value="GOVERNMENT_SHELTER">Government Shelter</option>
                    <option value="COMMUNITY_KITCHEN">Community Kitchen</option>
                    <option value="COMMUNITY_NEED_POINT">Community Need Point</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">City *</label>
                  <input 
                    type="text" 
                    required 
                    value={shelterCity} 
                    onChange={e => setShelterCity(e.target.value)} 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Area / Locality *</label>
                  <input 
                    type="text" 
                    required 
                    value={shelterArea} 
                    onChange={e => setShelterArea(e.target.value)} 
                    placeholder="e.g. Indiranagar"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Full Address *</label>
                <textarea 
                  required 
                  value={shelterAddress} 
                  onChange={e => setShelterAddress(e.target.value)} 
                  placeholder="Street details, landmarks, block numbers..."
                  rows={2}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Contact Person Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={contactName} 
                    onChange={e => setContactName(e.target.value)} 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Contact Phone Number *</label>
                  <input 
                    type="text" 
                    required 
                    value={contactPhone} 
                    onChange={e => setContactPhone(e.target.value)} 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coordinates selection */}
              <div className="border border-gray-150 p-4 rounded-xl space-y-3 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Geolocation Geotag</span>
                  <button 
                    type="button" 
                    onClick={handleGetCurrentLocation}
                    className="text-xs font-semibold text-brand-650 hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Use My Current GPS location
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-450 mb-0.5">Latitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      value={latitude} 
                      onChange={e => setLatitude(parseFloat(e.target.value))} 
                      className="w-full border border-gray-300 px-2 py-1 rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-450 mb-0.5">Longitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      value={longitude} 
                      onChange={e => setLongitude(parseFloat(e.target.value))} 
                      className="w-full border border-gray-300 px-2 py-1 rounded bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Proof File upload */}
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">
                  Verification Proof Document *
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer border border-gray-300 px-4 py-2 hover:bg-gray-50 rounded-xl transition text-xs font-semibold text-gray-700 bg-white">
                    <Upload className="w-4 h-4 text-gray-500" />
                    Choose PDF or Image
                    <input 
                      type="file" 
                      required
                      accept="application/pdf,image/*" 
                      className="hidden" 
                      onChange={e => e.target.files && setSelectedFile(e.target.files[0])}
                    />
                  </label>
                  <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                    {selectedFile ? selectedFile.name : 'No certificate selected'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Upload shelter registration license, NGO certificate, NGO identity proof or authorization letter to get verified.
                </p>
              </div>

              <button
                type="submit"
                disabled={shelterSubmitting}
                className="w-full bg-brand-650 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {shelterSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Shelter Info...
                  </>
                ) : 'Submit Shelter registration'}
              </button>
            </form>
          </div>

          {/* Location picker map and registered list */}
          <div className="space-y-6">
            
            {/* Map Picker container */}
            <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs flex flex-col h-80">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Location Map Geotagger</span>
              <div className="flex-1 min-h-0">
                <MapView 
                  center={[latitude, longitude]} 
                  zoom={14} 
                  interactive={true} 
                  markers={[{
                    id: 'current-selector',
                    latitude,
                    longitude,
                    title: 'Selected Shelter Geotag',
                    role: 'ZONE'
                  }]}
                  onLocationSelect={handleLocationSelect} 
                />
              </div>
            </div>

            {/* List of coordinator's registered shelters */}
            <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
              <h4 className="font-bold text-sm text-natural-text mb-3">Registered Centers Status</h4>
              <div className="space-y-3">
                {shelters.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-6">
                    No shelters registered under your coordinator profile yet.
                  </div>
                ) : (
                  shelters.map((s) => (
                    <div key={s.id} className="border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-800">{s.name}</div>
                        <div className="text-gray-400 font-mono text-[10px] mt-0.5">{s.area}, {s.city} ({s.shelterType})</div>
                        {s.rejectionReason && (
                          <div className="text-rose-600 bg-rose-50 border border-rose-100 p-1.5 rounded mt-1.5 text-[10px]">
                            <strong>Rejected:</strong> {s.rejectionReason}
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold border text-[10px] ${getStatusColor(s.verificationStatus)}`}>
                        {s.verificationStatus}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ADD REQUIREMENT TAB */
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-natural-border shadow-xs">
          <h3 className="font-bold text-natural-text text-lg flex items-center gap-2 mb-4 border-b border-gray-150 pb-2">
            <PlusCircle className="w-5 h-5 text-brand-650" />
            Post Shelter Food Requirement
          </h3>

          {reqMessage && (
            <div className={`p-4 rounded-xl text-sm mb-4 border ${
              reqMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {reqMessage.text}
            </div>
          )}

          <form onSubmit={handleRequirementSubmit} className="space-y-4 text-sm text-gray-700">
            <div>
              <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Target Shelter *</label>
              <select 
                required
                value={selectedShelterId} 
                onChange={e => setSelectedShelterId(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
              >
                <option value="">-- Choose Registered Center --</option>
                {shelters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.area}, {s.city}) - [{s.verificationStatus}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Food Details / Type *</label>
                <input 
                  type="text" 
                  required 
                  value={foodType} 
                  onChange={e => setFoodType(e.target.value)} 
                  placeholder="e.g. Cooked Rice & Dal, Fruit packets"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Quantity *</label>
                  <input 
                    type="number" 
                    required 
                    value={qtyRequired} 
                    onChange={e => setQtyRequired(parseFloat(e.target.value))} 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Unit *</label>
                  <select 
                    value={unit} 
                    onChange={e => setUnit(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                  >
                    <option value="MEALS">Meals</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="PACKETS">Packets</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">People to Serve *</label>
                <input 
                  type="number" 
                  required 
                  value={peopleToServe} 
                  onChange={e => setPeopleToServe(parseInt(e.target.value))} 
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Required Date *</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={requiredDate} 
                  onChange={e => setRequiredDate(e.target.value)} 
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Start Time *</label>
                <input 
                  type="text" 
                  required 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                  placeholder="12:00"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">End Time *</label>
                <input 
                  type="text" 
                  required 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                  placeholder="14:00"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Priority *</label>
                <select 
                  value={priority} 
                  onChange={e => setPriority(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Dietary Notes</label>
                <input 
                  type="text" 
                  value={dietaryNotes} 
                  onChange={e => setDietaryNotes(e.target.value)} 
                  placeholder="e.g. Vegetarian only, low spice"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Additional Food requirements</label>
                <input 
                  type="text" 
                  value={additionalReqs} 
                  onChange={e => setAdditionalReqs(e.target.value)} 
                  placeholder="e.g. Need spoons, paper napkins"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Instructions for Volunteer</label>
              <textarea 
                value={instructions} 
                onChange={e => setInstructions(e.target.value)} 
                placeholder="Where to enter, whom to contact at arrival, gate details..."
                rows={2}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Accessibility Information</label>
                <input 
                  type="text" 
                  value={accessibilityInfo} 
                  onChange={e => setAccessibilityInfo(e.target.value)} 
                  placeholder="e.g. Ground floor entry, ramp available"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs uppercase tracking-wider text-gray-500">Emergency Handover Notes</label>
                <input 
                  type="text" 
                  value={emergencyNotes} 
                  onChange={e => setEmergencyNotes(e.target.value)} 
                  placeholder="Contact alternate number 987654..."
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={reqSubmitting}
              className="w-full bg-brand-650 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {reqSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Requirement...
                </>
              ) : 'Post Requirement'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
