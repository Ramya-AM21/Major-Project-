import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Heart, 
  PlusCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  Package, 
  XCircle,
  Truck
} from 'lucide-react';

interface FoodListing {
  id: string;
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  allergens?: string;
  preparationTime: string;
  expiryTime: string;
  safeConsumptionHours?: number;
  imageUrl?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAddress?: string;
  status: string; // DRAFT, SCHEDULED, AVAILABLE, ACCEPTED, PICKED_UP, IN_TRANSIT, DELIVERED, EXPIRED, CANCELLED
  createdAt: string;
  distributionSession?: string;
  donationOccasion?: string;
  description?: string;
}

export const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const fetchMyDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/food/provider');
      setListings(response.data || []);
    } catch (err: any) {
      console.error('Error fetching personal donations:', err);
      setError('Failed to load your donations. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredListings = () => {
    if (activeTab === 'ALL') return listings;
    if (activeTab === 'ACTIVE') return listings.filter(l => ['AVAILABLE', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status));
    if (activeTab === 'SCHEDULED') return listings.filter(l => l.status === 'SCHEDULED');
    if (activeTab === 'COMPLETED') return listings.filter(l => ['DELIVERED', 'COMPLETED'].includes(l.status));
    if (activeTab === 'EXPIRED') return listings.filter(l => l.status === 'EXPIRED');
    if (activeTab === 'CANCELLED') return listings.filter(l => l.status === 'CANCELLED');
    return listings;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800"><Sparkles className="w-3 h-3 mr-1" /> Available for Match</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Scheduled for Session</span>;
      case 'ACCEPTED':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Truck className="w-3 h-3 mr-1" /> Volunteer En Route</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Delivered</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700"><Clock className="w-3 h-3 mr-1" /> Expired</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatOccasion = (occasion?: string) => {
    if (!occasion) return 'Personal Gathering';
    switch (occasion) {
      case 'BIRTHDAY': return 'Birthday Celebration';
      case 'ANNIVERSARY': return 'Anniversary';
      case 'WEDDING': return 'Wedding / Function';
      case 'COLLEGE_EVENT': return 'College Event';
      case 'CORPORATE_EVENT': return 'Corporate Event';
      case 'COMMUNITY_EVENT': return 'Community Gathering';
      default: return 'Special Event';
    }
  };

  const filteredListings = getFilteredListings();

  const totalMealsDonated = listings
    .filter(l => ['DELIVERED', 'COMPLETED'].includes(l.status))
    .reduce((acc, l) => acc + (l.quantity || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left">
      
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left border-b border-natural-border pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-700 uppercase tracking-wider font-mono">
            <Heart className="w-3.5 h-3.5 text-brand-600" />
            <span>Personal Donor Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-natural-text tracking-tight uppercase">
            Welcome, {user?.name || 'Valued Donor'}
          </h1>
          <p className="text-xs text-natural-muted max-w-2xl font-semibold">
            Your celebrations bring joy to your family—and now surplus food from your events can nourish people in need through FoodBridge's verified redistribution network.
          </p>
        </div>
        <button
          onClick={() => navigate('/donor/donate')}
          className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs uppercase tracking-wider self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Donate Surplus Food</span>
        </button>
      </div>

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-natural-muted text-xs font-semibold uppercase tracking-wider font-display">
            <span>Total Donations Submitted</span>
            <Package className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-natural-text font-display">{listings.length}</div>
        </div>

        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-natural-muted text-xs font-semibold uppercase tracking-wider font-display">
            <span>Meals Successfully Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-natural-text font-display">{Math.round(totalMealsDonated)}</div>
        </div>

        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-natural-muted text-xs font-semibold uppercase tracking-wider font-display">
            <span>Active Listings</span>
            <Sparkles className="w-4 h-4 text-accent-500" />
          </div>
          <div className="text-2xl font-bold text-natural-text font-display">
            {listings.filter(l => ['AVAILABLE', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-natural-border rounded-xl shadow-sm overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="border-b border-natural-border bg-natural-bg px-4 sm:px-6 pt-4 flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'All Donations' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-850 font-extrabold'
                  : 'border-transparent text-natural-muted hover:text-natural-text hover:border-natural-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Listings List */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-natural-muted text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Fetching your donation history...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-600 text-xs flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Package className="w-10 h-10 text-natural-border mx-auto" />
              <div className="text-sm font-bold text-natural-text font-display">No personal donations yet.</div>
              <p className="text-xs text-natural-muted max-w-sm mx-auto">
                Have surplus food from a birthday, function, or event? Submit your donation and our volunteer network will collect it.
              </p>
              <button
                onClick={() => navigate('/donor/donate')}
                className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs transition-colors uppercase tracking-wider shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Donate Food Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredListings.map((item) => (
                <div key={item.id} className="border border-natural-border rounded-xl p-4 hover:border-brand-500/50 transition-all bg-white flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded border border-brand-100 font-mono">
                          {formatOccasion(item.donationOccasion)}
                        </span>
                        <h3 className="text-sm font-bold text-natural-text mt-1 font-display">{item.foodName}</h3>
                      </div>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">
                      {item.description || 'No detailed description provided.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-1">
                      <div className="flex items-center space-x-1">
                        <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{item.quantity} {item.unit} ({item.category})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Session: {item.distributionSession || 'Afternoon'}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-1 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.pickupAddress}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.status === 'AVAILABLE' && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to cancel this donation?')) {
                            try {
                              await axios.delete(`/api/v1/food/${item.id}`);
                              fetchMyDonations();
                            } catch (e) {
                              alert('Failed to cancel listing');
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Cancel Listing
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
