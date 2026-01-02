import { memo } from "react";
import { formatMessageTime } from "../../../lib/dateFns";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  generateChatAvatarPath,
  generateChatName,
  generatePreviewMessage,
} from "../../../utils/generate";

function ChatItems({ chat, onSelectchat }) {
  const { authUser } = useAuthStore();
  return (
    <div
      key={chat._id}
      onClick={() => onSelectchat(chat._id)}
      className="cursor-pointer bg-cyan-500/10 p-3 rounded-lg hover:bg-cyan-500/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* TODO: Fix online status with socket */}
        <div className={`avatar online`}>
          <div className="size-12 rounded-full">
            <img
              src={generateChatAvatarPath(chat, authUser._id)}
              alt="avatar"
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex gap-2">
            <h4 className="text-slate-200 font-medium truncate pb-1 flex-1">
              {generateChatName(chat, authUser._id)}
            </h4>
            <p className="text-slate-400 text-xs">
              {chat?.latestMessage?.updatedAt
                ? formatMessageTime(chat.latestMessage.updatedAt)
                : formatMessageTime(chat.updatedAt)}
            </p>
          </div>

          <p className="text-slate-400 text-sm truncate">
            {chat?.latestMessage
              ? generatePreviewMessage(chat.latestMessage, authUser._id)
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(ChatItems);
