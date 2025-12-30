import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useUserStore = create((set) => ({
  isUpdatingProfile: false,

  updateProfile: async (data) => {
    try {
      set({ isUpdatingProfile: true });

      const res = await axiosInstance.put("/users/profile", data);

      useAuthStore.getState().setAuthUser(res.data.user);
      toast.success(res.data.message);
    } catch (error) {
      console.log("Error updating profile", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  deleteProfile: async () => {
    try {
      const res = await axiosInstance.delete("/users/profile");
      useAuthStore.getState().logout();
      toast.success(res.data.message);
    } catch (error) {
      console.log("Error deleting profile", error);
      toast.error(error.response.data.message);
    }
  },
}));
