import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode state: 'login' or 'register'
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'PROVIDER' | 'VOLUNTEER' | 'COORDINATOR' | 'ADMIN'>('PROVIDER');

  // Login Form Values
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Common Registration Form Values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Provider Specific Registration Form Values
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Status handlers
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setIsRegister(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectUser(user.role);
    }
  }, [isAuthenticated, user]);

  const redirectUser = (userRole: string) => {
    switch (userRole) {
      case 'PROVIDER': navigate('/provider/dashboard'); break;
      case 'VOLUNTEER': navigate('/volunteer/dashboard'); break;
      case 'COORDINATOR': navigate('/coordinator/dashboard'); break;
      case 'ADMIN': navigate('/admin/dashboard'); break;
      default: navigate('/'); break;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setStatusError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    
    if (role === 'PROVIDER') {
      if (!businessName || !address || !licenseNumber) {
        setStatusError('Please complete all supplier business details.');
        return;
      }
      if (latitude === null || longitude === null) {
        setStatusError('Please click on the map to set your pickup coordinates.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        email,
        phoneNumber: phone,
        password,
        role
      };

      if (role === 'PROVIDER') {
        payload.businessName = businessName;
        payload.address = address;
        payload.licenseNumber = licenseNumber;
        payload.latitude = latitude;
        payload.longitude = longitude;
      }

      await register(payload);
    } catch (err: any) {
      setStatusError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setStatusError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center relative overflow-hidden p-4 sm:p-6 lg:p-8">
      
      {/* Full-Page Layered Organic Wavy Background (matching reference images) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top-Left Organic Wavy Area (Sage/Green overlapping waves) */}
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

        {/* Dotted Commute Route Line across the entire screen (matching input_file_1 / input_file_2) */}
        <svg className="absolute top-[15%] left-[10%] w-[80%] h-[70%] opacity-[0.15]" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 300 C 150 150, 250 350, 400 200 C 550 50, 650 250, 750 100" stroke="#2A5940" strokeWidth="3" strokeDasharray="8 8" />
          <circle cx="50" cy="300" r="8" fill="#2A5940" />
          <circle cx="750" cy="100" r="8" fill="#DF8C38" />
        </svg>
      </div>

      {/* Centered Auth Card */}
      <div className="w-full max-w-lg bg-white border border-natural-border shadow-xl rounded-2xl relative z-10 overflow-hidden my-8">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-brand-600"></div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header section with brand info and go-back */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-natural-border pb-4 bg-white">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                E
              </span>
              <div className="flex flex-col text-left">
                <span className="font-display font-black text-natural-text text-xs uppercase leading-none">E-Meal</span>
                <span className="text-[8px] font-bold text-brand-500 uppercase tracking-widest leading-none mt-0.5">Route Rescue</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/')} 
              className="inline-flex items-center text-[10px] font-black text-brand-600 hover:text-brand-750 transition-colors gap-1 uppercase tracking-wider self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home page
            </button>
          </div>

          <div className="text-left">
            <h2 className="text-lg font-display font-black text-natural-text uppercase tracking-wider">
              {isRegister ? 'Register Platform Account' : 'Workplace Console Sign In'}
            </h2>
            <p className="text-[9px] text-natural-muted font-black mt-1 uppercase tracking-wider">
              {isRegister ? 'Provide credentials to start rescuing surplus food.' : 'Provide email and password to access dashboard.'}
            </p>
          </div>

          {statusError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex items-start space-x-2 text-left font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-650" />
              <span>{statusError}</span>
            </div>
          )}

          {isRegister ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-5 text-left bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="E.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                    placeholder="Secure password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted mb-2">Platform Role</label>
                <div className="flex bg-[#FAF9F5] p-1.5 rounded-xl border border-natural-border">
                  {(['PROVIDER', 'VOLUNTEER', 'COORDINATOR', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 text-center py-2 rounded-lg text-[8px] font-black transition-all uppercase tracking-wider ${
                        role === r
                          ? 'bg-brand-600 text-white shadow-sm font-bold'
                          : 'text-natural-muted hover:bg-brand-50 hover:text-brand-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Specific Details */}
              {role === 'PROVIDER' && (
                <div className="space-y-4 pt-4 border-t border-natural-border bg-white">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-natural-text">Food Provider Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Establishment Name</label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                        placeholder="E.g. Green Bowl Kitchen"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Food License Code</label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                        placeholder="E.g. LC-D77E45"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Pickup Address Location</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                      placeholder="E.g. Malleswaram Cross St, Bengaluru"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted mb-2">
                      Pin Pickup Coordinates On Map
                    </label>
                    <div className="h-44 rounded-xl border border-natural-border overflow-hidden relative">
                      <MapView
                        center={[12.9716, 77.5946]}
                        zoom={12}
                        onLocationSelect={handleLocationSelect}
                        markers={latitude !== null && longitude !== null ? [
                          { id: 'selected', latitude, longitude, title: 'Pickup Location', role: 'PROVIDER' }
                        ] : []}
                      />
                    </div>
                    {latitude && longitude && (
                      <div className="text-[9px] text-natural-muted font-bold font-mono mt-1.5 text-right">
                        Lat: {latitude.toFixed(5)} | Lng: {longitude.toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center mt-2"
              >
                {loading ? 'Registering...' : 'Register Console Account'}
              </button>

              <div className="text-center text-xs font-semibold bg-white">
                <span className="text-natural-muted">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setStatusError(null); }}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-5 text-left bg-white">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="Enter registered email"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-natural-muted">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-650"
                  placeholder="Enter login password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center mt-2"
              >
                {loading ? 'Verifying...' : 'Sign In To Workplace'}
              </button>

              <div className="text-center text-xs font-semibold bg-white">
                <span className="text-natural-muted">New to E-Meal? </span>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setStatusError(null); }}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Create an account
                </button>
              </div>

              <div className="p-4 bg-[#FAF9F5] rounded-xl border border-natural-border flex flex-col space-y-1.5 text-left">
                <span className="text-[9px] font-bold text-natural-text uppercase tracking-wider">DEMO CONSOLE CREDENTIALS:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-natural-muted font-semibold font-mono">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Provider</span>
                    <span>provider1@food.com</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Volunteer</span>
                    <span>rahul@food.com</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Admin</span>
                    <span>admin@food.com</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-natural-muted font-sans">Demo Password</span>
                    <span>password</span>
                  </div>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
