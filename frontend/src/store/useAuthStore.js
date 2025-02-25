import { create } from 'zustand';
import axiosInstance from '../lib/axios.js';
import toast from 'react-hot-toast';

export const useAuthStore = create((set) => ({

    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,

    checkAuth: async () => {
        try {
            set({ isCheckingAuth: true });
            const res = await axiosInstance.get('/auth/check');
            set({authUser: res.data});
        }
        catch (err) {
            console.error(err);
            toast.error('Failed to check authentication ' + err.message);
            set({authUser: null});
        }
        finally {
            set({isCheckingAuth: false});
        }
    },

    login: async (email, password) => {
        try {
            set({isLoggingIn: true});
            const res = await axiosInstance.post('/auth/login', {email, password});
            set({authUser: res.data});
            toast.success('Login successful');
        }
        catch (err) {
            set({authUser: null});
            toast.error('Failed to login: ' + err.response?.data?.message || err.message);
            console.error(err);
        }
        finally {
            set({isLoggingIn: false});
        }
    },

    signup: async (email, password, fullName) => {
        try {
            set({isSigningUp: true});
            const res = await axiosInstance.post('/auth/register', {email, password, fullName});
            set({authUser: res.data});
            toast.success('Signup successful');
        }
        catch (err) {
            set({authUser: null});
            toast.error('Failed to signup: ' + err.response?.data?.message || err.message);
            console.error(err);
        }
        finally {
            set({isSigningUp: false});
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post('/auth/logout');
            set({authUser: null});
            toast.success('Logout successful');
        }
        catch (err) {
            toast.error('Failed to logout: ' + err.message);
            console.error(err);
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
          const res = await axiosInstance.put("/auth/update-profile", data);
          set({ authUser: res.data });
          toast.success("Profile updated successfully");
        } catch (error) {
          console.log("error in update profile:", error);
          toast.error(error.response.data.message);
        } finally {
          set({ isUpdatingProfile: false });
        }
      },
}));