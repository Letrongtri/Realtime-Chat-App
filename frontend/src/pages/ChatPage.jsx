import BorderAnimatedContainer from "../components/common/BorderAnimatedContainer";
import ActiveTabSwitch from "../components/chat_page/sidebar/ActiveTabSwitch";
import ChatContainer from "../components/chat_page/chat_detail/ChatContainer";
import ChatList from "../components/chat_page/sidebar/ChatList";
import ContactList from "../components/chat_page/sidebar/ContactList";
import NoChatPlaceholder from "../components/chat_page/chat_detail/NoChatPlaceholder";
import ProfileHeader from "../components/chat_page/profile/ProfileHeader";
import { useChatStore } from "../store/useChatStore";
import { useSettingStore } from "../store/useSettingStore";
import SearchSection from "../components/chat_page/search/SearchSection";
import SearchPreview from "../components/chat_page/search/SearchPreview";

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
            <SearchSection />

            {activeTab === "search" ? (
              <SearchPreview />
            ) : (
              <div className="border-top">
                <ActiveTabSwitch />

                <div className="flex-1 overflow-y-auto p-4 space-y-2 border-top">
                  {activeTab === "chats" ? <ChatList /> : <ContactList />}
                </div>
              </div>
            )}
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
