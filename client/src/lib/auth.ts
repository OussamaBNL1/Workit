import { create } from 'zustand';
import { apiRequest } from './queryClient';
import { User } from './types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isVisitor: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  continueAsVisitor: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isVisitor: false,
  isLoading: true,
  error: null,
  
  login: async (username: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const user = await res.json();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiRequest('POST', '/api/auth/register', userData);
      const user = await res.json();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      set({ isLoading: true });
      await apiRequest('POST', '/api/auth/logout');
      set({ user: null, isAuthenticated: false, isVisitor: false, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  continueAsVisitor: () => {
    set({ 
      user: null, 
      isAuthenticated: false, 
      isVisitor: true, 
      isLoading: false, 
      error: null 
    });
  },
  
  checkAuth: async () => {
    try {
      set((state) => ({ ...state, isLoading: true }));
      console.log('Checking authentication status...');
      const res = await apiRequest('GET', '/api/auth/me');
      console.log('Auth check response status:', res.status);
      
      if (res.ok) {
        const user = await res.json();
        console.log('User authenticated:', user ? 'yes' : 'no');
        set((state) => ({ 
          ...state, 
          user, 
          isAuthenticated: !!user, 
          isVisitor: state.isVisitor && !user, // Keep visitor state if not authenticated
          isLoading: false 
        }));
      } else {
        // If not authenticated, keep visitor state as is
        console.log('Not authenticated, keeping visitor state');
        set((state) => ({ 
          ...state, 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // If error, keep visitor state as is
      set((state) => ({ 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      }));
    }
  }
}));
