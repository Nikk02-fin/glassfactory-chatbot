import { create } from 'zustand';

interface UserState {
  firstName: string;
  lastName: string;
  profilePicture: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  email: string;
}

export const useUserStore = create<UserState>(() => ({
  firstName: '',
  lastName: '',
  profilePicture: '',
  isLoading: false,
  isAuthenticated: false,
  email: '',
}));