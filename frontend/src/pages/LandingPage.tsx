import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Utensils, Shield, Heart, ArrowRight, CheckCircle2, ChevronRight, BarChart3, Route } from 'lucide-react';
import axios from 'axios';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeDonations: 4,
    activeDeliveries: 2,
    volunteersOnline: 6,
    totalKgSaved: 450,
    totalMealsDelivered: 1120
  });

  useEffect(() => {
    // Attempt to load live aggregated metrics, fallback to seeded defaults
    axios.get('/api/v1/analytics/admin/summary')
      .then(res => {
        if (res.data) {
          setStats(prev => ({
            ...prev,
            activeDonations: res.data.activeDonations || prev.activeDonations,
            activeDeliveries: res.data.activeDeliveries || prev.activeDeliveries,
            volunteersOnline: res.data.volunteersOnline || prev.volunteersOnline,
            totalKgSaved: res.data.totalKgSaved || prev.totalKgSaved,
            totalMealsDelivered: res.data.totalMealsDelivered || prev.totalMealsDelivered,
          }));
        }
      })
      .catch(() => {
        console.log("Using seeded layout statistics for landing page");
      });
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'PROVIDER': return '/provider/dashboard';
      case 'VOLUNTEER': return '/volunteer/dashboard';
      case 'COORDINATOR': return '/coordinator/dashboard';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/login';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-gray-800">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-150 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg select-none">
              E
            </span>
            <span className="font-display font-extrabold text-gray-900 tracking-tight text-lg">E-Meal Logistics</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-brand-650 transition-colors">How It Works</a>
            <a href="#impact" className="hover:text-brand-650 transition-colors">Platform Impact</a>
            <a href="#features" className="hover:text-brand-650 transition-colors">Core Features</a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="bg-brand-600 text-white hover:bg-brand-700 font-medium text-sm px-5 py-2 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
              >
                <span>Console Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                  Sign In
                </Link>
                <Link
                  to="/login?register=true"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-5 py-2 rounded-xl transition-all shadow-sm"
                >
                  Join Platform
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6 text-left">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-100/60 text-brand-800 text-xs font-semibold">
            <Route className="w-3.5 h-3.5" />
            <span>Route-Aware Waste Mitigation Platform</span>
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-gray-900 tracking-tight leading-[1.1]">
            Turn surplus food into <span className="text-brand-600">shared meals</span>.
          </h1>
          <p className="text-lg text-gray-650 font-normal leading-relaxed">
            A route-aware redistribution network connecting surplus food providers, city commutants, and high-demand community receiving shelters automatically to prevent food waste.
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
            <button
              onClick={() => navigate(isAuthenticated ? getDashboardPath() : '/login?register=true')}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-base"
            >
              <span>Start Redistributing</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#how-it-works"
              className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3.5 rounded-xl transition-all shadow-sm text-center text-base"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="lg:col-span-6 relative flex justify-center">
          <div className="w-full max-w-md aspect-square bg-white border border-gray-200 rounded-2xl shadow-xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-brand-400 to-brand-605"></div>
            
            {/* Visual simulation representation of commute-matching */}
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="bg-brand-50 border border-brand-200/80 p-4 rounded-xl relative">
                <span className="absolute top-2 right-2 text-[10px] bg-brand-200 text-brand-850 px-2 py-0.5 rounded-full font-bold">PROVIDER</span>
                <h5 className="font-semibold text-sm text-gray-800">Green Bowl Kitchen</h5>
                <p className="text-xs text-gray-600 mt-1">35 meals (VEG) ready for pickup</p>
              </div>

              {/* Dotted path simulation */}
              <div className="flex items-center space-x-3 px-6">
                <div className="h-10 w-0.5 border-l-2 border-dashed border-brand-400 relative">
                  <div className="absolute -top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-brand-500"></div>
                  <div className="absolute -bottom-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-brand-600 font-bold block">Smart Match (91% Compatibility)</span>
                  <span className="text-xs text-gray-400">+1.6 km Additional travel deviation for volunteer</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl relative">
                <span className="absolute top-2 right-2 text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">VOLUNTEER ROUTE</span>
                <h5 className="font-semibold text-sm text-gray-850">Rahul's Daily Commute</h5>
                <p className="text-xs text-gray-600 mt-1">Transit mode: Bike (Malleswaram → Cubbon Park)</p>
              </div>

              {/* Downward path */}
              <div className="flex items-center space-x-3 px-6">
                <div className="h-10 w-0.5 border-l-2 border-dashed border-brand-400 relative">
                  <div className="absolute -top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <div className="absolute -bottom-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-green-800"></div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-green-700 font-bold block">Delivery Target Zone</span>
                  <span className="text-xs text-gray-400">High priority demand at Central Shelter</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl relative">
                <span className="absolute top-2 right-2 text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">SHELTER</span>
                <h5 className="font-semibold text-sm text-gray-800">Cubbon Road Shelter</h5>
                <p className="text-xs text-gray-600 mt-1">Meals expected: 35 | Capacity: 150</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white border-y border-gray-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl font-display font-bold text-gray-901">How E-Meal Works</h2>
            <p className="max-w-2xl mx-auto text-gray-500 text-sm">
              An optimized end-to-end redistribution system reducing transit footprint by leveraging existing commuter paths.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-[#FAF9F6] border border-gray-200 rounded-xl space-y-4 text-left relative">
              <span className="text-3xl font-display font-extrabold text-brand-200 block">01</span>
              <h4 className="font-bold text-gray-900">Post Surplus</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Food providers post excess prepared meals, specifying safe consumption expiration timers and coordinates.
              </p>
            </div>

            <div className="p-6 bg-[#FAF9F6] border border-gray-200 rounded-xl space-y-4 text-left relative">
              <span className="text-3xl font-display font-extrabold text-brand-300 block">02</span>
              <h4 className="font-bold text-gray-900">Intelligent Match</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                The algortihm identifies volunteers whose routine transit overlaps with the pickup and drop shelter locations.
              </p>
            </div>

            <div className="p-6 bg-[#FAF9F6] border border-gray-200 rounded-xl space-y-4 text-left relative">
              <span className="text-3xl font-display font-extrabold text-brand-400 block">03</span>
              <h4 className="font-bold text-gray-900">Pickup & Verify</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Volunteers verify pickups with 6-digit OTP codes, locking coordinates and shifting tasks to transit-state.
              </p>
            </div>

            <div className="p-6 bg-[#FAF9F6] border border-gray-200 rounded-xl space-y-4 text-left relative">
              <span className="text-3xl font-display font-extrabold text-brand-500 block">04</span>
              <h4 className="font-bold text-gray-900">Deliver & Track</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Destinations register delivery verification via drop OTP, photo confirmations, and GPS geo-bounding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Dashboard section */}
      <section id="impact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-display font-bold text-gray-900">System Impact Dashboard</h2>
            <span className="inline-block bg-brand-50 border border-brand-200 text-brand-800 text-[10px] px-3 py-1 rounded-full font-semibold">
              Platform Demo State
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-xs space-y-2">
              <h3 className="text-3xl font-display font-extrabold text-brand-700">{stats.activeDonations}</h3>
              <p className="text-xs text-gray-600 font-medium">Active Donations</p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-xs space-y-2">
              <h3 className="text-3xl font-display font-extrabold text-brand-700">{stats.activeDeliveries}</h3>
              <p className="text-xs text-gray-600 font-medium">In-Flight Transits</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-xs space-y-2">
              <h3 className="text-3xl font-display font-extrabold text-brand-700">{stats.volunteersOnline}</h3>
              <p className="text-xs text-gray-600 font-medium">Commuter Volunteers</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-xs space-y-2">
              <h3 className="text-3xl font-display font-extrabold text-brand-700">{stats.totalMealsDelivered}</h3>
              <p className="text-xs text-gray-650 font-medium">Meals Redirected</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-gray-900 text-gray-400 py-12 border-t border-gray-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
              E
            </span>
            <span className="text-white font-display font-bold">E-Meal redistribution project</span>
          </div>

          <div className="text-xs">
            © {new Date().getFullYear()} E-Meal. Suitable for academic research prototype demonstrations.
          </div>
        </div>
      </footer>
    </div>
  );
};
