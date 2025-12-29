import { create } from "zustand";

export const useSettingStore = create((set, get) => ({
  activeTab: "chats",
  isSoundEnabled: localStorage.getItem("isSoundEnabled") === "true",

  tonggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
