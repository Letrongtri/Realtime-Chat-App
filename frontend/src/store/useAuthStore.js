import { create } from "zustand";

export const useAuthStore = create((set) => ({
  authUser: {
    _id: 1,
    fullName: "Nguyen Van A",
    email: "nguyenvana@example.com",
  },
  isLoading: false,
  isLoggedIn: false,

  login: () => {
    console.log("You just logged in");
    set((state) => ({ ...state, isLoggedIn: true, isLoading: false }));
  },
}));
