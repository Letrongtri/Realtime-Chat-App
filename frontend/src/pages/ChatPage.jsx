import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatContainer from "../components/ChatContainer";
import ChatList from "../components/ChatList";
import ContactList from "../components/ContactList";
import NoChatPlaceholder from "../components/NoChatPlaceHolder";
import ProfileHeader from "../components/ProfileHeader";
import { useChatStore } from "../store/useChatStore";
import { useSettingStore } from "../store/useSettingStore";

function ChatPage() {
  const { activeTab } = useSettingStore();
  const { currentChat } = useChatStore();

  return (
    <div className="h-[calc(100dvh-2rem)] w-screen bg-slate-900 p-2 box-border overflow-hidden flex">
      <div className="relative w-full flex-1 overflow-hidden">
        <BorderAnimatedContainer>
          {/* SIDE BAR */}
          <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
            <ProfileHeader />
            <ActiveTabSwitch />

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeTab === "chats" ? <ChatList /> : <ContactList />}
            </div>
          </div>

          {/* MAIN CONTAINT */}
          <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
            {currentChat ? <ChatContainer /> : <NoChatPlaceholder />}
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default ChatPage;
