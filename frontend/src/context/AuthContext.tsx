import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface ProviderProfile {
  id: string;
  businessName: string;
  address: string;
  latitude: number;
  longitude: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  licenseNumber: string;
  verificationStatus: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'PROVIDER' | 'INDIVIDUAL_DONOR' | 'VOLUNTEER' | 'COORDINATOR';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  providerProfile: ProviderProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  fetchProviderProfile: () => Promise<ProviderProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProviderProfile = async (): Promise<ProviderProfile | null> => {
    try {
      const response = await axios.get('/api/v1/provider/profile');
      setProviderProfile(response.data);
      return response.data;
    } catch (e) {
      console.error("Failed to fetch provider profile", e);
      return null;
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        if (parsedUser.role === 'PROVIDER' || parsedUser.role === 'INDIVIDUAL_DONOR') {
          fetchProviderProfile();
        }
      } catch (e) {
        console.error("Failed to parse cached user options", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      const { token, userId, name, role, email: returnedEmail } = response.data;
      const loggedUser: User = { 
        id: userId, 
        name, 
        email: returnedEmail || email, 
        role, 
        phoneNumber: response.data.phone || '' 
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      setToken(token);
      setUser(loggedUser);
      setIsAuthenticated(true);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      if (role === 'PROVIDER' || role === 'INDIVIDUAL_DONOR') {
        await fetchProviderProfile();
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed. Please check credentials.');
    }
  };

  const register = async (payload: any) => {
    try {
      const response = await axios.post('/api/v1/auth/register', payload);
      const { token, userId, name, role, email: returnedEmail } = response.data;
      const loggedUser: User = { 
        id: userId, 
        name, 
        email: returnedEmail || payload.email, 
        role, 
        phoneNumber: response.data.phone || payload.phone || '' 
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      setToken(token);
      setUser(loggedUser);
      setIsAuthenticated(true);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      if (role === 'PROVIDER' || role === 'INDIVIDUAL_DONOR') {
        await fetchProviderProfile();
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setProviderProfile(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ token, user, providerProfile, isAuthenticated, loading, login, register, logout, fetchProviderProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
