import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useContactStore = create((set, get) => ({
  friends: [],
  groups: [],
  requests: [],

  isLoading: false,

  getContacts: async () => {
    try {
      set({ isLoading: true });

      const friendsRes = await axiosInstance.get("/friends");
      set({ friends: friendsRes.data.friends });

      const groupsRes = await axiosInstance.get("/chats/groups");
      set({ groups: groupsRes.data });

      const requestsRes = await axiosInstance.get("/friends/pending");
      set({ requests: requestsRes.data });
    } catch (error) {
      console.log("Error getting contacts", error);
    } finally {
      set({ isLoading: false });
    }
  },

  selectContact: async (id) => {
    // TODO: implement select contact
    console.log(get().friends);

    console.log(id);
  },
}));
