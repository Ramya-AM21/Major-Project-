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
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors gap-1 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Landing page
          </button>
        </div>
        <div className="flex justify-center items-center space-x-2">
          <span className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl">
            E
          </span>
          <span className="font-display font-extrabold text-2xl text-gray-900">E-Meal Redistribution</span>
        </div>
        <h2 className="mt-6 text-center text-xl font-display font-bold text-gray-900 leading-tight">
          {isRegister ? 'Create your platform account' : 'Sign in to your workplace console'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 border border-gray-200 shadow-md sm:rounded-2xl sm:px-10">
          
          {statusError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-650 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
              <span>{statusError}</span>
            </div>
          )}

          {isRegister ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="E.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Secure password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Platform Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['PROVIDER', 'VOLUNTEER', 'COORDINATOR', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all ${
                        role === r
                          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Specific Coordinates & Details Selectors */}
              {role === 'PROVIDER' && (
                <div className="space-y-4 pt-4 border-t border-gray-150">
                  <h4 className="font-display font-semibold text-sm text-gray-900">Food Provider Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Establishment Name</label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="E.g. Green Bowl Kitchen"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700">Food License Code</label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="E.g. LC-D77E45"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Pickup Address Location</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="E.g. Malleswaram Cross St, Bengaluru"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Pin Pickup Coordinates On Map
                    </label>
                    <div className="h-64 rounded-xl border border-gray-250 overflow-hidden relative">
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
                      <div className="text-[10px] text-gray-500 font-medium font-mono mt-1 text-right">
                        Lat: {latitude.toFixed(5)} | Lng: {longitude.toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Console Account'}
              </button>

              <div className="text-center text-xs">
                <span className="text-gray-500">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setStatusError(null); }}
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Enter registered email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Enter login password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In To Workplace'}
              </button>

              <div className="text-center text-xs">
                <span className="text-gray-500">New to E-Meal? </span>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setStatusError(null); }}
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Create an account
                </button>
              </div>

              <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 flex flex-col space-y-1.5 text-left">
                <span className="text-[10px] font-bold text-brand-850">DEMO INJECTED DIRECTORIES:</span>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-650">
                  <div><strong>Provider:</strong> provider1@food.com</div>
                  <div><strong>Password:</strong> password</div>
                  <div><strong>Volunteer:</strong> rahul@food.com</div>
                  <div><strong>Password:</strong> password</div>
                  <div><strong>Admin:</strong> admin@food.com</div>
                  <div><strong>Password:</strong> password</div>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
