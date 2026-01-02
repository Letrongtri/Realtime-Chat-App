import { useEffect } from "react";
import { useChatStore } from "../../../store/useChatStore";
import NoChatsFound from "./NoChatFound";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import ChatItems from "./ChatItems";

function ChatList() {
  const { allChats, isChatsLoading, getAllChats, selectChat } = useChatStore();

  useEffect(() => {
    getAllChats();
  }, [getAllChats]);

  if (isChatsLoading) return <UsersLoadingSkeleton />;
  if (!allChats || allChats.length === 0) return <NoChatsFound />;

  return allChats.map((chat) => (
    <ChatItems key={chat._id} onSelectchat={selectChat} chat={chat} />
  ));
}

export default ChatList;
