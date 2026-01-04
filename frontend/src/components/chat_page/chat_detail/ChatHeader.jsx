import { useEffect } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { useChatStore } from "../../../store/useChatStore";
import {
  generateChatAvatarPath,
  generateChatName,
} from "../../../utils/generate";
import {
  MoreVerticalIcon,
  PhoneIcon,
  SearchIcon,
  VideoIcon,
} from "lucide-react";

function ChatHeader() {
  const { authUser } = useAuthStore();
  const { currentChat, refreshChat } = useChatStore();

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        refreshChat();
      }
    };

    window.addEventListener("keydown", handleEscKey);

    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [refreshChat]);

  const currentUserId = authUser._id;

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[68px] px-6 flex-1">
      <div className="flex items-center gap-3">
        <div
          className="avatar online w-12 h-12 cursor-pointer"
          onClick={() => {}}
        >
          <img
            className="rounded-full size-full object-cover"
            src={generateChatAvatarPath(currentChat, currentUserId)}
            alt="avatar"
          />
        </div>

        <div className="flex-1">
          <h3 className="text-slate-200 font-medium text-base flex-1 truncate">
            {generateChatName(currentChat, currentUserId)}
          </h3>
          <p className="text-sm text-slate-400 truncate">Online</p>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-4 items-center flex-shrink-0">
        {/* CALL */}
        <button className="icon-btn" onClick={() => {}}>
          <PhoneIcon className="size-5" />
        </button>

        {/* VIDEO CALL */}
        <button className="icon-btn" onClick={() => {}}>
          <VideoIcon className="size-5" />
        </button>

        {/* SEARCH MESSAGE */}
        <button className="icon-btn" onClick={() => {}}>
          <SearchIcon className="size-5" />
        </button>

        {/* MORE OPTIONS */}
        <button className="icon-btn" onClick={() => {}}>
          <MoreVerticalIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
