import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isChangingPassword: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      if (res.status === 200) {
        set({ authUser: res.data });
      }

      get().connectSocket();
    } catch (error) {
      console.log("Error checking auth", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  signup: async (data) => {
    try {
      set({ isSigningUp: true });

      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.user });

      toast.success(res.data.message);

      get().connectSocket();
    } catch (error) {
      console.log("Error signing up", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },
  login: async (data) => {
    try {
      set({ isLoggingIn: true });

      const res = await axiosInstance.post("/auth/login", data);

      set({ authUser: res.data.user });

      toast.success(res.data.message);

      get().connectSocket();
    } catch (error) {
      console.log("Error Logging up", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },
  changePassword: async (data) => {
    set({ isChangingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/change-password", data);
      toast.success(res.data.message);
    } catch (error) {
      console.log("Error changing password", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isChangingPassword: false });
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });

      get().disconnectSocket();
    } catch (error) {
      console.log("Error logging out", error);
    }
  },
  setAuthUser: (user) => set({ authUser: user }),

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, { withCredentials: true });
    socket.connect();

    set({ socket });

    // listen for online users event
    socket.on("onlineUsers", (onlineUsers) => {
      set({ onlineUsers });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
