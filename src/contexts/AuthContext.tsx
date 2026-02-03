import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, usersApi, UserResponse, ApiError } from '../services/api';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: { full_name?: string; preferred_currency?: string; preferred_language?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('vantrack_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await usersApi.getMe();
      setUser(userData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('vantrack_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('vantrack_token', response.access_token);
    await fetchUser();
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await authApi.register(email, password, fullName);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('vantrack_token');
    setUser(null);
  };

  const updateUser = async (data: { full_name?: string; preferred_currency?: string; preferred_language?: string }) => {
    const updated = await usersApi.updateMe(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
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
