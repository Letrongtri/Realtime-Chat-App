import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

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
  hasMoreMessages: true,
  isMessagesLoading: false,
  isSendingMessage: false,

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
      if (!get().hasMoreMessages) return;

      set({ isMessagesLoading: true });
      const { currentPage, limit } = get();
      const res = await axiosInstance.get(
        `/chats/${id}/messages?page=${currentPage + 1}&limit=${limit}`
      );
      set({
        messages: res.data.messages.reverse(),
        currentPage: res.data.currentPage,
        totalPages: res.data.totalPages,
        totalMessages: res.data.totalMessages,
        hasMoreMessages: res.data.messages.length === limit,
      });
    } catch (error) {
      console.log("Error getting messages", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  selectChat: async (id) => {
    get().refreshChat();
    await Promise.all([get().getCurrentChat(id), get().getMessages(id)]);
  },

  refreshChat: () => {
    set({
      messages: [],
      currentChat: null,
      currentPage: 0,
      totalPages: 1,
      totalMessages: 0,
      hasMoreMessages: true,
    });
  },

  sendMessage: async (data) => {
    try {
      set({ isSendingMessage: true });
      const { text, images, media } = data;

      if (!text && images.length === 0 && !media) return;

      const formData = new FormData();
      if (images.length > 0) {
        formData.append("messageType", "image");
        images.forEach((img) => formData.append("files", img));
      } else if (media) {
        formData.append("messageType", media.type);
        formData.append("files", media.file);
      } else {
        formData.append("messageType", "text");
        formData.append("text", text);
      }

      const res = await axiosInstance.post(
        `/chats/${get().currentChat._id}/messages`,
        formData
      );
      set({ messages: [...get().messages, res.data] });
    } catch (error) {
      console.log("Error sending message", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isSendingMessage: false });
    }
  },
}));
