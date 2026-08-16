import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Eye, XCircle, Clock, CheckCircle2, TrendingUp, AlertTriangle, Trash2
} from 'lucide-react';
import axios from 'axios';

interface FoodListing {
  id: string;
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  preparationTime: string;
  expiryTime: string;
  status: 'AVAILABLE' | 'MATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED';
  pickupAddress: string;
}

export const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Analytics State
  const [analytics, setAnalytics] = useState({
    activeListingsCount: 0,
    awaitingPickupCount: 0,
    inTransitCount: 0,
    completedCount: 0,
    mealsRedirected: 0,
    kgFoodSaved: 0,
    disposalAvoidedCost: 0
  });

  // Listings State
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Expiry Countdown trigger state
  const [nowTime, setNowTime] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      axios.defaults.headers.common['Authorization'] = authHeader;

      const [analyticsRes, listingsRes] = await Promise.all([
        axios.get('/api/v1/analytics/provider'),
        axios.get('/api/v1/food/provider')
      ]);

      setAnalytics(analyticsRes.data);
      setListings(listingsRes.data);
    } catch (e) {
      console.error("Failed to load provider metrics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Trigger local countdown updates every second
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelListing = async (listingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this surplus listing? This action cannot be undone.")) return;
    try {
      await axios.delete(`/api/v1/food/${listingId}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to cancel listing. Please try again.");
    }
  };

  // Expiry timer calculations
  const getCountdownString = (expiryStr: string) => {
    const diff = new Date(expiryStr).getTime() - nowTime.getTime();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  const getUrgencyColor = (expiryStr: string) => {
    const diff = new Date(expiryStr).getTime() - nowTime.getTime();
    if (diff <= 0) return 'text-red-700 bg-red-50 border border-red-150 font-bold';
    if (diff < 1800000) return 'text-red-700 bg-red-50 border border-red-150 animate-pulse'; // less than 30 mins
    if (diff < 7200000) return 'text-amber-800 bg-amber-55/60 border border-amber-200'; // less than 2 hours
    return 'text-brand-800 bg-brand-50/50 border border-brand-150';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-brand-100 text-[9px] font-black uppercase tracking-wider bg-brand-50 text-brand-700">Available</span>;
      case 'MATCHED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-accent-200 text-[9px] font-black uppercase tracking-wider bg-accent-50 text-accent-700">Matched</span>;
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-blue-100 text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700">In Transit</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-brand-200 text-[9px] font-black uppercase tracking-wider bg-brand-100 text-brand-850">Delivered</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-red-150 text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-750">Expired</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 text-[9px] font-black uppercase tracking-wider bg-gray-50 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left border-b border-natural-border pb-5">
        <div>
          <h1 className="text-xl font-display font-black text-natural-text tracking-tight uppercase">Today's Surplus Listings</h1>
          <p className="text-xs text-natural-muted mt-1 font-semibold">Publish and track prepared food items matched to transit routes</p>
        </div>
        <button
          onClick={() => navigate('/provider/food/new')}
          className="btn-primary flex items-center justify-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Surplus</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="bg-white border border-natural-border rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-natural-border grid grid-cols-2 sm:grid-cols-4 text-left shadow-xs">
        <div className="p-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Active Listings</span>
          <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{analytics.activeListingsCount}</h3>
        </div>
        <div className="p-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Awaiting Pickup</span>
          <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{analytics.awaitingPickupCount}</h3>
        </div>
        <div className="p-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">In Transit</span>
          <h3 className="text-2xl font-mono font-black text-natural-text mt-1">{analytics.inTransitCount}</h3>
        </div>
        <div className="p-4 bg-brand-50/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-700">Total Completed</span>
          <h3 className="text-2xl font-mono font-black text-brand-650 mt-1">{analytics.completedCount}</h3>
        </div>
      </div>

      {/* Environmental savings stats */}
      <div className="bg-white border border-natural-border rounded-2xl p-5 shadow-xs text-left">
        <div className="flex items-center space-x-2 border-b border-natural-border pb-3 mb-4">
          <TrendingUp className="w-4 h-4 text-brand-650" />
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-natural-text">Platform Savings & Ecological Impact</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-850">Total Meals Redirected</span>
            <span className="text-lg font-mono font-black text-natural-text mt-1 block">{analytics.mealsRedirected}</span>
          </div>

          <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-850">Food Mass Recovered</span>
            <span className="text-lg font-mono font-black text-natural-text mt-1 block">{analytics.kgFoodSaved} kg</span>
          </div>

          <div className="p-4 bg-[#FAF9F5] rounded-xl border border-natural-border">
            <span className="text-[10px] uppercase font-bold tracking-wider text-natural-muted">Disposal Cost Avoided</span>
            <span className="text-lg font-mono font-black text-brand-650 mt-1 block">₹ {analytics.disposalAvoidedCost}</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white border border-natural-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-natural-border flex items-center justify-between bg-[#FAF9F5]">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-natural-text">Food Inventory Ledger</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2">
            <div className="w-7 h-7 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
            <span className="text-xs font-semibold">Loading surplus ledger...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-natural-muted space-y-4">
            <p className="text-xs font-bold">No active donations yet. Once you publish surplus food, it will appear here.</p>
            <button
              onClick={() => navigate('/provider/food/new')}
              className="btn-secondary normal-case text-xs"
            >
              Post First Listing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-natural-border text-left">
              <thead className="bg-[#FAF9F5] text-[10px] font-bold text-natural-muted uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Food Item</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Quantity</th>
                  <th className="px-6 py-3.5">Expiry Timer</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-border text-xs font-semibold text-natural-text bg-white">
                {listings.map((item) => {
                  const isAvailableObj = item.status === 'AVAILABLE' || item.status === 'MATCHED';
                  return (
                    <tr key={item.id} className="hover:bg-brand-50/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-natural-text">{item.foodName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wide border ${
                          item.category === 'VEG' 
                            ? 'bg-brand-50 text-brand-700 border-brand-100' 
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{item.quantity} {item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${getUrgencyColor(item.expiryTime)}`}>
                          {getCountdownString(item.expiryTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                        <Link
                          to={`/provider/food/${item.id}`}
                          className="p-1.5 text-natural-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all border border-transparent hover:border-brand-100 bg-white"
                          title="View Progress Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isAvailableObj && (
                          <button
                            onClick={() => handleCancelListing(item.id)}
                            className="p-1.5 text-red-400 hover:text-red-750 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 bg-white"
                            title="Cancel Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
