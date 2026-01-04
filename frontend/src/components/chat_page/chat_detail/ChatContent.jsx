import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import {
  formatMessageDate,
  formatTime,
  getTimeDiffInMinutes,
} from "../../../lib/dateFns";
import { useAuthStore } from "../../../store/useAuthStore";
import { useChatStore } from "../../../store/useChatStore";
import { generateChatName } from "../../../utils/generate";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import AudioMessage from "./AudioMessage";
import FileMessage from "./FileMessage";

function ChatContent() {
  const { authUser } = useAuthStore();
  const { messages, currentChat, isMessagesLoading, getMessages } =
    useChatStore();

  const messageEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const scrollRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBottomInstant = () => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const currentScrollHeight = container.scrollHeight;
    const prevScrollHeight = prevScrollHeightRef.current;

    if (prevScrollHeight > 0 && currentScrollHeight < prevScrollHeight) {
      container.scrollTop = currentScrollHeight - prevScrollHeight;
      prevScrollHeightRef.current = 0;
      return;
    }

    if (isInitialLoadRef.current) {
      scrollToBottomInstant();
      isInitialLoadRef.current = false;
      return;
    }

    scrollToBottom();
  }, [messages]);

  const handleScroll = async () => {
    const container = scrollRef.current;
    if (!container || isMessagesLoading) return;

    if (container.scrollTop === 0) {
      prevScrollHeightRef.current = container.scrollHeight;
      await getMessages(currentChat._id);
    }
  };

  useEffect(() => {
    isInitialLoadRef.current = true;
    prevScrollHeightRef.current = 0;
  }, [currentChat._id]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 px-6 overflow-y-auto py-8"
    >
      {messages.length > 0 ? (
        <div className="mx-auto space-y-6">
          {messages.map((message, index) => {
            const isMyMessage = message.senderId._id === authUser._id;
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            let showDivider = false;
            let showMessageTime = false;
            if (!prevMessage) {
              showDivider = true;
            } else {
              const timeDiff = getTimeDiffInMinutes(
                message.createdAt,
                prevMessage.createdAt
              );
              if (timeDiff > 45) {
                showDivider = true;
              }
            }

            if (!nextMessage) {
              showMessageTime = true;
            } else {
              const timeDiff = getTimeDiffInMinutes(
                nextMessage.createdAt,
                message.createdAt
              );
              if (timeDiff > 3) {
                showMessageTime = true;
              }
            }

            const messageType = message.messageType;

            return (
              <Fragment key={message._id}>
                {showDivider && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
                      {formatMessageDate(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  key={message._id}
                  className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
                >
                  {!isMyMessage && (
                    <div className="chat-image avatar">
                      <div className="w-10 rounded-full">
                        <img
                          alt={message.senderId.name}
                          src={
                            message.senderId?.avatar?.url ||
                            "/images/avatar.png"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {currentChat.isGroup && !isMyMessage && (
                    <div className="chat-header">
                      <h3 className="font-semibold">{message.senderId.name}</h3>
                    </div>
                  )}

                  {messageType === "text" && (
                    <div
                      className={`chat-bubble relative ${
                        isMyMessage
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {messageType === "image" && message.image?.length > 0 && (
                    <div className="chat-bubble p-0 bg-transparent overflow-hidden shadow-sm">
                      <div
                        className={`grid gap-0.5 ${message.image.length < 3 ? `grid-cols-${message.image.length}` : "grid-cols-3"}`}
                      >
                        {message.image.map((image, index) => (
                          <div
                            key={`${message._id}-${image.url}-${index}`}
                            className={"relative"}
                          >
                            <img
                              src={image.url || "/images/image_placeholder.png"}
                              alt="img"
                              className={`w-full h-full object-cover cursor-pointer hover:brightness-90 ${message.image.length === 1 ? "rounded-lg max-h-[300px] w-auto" : ""}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messageType === "video" && (
                    <div className="chat-bubble p-0 bg-transparent overflow-hidden shadow-sm">
                      <video controls>
                        <source src={message.video?.url} type="video/mp4" />
                      </video>
                    </div>
                  )}

                  {messageType === "audio" && (
                    <div
                      className={`chat-bubble p-0 bg-transparent shadow-none ${isMyMessage ? "chat-bubble-primary" : ""}`}
                    >
                      <AudioMessage
                        src={message.audio.url} // Hoặc message.text nếu bạn lưu link audio trong text
                        isMyMessage={isMyMessage}
                      />
                    </div>
                  )}

                  {messageType === "file" && (
                    <div className="chat-bubble p-0 bg-transparent shadow-none">
                      <FileMessage
                        fileUrl={message.file.url}
                        fileName={message.file.name || "Attachment"}
                        fileSize={message.file.size}
                        isMyMessage={isMyMessage}
                      />
                    </div>
                  )}

                  {showMessageTime && (
                    <div className="chat-footer opacity-50 flex items-center gap-2">
                      <time className="text-xs">
                        {formatTime(message.createdAt)}
                      </time>
                      {isMyMessage && <span className="text-xs">Seen</span>}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}

          <div ref={messageEndRef} />
        </div>
      ) : (
        <NoChatHistoryPlaceholder
          name={generateChatName(currentChat, authUser._id)}
        />
      )}
    </div>
  );
}

export default ChatContent;
