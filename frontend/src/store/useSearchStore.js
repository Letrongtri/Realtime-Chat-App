import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useSearchStore = create((set) => ({
  users: [],
  isSearching: false,

  searchUsers: async (query) => {
    try {
      set({ isSearching: true, users: [] });

      const res = await axiosInstance.get("/users/search", {
        params: {
          query: query,
        },
      });
      console.log(res.data);

      set({ users: res.data });
    } catch (error) {
      console.log("Error searching user", error);
    } finally {
      set({ isSearching: false });
    }
  },
}));
