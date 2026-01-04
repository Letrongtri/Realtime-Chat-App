import { useChatStore } from "../../../store/useChatStore";
import ChatHeader from "./ChatHeader";
import PageLoader from "../../common/PageLoader";
import NoChatPlaceholder from "./NoChatPlaceholder";
import ChatContent from "./ChatContent";
import MessageInput from "./MessageInput";

function ChatContainer() {
  const { currentChat, isCurrentChatLoading } = useChatStore();

  if (isCurrentChatLoading) return <PageLoader />;

  if (!currentChat) return <NoChatPlaceholder />;

  return (
    <>
      <ChatHeader />
      <ChatContent />
      <MessageInput />
    </>
  );
}

export default ChatContainer;
