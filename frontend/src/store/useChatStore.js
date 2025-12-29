import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useChatStore = create((set, get) => ({
  allChats: [],
  isChatsLoading: false,

  allContacts: [],
  isContactsLoading: false,

  currentChat: null,
  isCurrentChatLoading: false,

  messages: [],
  currentPage: 1,
  totalPages: 1,
  totalMessages: 0,
  isMessagesLoading: false,

  getAllContacts: async () => {
    try {
      set({ isContactsLoading: true });
      const res = await axiosInstance.get("/friends");
      set({ allContacts: res.data.friends });
    } catch (error) {
      console.log("Error getting all contacts", error);
    } finally {
      set({ isContactsLoading: false });
    }
  },
  getAllChats: async () => {
    try {
      set({ isChatsLoading: true });
      const res = await axiosInstance.get("/chats");
      set({ allChats: res.data.chats });
    } catch (error) {
      console.log("Error getting all chats", error);
    } finally {
      set({ isChatsLoading: false });
    }
  },
  getCurrentChat: async (id) => {
    try {
      set({ isCurrentChatLoading: true });
      const res = await axiosInstance.get(`/chats/${id}`);
      set({ currentChat: res.data.chat });
    } catch (error) {
      console.log("Error getting current chat", error);
    } finally {
      set({ isCurrentChatLoading: false });
    }
  },
  getMessages: async (id) => {
    try {
      const { page, limit } = get();
      set({ isMessagesLoading: true });
      const res = await axiosInstance.get(
        `/messages/${id}?page=${page}&limit=${limit}`
      );
      set({
        messages: res.data.messages,
        currentPage: res.data.currentPage,
        totalPages: res.data.totalPages,
        totalMessages: res.data.totalMesages,
      });
    } catch (error) {
      console.log("Error getting messages", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  selectChat: async (id) => {
    set({
      message: [],
      currentChat: null,
      currentPage: 1,
      totalPages: 1,
      totalMessages: 0,
    });
    await Promise.all([get().getCurrentChat(id), get().getMessages(id)]);
    set({ isCurrentChatLoading: false });
  },
}));
