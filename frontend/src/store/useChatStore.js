import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useChatStore = create((set, get) => ({
  allChats: [],
  isChatsLoading: false,

  currentChat: null,
  isCurrentChatLoading: false,

  messages: [],
  limit: 20,
  currentPage: 0,
  totalPages: 1,
  totalMessages: 0,
  isMessagesLoading: false,

  getAllChats: async () => {
    try {
      set({ isChatsLoading: true });
      const res = await axiosInstance.get("/chats");
      set({ allChats: res.data });
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
      set({ currentChat: res.data });
    } catch (error) {
      console.log("Error getting current chat", error);
    } finally {
      set({ isCurrentChatLoading: false });
    }
  },
  getMessages: async (id) => {
    try {
      set({ isMessagesLoading: true });
      const { currentPage, limit } = get();
      const res = await axiosInstance.get(
        `/chats/${id}/messages?page=${currentPage + 1}&limit=${limit}`
      );
      set({
        messages: res.data.messages,
        currentPage: res.data.currentPage,
        totalPages: res.data.totalPages,
        totalMessages: res.data.totalMessages,
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
      currentPage: 0,
      totalPages: 1,
      totalMessages: 0,
    });
    await Promise.all([get().getCurrentChat(id), get().getMessages(id)]);
    set({ isCurrentChatLoading: false });
  },
}));
