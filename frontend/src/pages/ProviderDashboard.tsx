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
    if (diff <= 0) return 'text-red-600 bg-red-100 font-bold';
    if (diff < 1800000) return 'text-red-700 bg-red-50 border border-red-200 animate-pulse'; // less than 30 mins
    if (diff < 7200000) return 'text-amber-800 bg-amber-100'; // less than 2 hours
    return 'text-green-800 bg-green-50';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Available</span>;
      case 'MATCHED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Awaiting Pickup</span>;
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">In Transit</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Delivered</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Expired</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-gray-900 tracking-tight">Today's Surplus Listings</h1>
          <p className="text-sm text-gray-500 mt-1">Publish and track surplus prepared items in alignment with local transit commutes</p>
        </div>
        <button
          onClick={() => navigate('/provider/food/new')}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Publish Surplus</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Listings</span>
          <h3 className="text-2xl font-display font-black text-gray-900 mt-2">{analytics.activeListingsCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Awaiting Pickup</span>
          <h3 className="text-2xl font-display font-black text-gray-900 mt-2">{analytics.awaitingPickupCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Transit</span>
          <h3 className="text-2xl font-display font-black text-gray-900 mt-2">{analytics.inTransitCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Completed</span>
          <h3 className="text-2xl font-display font-black text-gray-900 mt-2">{analytics.completedCount}</h3>
        </div>
      </div>

      {/* Environmental savings stats */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-4 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h4 className="font-display font-bold text-sm text-gray-900">Resource Savings & Ecological Impact</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-brand-50/40 rounded-xl border border-brand-100">
            <span className="text-xs text-brand-850 font-medium block">Total Meals Redirected</span>
            <span className="text-xl font-display font-extrabold text-gray-900 block mt-1">{analytics.mealsRedirected}</span>
          </div>

          <div className="p-4 bg-brand-50/40 rounded-xl border border-brand-100">
            <span className="text-xs text-brand-850 font-medium block">Food Mass Recovered (Kg)</span>
            <span className="text-xl font-display font-extrabold text-gray-900 block mt-1">{analytics.kgFoodSaved} kg</span>
          </div>

          <div className="p-4 bg-brand-50/40 rounded-xl border border-brand-100">
            <span className="text-xs text-brand-850 font-medium block">Estimated Waste Disposal Saved</span>
            <span className="text-xl font-display font-extrabold text-gray-900 block mt-1">₹ {analytics.disposalAvoidedCost}</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-150 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-gray-900">Food Inventory Ledger</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
            <span className="text-xs font-semibold">Loading surplus ledger...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-4">
            <p className="text-sm font-medium">No active donations yet. Once you publish surplus food, it will appear here.</p>
            <button
              onClick={() => navigate('/provider/food/new')}
              className="text-xs bg-brand-50 border border-brand-200 text-brand-800 font-semibold px-4 py-2 rounded-lg hover:bg-brand-100"
            >
              Post First Listing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-left">
              <thead className="bg-[#FAF9F6] text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Food Item</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Expiry Timer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm font-medium text-gray-700 bg-white">
                {listings.map((item) => {
                  const isAvailableObj = item.status === 'AVAILABLE' || item.status === 'MATCHED';
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.foodName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.category === 'VEG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">{item.quantity} {item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold ${getUrgencyColor(item.expiryTime)}`}>
                          {getCountdownString(item.expiryTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                        <Link
                          to={`/provider/food/${item.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                          title="View Progress Timeline"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </Link>
                        {isAvailableObj && (
                          <button
                            onClick={() => handleCancelListing(item.id)}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="Cancel Listing"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
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
