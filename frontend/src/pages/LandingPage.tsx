import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Utensils, Shield, Heart, ArrowRight, CheckCircle2, ChevronRight, BarChart3, Route, Trash2, Clock, Bike, UtensilsCrossed, Cpu, ShieldCheck, Globe } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-natural-bg text-natural-text organic-pattern relative overflow-hidden">
      {/* Decorative Wavy Background Blobs (matching reference images) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top-Left Organic Wavy Area (Sage/Green overlapping waves from input_file_0 / input_file_3) */}
        <svg className="absolute -top-[10%] -left-[10%] w-[60%] h-[70%] opacity-[0.25]" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 C150 50, 300 150, 350 280 C400 400, 200 480, 0 500 Z" fill="#A3B899" />
          <path d="M0 0 C100 80, 200 180, 280 250 C350 320, 180 420, 0 450 Z" fill="#C4D4C5" />
          <path d="M0 0 C80 50, 120 180, 180 200 C240 220, 150 350, 0 380 Z" fill="#FAF9F5" />
          <path d="M50 0 C120 100, 220 220, 300 280" stroke="#FAF9F5" strokeWidth="2" strokeDasharray="6 6" />
        </svg>

        {/* Bottom-Right Organic Wavy Area (Sage/Green overlapping waves) */}
        <svg className="absolute -bottom-[15%] -right-[15%] w-[70%] h-[80%] opacity-[0.22]" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M500 500 C350 450, 200 350, 150 220 C100 100, 300 20, 500 0 Z" fill="#6E8A5E" />
          <path d="M500 500 C400 420, 300 320, 220 250 C150 180, 320 80, 500 50 Z" fill="#A3B899" />
          <path d="M500 500 C420 450, 380 320, 320 300 C260 280, 350 150, 500 120 Z" fill="#C4D4C5" />
          <path d="M450 500 C380 400, 280 280, 200 220" stroke="#FAF9F5" strokeWidth="2" strokeDasharray="6 6" />
        </svg>

        {/* Dotted Commute Route Line across the screen (matching input_file_1 / input_file_2) */}
        <svg className="absolute top-[20%] left-[20%] w-[60%] h-[40%] opacity-[0.15]" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 300 C 150 150, 250 350, 400 200 C 550 50, 650 250, 750 100" stroke="#2A5940" strokeWidth="3" strokeDasharray="8 8" />
          <circle cx="50" cy="300" r="8" fill="#2A5940" />
          <circle cx="750" cy="100" r="8" fill="#DF8C38" />
        </svg>
      </div>

      {/* Translucent Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-natural-border z-50 transition-all">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-lg bg-brand-650 flex items-center justify-center text-white font-extrabold text-sm shadow-xs select-none">
              E
            </span>
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-natural-text tracking-tight text-xs uppercase leading-none">E-Meal</span>
              <span className="text-[8px] font-bold text-brand-500 uppercase tracking-widest leading-none mt-0.5">Route Rescue</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-wider text-[#5C6D64]">
            <a href="#how-it-works" className="hover:text-brand-600 transition-colors">How It Works</a>
            <a href="#impact" className="hover:text-brand-600 transition-colors">Platform Impact</a>
            <a href="#features" className="hover:text-brand-600 transition-colors">Core Features</a>
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="btn-primary flex items-center gap-1 normal-case text-[11px]"
              >
                <span>Console Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link to="/login" className="text-natural-muted hover:text-natural-text font-bold text-[11px] uppercase tracking-wider transition-colors mr-2">
                  Sign In
                </Link>
                <Link
                  to="/login?register=true"
                  className="btn-primary normal-case text-[11px] py-2"
                >
                  Join Platform
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with premium gradient background */}
      <div className="w-full min-h-[90vh] flex flex-col justify-center bg-gradient-to-b from-[#FAF9F5] via-[#FAF9F5] to-[#E2ECE6] relative overflow-hidden border-b border-natural-border">
        {/* Local decorative route vectors for the hero container */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg className="absolute top-[20%] left-[10%] w-[80%] h-[60%] opacity-[0.08]" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 300 C 150 150, 250 350, 400 200 C 550 50, 650 250, 750 100" stroke="#2A5940" strokeWidth="4" strokeDasharray="8 8" />
          </svg>
        </div>

        <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="space-y-8 flex flex-col items-center">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-100 border border-[#C9DAD2] text-brand-700 text-[10px] font-bold uppercase tracking-wider">
              <Route className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>COMMUTE-BASED REDISTRIBUTION SYSTEM</span>
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-black text-natural-text tracking-tight leading-[1.08] uppercase">
              Surplus Food.<br />
              <span className="text-brand-600 font-extrabold normal-case font-mono">Smarter Routes.</span><br />
              Greater Impact.
            </h1>
            <p className="text-sm sm:text-base text-natural-muted font-medium leading-relaxed max-w-2xl mx-auto">
              A route-aware logistics platform matching daily commuters with surplus food from restaurants, delivering directly to shelters with carbon-zero deviation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center w-full sm:w-auto">
              <button
                onClick={() => navigate(isAuthenticated ? getDashboardPath() : '/login?register=true')}
                className="btn-primary flex items-center justify-center space-x-2 text-sm py-4 px-8"
              >
                <span>Start Redistributing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="btn-secondary flex items-center justify-center text-center text-sm py-4 px-8"
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* 2. The Food Waste Problem Section */}
      <section id="problem" className="py-24 bg-[#FAF9F5] border-t border-natural-border text-left relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[10px] bg-red-50 border border-red-100 text-red-700 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono">
                The Logistics Paradox
              </span>
              <h3 className="text-3xl font-display font-black text-natural-text uppercase tracking-wider leading-tight">
                The Food Waste Problem
              </h3>
              <p className="text-xs sm:text-sm text-natural-muted font-semibold leading-relaxed">
                Tons of high-quality, edible surplus food are discarded daily by restaurants, institutional kitchens, and hotels. Concurrently, nearby shelters and community zones struggle with food insecurity. 
              </p>
              <p className="text-xs sm:text-sm text-natural-muted font-semibold leading-relaxed">
                This mismatch isn't caused by a lack of surplus food or willing volunteers—it is a coordination problem. Traditional shipping frameworks are too slow or costly for short-lived prepared meals.
              </p>
            </div>
            
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-natural-border p-6 rounded-2xl shadow-xs space-y-2 hover:border-brand-200 transition-colors flex flex-col items-start text-left">
                  <Trash2 className="w-6 h-6 text-brand-600" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-natural-text pt-1">1/3 of All Food</h4>
                  <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                    Produced globally goes to landfill, representing wasted energy and increased environmental strain.
                  </p>
                </div>
                
                <div className="bg-white border border-natural-border p-6 rounded-2xl shadow-xs space-y-2 hover:border-brand-200 transition-colors flex flex-col items-start text-left">
                  <Clock className="w-6 h-6 text-brand-600" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-natural-text pt-1">Safe Consumption</h4>
                  <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                    Surplus meals must be picked up and safely redistributed within tight expiration timeframes.
                  </p>
                </div>

                <div className="bg-white border border-natural-border p-6 rounded-2xl shadow-xs space-y-2 hover:border-brand-200 transition-colors flex flex-col items-start text-left">
                  <Bike className="w-6 h-6 text-brand-600" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-natural-text pt-1">Detour Efficiency</h4>
                  <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                    We must connect pickup points to shelters by leveraging existing commuter travel routes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works & System Impact Section */}
      <section id="how-it-works" className="py-24 bg-white border-t border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-3">
            <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider font-mono">
              Redistribution Lifecycle
            </span>
            <h2 className="text-2xl font-display font-black uppercase tracking-wider text-natural-text">How E-Meal Works</h2>
            <p className="max-w-xl mx-auto text-natural-muted text-xs font-semibold">
              An optimized end-to-end redistribution system reducing transit footprint by leveraging existing commuter paths.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-natural-bg border border-natural-border rounded-xl space-y-4 text-left hover:border-brand-200 transition-colors">
              <span className="text-xl font-mono font-black text-brand-600 block">01</span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Post Surplus</h4>
              <p className="text-[11px] text-natural-muted leading-relaxed font-medium">
                Food providers post excess prepared meals, specifying safe consumption expiration timers and coordinates.
              </p>
            </div>

            <div className="p-6 bg-natural-bg border border-natural-border rounded-xl space-y-4 text-left hover:border-brand-200 transition-colors">
              <span className="text-xl font-mono font-black text-brand-600 block">02</span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Intelligent Match</h4>
              <p className="text-[11px] text-natural-muted leading-relaxed font-medium">
                The algorithm identifies volunteers whose routine transit overlaps with the pickup and drop shelter locations.
              </p>
            </div>

            <div className="p-6 bg-natural-bg border border-natural-border rounded-xl space-y-4 text-left hover:border-brand-200 transition-colors">
              <span className="text-xl font-mono font-black text-brand-600 block">03</span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Pickup & Verify</h4>
              <p className="text-[11px] text-natural-muted leading-relaxed font-medium">
                Volunteers verify pickups with 6-digit OTP codes, locking coordinates and shifting tasks to transit-state.
              </p>
            </div>

            <div className="p-6 bg-natural-bg border border-natural-border rounded-xl space-y-4 text-left hover:border-brand-200 transition-colors">
              <span className="text-xl font-mono font-black text-brand-600 block">04</span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Deliver & Track</h4>
              <p className="text-[11px] text-natural-muted leading-relaxed font-medium">
                Destinations register delivery verification via drop OTP, photo confirmations, and GPS geo-bounding.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Who We Are Section */}
      <section id="who-we-are" className="py-24 bg-[#FAF9F5] border-t border-natural-border relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* LEFT Column: Story / Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                Who We Are
              </span>
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-natural-text leading-tight">
                Who We Are
              </h2>
              <p className="text-xs sm:text-sm text-natural-text font-black leading-relaxed">
                Built by students who believe that good food should never become waste when someone nearby could benefit from it.
              </p>
              <div className="space-y-4 text-xs text-natural-muted font-medium leading-relaxed">
                <p>
                  We are a team of four students working together to build a practical technology-driven solution for one of the problems we see around us every day — perfectly usable food being discarded while communities continue to face food insecurity.
                </p>
                <p className="font-bold text-natural-text text-sm font-mono border-l-2 border-brand-500 pl-4 py-1 my-3 bg-white/50">
                  "What if the food that is about to be wasted could reach someone who actually needs it?"
                </p>
                <p>
                  Instead of treating food redistribution as only a donation problem, we wanted to look at it as a coordination and logistics problem.
                </p>
                <p>
                  Restaurants and institutions may have surplus food. Volunteers may already be travelling through the same areas. NGOs and shelters know where food is needed. The challenge is connecting these three points at the right time.
                </p>
                <p>
                  Our platform is designed to bring them together through route-aware volunteer matching, real-time delivery tracking, verification mechanisms, and intelligent demand estimation. We are building this as a real working product, not just a conceptual prototype.
                </p>
              </div>
            </div>

            {/* RIGHT Column: Organic visual composition flow */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full max-w-sm bg-white border border-natural-border p-6 rounded-2xl relative shadow-sm text-xs font-semibold text-natural-text font-mono space-y-5">
                <div className="absolute top-0 right-0 left-0 h-1 bg-brand-600 rounded-t-2xl"></div>
                <div className="text-center text-[10px] text-natural-muted uppercase font-black tracking-wider">Platform Redistribution Flow</div>
                
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted">Step 1</span>
                    <strong className="uppercase">Restaurant / Food Provider</strong>
                  </div>
                  <div className="flex justify-center text-brand-600">↓</div>
                  <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted">Step 2</span>
                    <strong className="uppercase">Surplus Food Listing</strong>
                  </div>
                  <div className="flex justify-center text-brand-600">↓</div>
                  <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted">Step 3</span>
                    <strong className="uppercase">Volunteer Commuter Match</strong>
                  </div>
                  <div className="flex justify-center text-brand-600">↓</div>
                  <div className="p-3 bg-[#FAF9F5] border border-natural-border rounded-xl text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted">Step 4</span>
                    <strong className="uppercase">Transit Route Matching</strong>
                  </div>
                  <div className="flex justify-center text-brand-600">↓</div>
                  <div className="p-3 bg-white border border-brand-100 rounded-xl text-center bg-brand-50">
                    <span className="block text-[8px] uppercase tracking-wider text-brand-700">Goal</span>
                    <strong className="uppercase text-brand-850">Community Shelter Zone</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. What Motivates Us Section */}
      <section className="py-24 bg-white border-t border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
              Our Motivation
            </span>
            <h2 className="text-2xl font-display font-black uppercase tracking-wider text-natural-text">
              What Motivates Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between hover:border-brand-200 transition-colors">
              <div className="space-y-3">
                <UtensilsCrossed className="w-6 h-6 text-brand-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text pt-1">Food should not go to waste</h4>
                <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                  Large amounts of edible surplus food can be generated by restaurants, events, institutions and other food providers. Our goal is to create a reliable path for that surplus to reach people instead of becoming waste.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between hover:border-brand-200 transition-colors">
              <div className="space-y-3">
                <Cpu className="w-6 h-6 text-brand-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text pt-1">Technology should solve real problems</h4>
                <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                  We wanted to build something beyond a conventional CRUD application. The project combines real-time location, intelligent volunteer matching, route-aware delivery, verification and data-driven decision making.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between hover:border-brand-200 transition-colors">
              <div className="space-y-3">
                <ShieldCheck className="w-6 h-6 text-brand-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text pt-1">Every delivery should be trustworthy</h4>
                <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                  Food redistribution requires trust. That is why our workflow includes pickup verification, destination OTP verification, geotagged delivery proof and photo validation.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between hover:border-brand-200 transition-colors">
              <div className="space-y-3">
                <Globe className="w-6 h-6 text-brand-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text pt-1">Small actions can create measurable impact</h4>
                <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
                  A volunteer travelling on an existing route can make a meaningful difference without making a separate journey. We want to turn those small opportunities into measurable social impact.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Our Story / Timeline Section */}
      <section className="py-24 bg-[#FAF9F5] border-t border-natural-border text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                Development Path
              </span>
              <h3 className="text-2xl font-display font-black text-natural-text uppercase tracking-wider">
                From an Idea to a Working Platform
              </h3>
              <p className="text-[11px] sm:text-xs text-natural-muted font-semibold leading-relaxed">
                We began by studying the gaps in existing food redistribution approaches. Many solutions can connect donors and recipients, but the practical challenge remains: How do we make the movement of food efficient, timely and trustworthy?
              </p>
              <p className="text-[11px] sm:text-xs text-natural-muted font-semibold leading-relaxed">
                This led us to design a route-based redistribution model where volunteers can discover surplus food that fits their existing journey. The system then manages the journey from food posting to pickup, live delivery, destination verification, proof validation and reward allocation.
              </p>
            </div>

            <div className="lg:col-span-7 bg-white border border-natural-border rounded-2xl p-6 relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-brand-600 rounded-t-2xl"></div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text mb-6">Our Design Timeline</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono font-bold text-natural-text">
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">01</span>
                  <span>IDEA</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">02</span>
                  <span>IDENTIFY THE PROBLEM</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">03</span>
                  <span>DESIGN MODEL</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">04</span>
                  <span>BUILD THE PLATFORM</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">05</span>
                  <span>CONNECT ENTITIES</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">06</span>
                  <span>ENABLE LIVE TRACKING</span>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-natural-border text-center">
                  <span className="block text-[8px] text-brand-600">07</span>
                  <span>VERIFY EVERY TASK</span>
                </div>
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 text-center text-brand-850">
                  <span className="block text-[8px] text-brand-700">08</span>
                  <span>MEASURE IMPACT</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Meet The Team Section */}
      <section className="py-24 bg-white border-t border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider animate-pulse">
              Student Founders
            </span>
            <h2 className="text-2xl font-display font-black uppercase tracking-wider text-natural-text">
              Meet the Team
            </h2>
            <p className="max-w-xl mx-auto text-natural-muted text-xs font-semibold">
              Four students, one shared vision — turning surplus food into meaningful community impact.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: A Harini */}
            <div className="bg-[#FAF9F5] border border-natural-border rounded-2xl p-6 shadow-xs text-left flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md transition-all duration-300">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center font-bold text-base text-brand-750 font-mono tracking-wider border border-brand-200 select-none">
                  AH
                </div>
                <div>
                  <h4 className="font-display font-black text-sm uppercase tracking-wider text-natural-text leading-tight">A Harini</h4>
                  <p className="text-[9px] uppercase font-mono font-bold text-brand-600 mt-0.5">Co-Founder / Team Member</p>
                </div>
                <p className="text-[11px] text-natural-muted font-semibold leading-relaxed">
                  Part of the team working on the design, development and overall implementation of the food redistribution platform.
                </p>
              </div>
            </div>

            {/* Card 2: Bhoomika M */}
            <div className="bg-[#FAF9F5] border border-natural-border rounded-2xl p-6 shadow-xs text-left flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md transition-all duration-300">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center font-bold text-base text-brand-750 font-mono tracking-wider border border-brand-200 select-none">
                  BM
                </div>
                <div>
                  <h4 className="font-display font-black text-sm uppercase tracking-wider text-natural-text leading-tight">Bhoomika M</h4>
                  <p className="text-[9px] uppercase font-mono font-bold text-brand-600 mt-0.5">Co-Founder / Team Member</p>
                </div>
                <p className="text-[11px] text-natural-muted font-semibold leading-relaxed">
                  Contributing to the development and refinement of the platform, helping turn the food redistribution concept into a practical working solution.
                </p>
              </div>
            </div>

            {/* Card 3: Ramya AM */}
            <div className="bg-[#FAF9F5] border border-natural-border rounded-2xl p-6 shadow-xs text-left flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md transition-all duration-300">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center font-bold text-base text-brand-750 font-mono tracking-wider border border-brand-200 select-none">
                  RA
                </div>
                <div>
                  <h4 className="font-display font-black text-sm uppercase tracking-wider text-natural-text leading-tight">Ramya AM</h4>
                  <p className="text-[9px] uppercase font-mono font-bold text-brand-600 mt-0.5">Co-Founder / Team Member</p>
                </div>
                <p className="text-[11px] text-natural-muted font-semibold leading-relaxed">
                  Contributing to the project development, research and implementation of the platform's core food redistribution workflow.
                </p>
              </div>
            </div>

            {/* Card 4: Yashwardhan Kumar */}
            <div className="bg-[#FAF9F5] border border-natural-border rounded-2xl p-6 shadow-xs text-left flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md transition-all duration-300">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center font-bold text-base text-brand-750 font-mono tracking-wider border border-brand-200 select-none">
                  YK
                </div>
                <div>
                  <h4 className="font-display font-black text-sm uppercase tracking-wider text-natural-text leading-tight">Yashwardhan Kumar</h4>
                  <p className="text-[9px] uppercase font-mono font-bold text-brand-600 mt-0.5">Co-Founder / Team Member</p>
                </div>
                <p className="text-[11px] text-natural-muted font-semibold leading-relaxed">
                  Working on the overall product development, system implementation and integration of the platform's intelligent redistribution workflow.
                </p>
              </div>
            </div>

          </div>

          {/* Team Story Section */}
          <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-xs text-left max-w-2xl mx-auto space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Built together, from an idea to a working platform.</h4>
            <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
              Our team came together around a simple but important problem: usable food should not become waste when it can still create value for someone else. We are combining technology, research and collaboration to build a practical system that connects food providers, volunteers and community zones in real time.
            </p>
          </div>

          {/* Team Contribution Specifics */}
          <div className="bg-[#FAF9F5] border border-natural-border p-6 rounded-2xl shadow-xs text-left max-w-2xl mx-auto space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Built Together</h4>
            <p className="text-[11px] text-natural-muted leading-relaxed font-semibold">
              Our platform is a collaborative student project involving distinct contributions across product design, web application development, backend and API development, AI/ML integration, database and real-time services, testing and validation, and research and documentation.
            </p>
          </div>

        </div>
      </section>

      {/* 8. Our Mission Section */}
      <section className="py-24 bg-[#FAF9F5] border-t border-natural-border text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
            Our Mission
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-natural-text uppercase tracking-tight">
            "Turn surplus into sustenance."
          </h2>
          <p className="max-w-2xl mx-auto text-natural-muted text-xs sm:text-sm font-semibold leading-relaxed">
            Our mission is to build a practical technology platform that makes surplus food redistribution more timely, transparent and efficient. By connecting food providers, volunteers and community zones through real-time coordination, we aim to reduce avoidable food waste while helping usable food reach people who need it.
          </p>
        </div>
      </section>

      {/* 9. Impact Statement & Call To Action Section */}
      <section className="py-24 bg-[#1C2721] text-white border-t border-natural-border text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50,200 C150,350 350,150 700,300" stroke="white" strokeWidth="4" strokeDasharray="8 8" fill="none" />
          </svg>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 z-10 relative">
          <div className="space-y-4">
            <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-wider leading-tight">
              Every meal rescued is more than food saved.
            </h3>
            <p className="max-w-xl mx-auto text-brand-200 text-xs sm:text-sm font-semibold leading-relaxed">
              It represents less waste, one more delivery, one more volunteer contribution, and one more opportunity to support a community. We are starting with a student project, but we are building it with the mindset of a real-world product.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate(isAuthenticated ? getDashboardPath() : '/login?register=true')}
              className="btn-primary flex items-center justify-center space-x-2 text-xs py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              <span>Join the Movement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="btn-secondary text-center text-xs py-3 px-6 border-brand-850 hover:bg-[#FAF9F5] text-natural-text bg-[#FAF9F5]"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#1C2721] text-[#A6B2AB] py-12 text-xs border-t border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center">
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FAF9F5] flex items-center justify-center text-brand-650 font-extrabold text-sm shadow-xs select-none">
              E
            </span>
            <span className="text-white font-display font-black uppercase text-[10px] tracking-widest">E-Meal Redistribution Platform</span>
          </div>
          <div className="font-semibold text-gray-500">
            © {new Date().getFullYear()} E-Meal logistics network. Built as a sustainability prototype.
          </div>
        </div>
      </footer>
    </div>
  );
};
