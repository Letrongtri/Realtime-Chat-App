import { useEffect, useRef, useState } from "react";
import useKeyboardSound from "../../../hooks/useKeyboardSound";
import { useChatStore } from "../../../store/useChatStore";
import { useSettingStore } from "../../../store/useSettingStore";
import EmojiPicker from "emoji-picker-react";
import toast, { LoaderIcon } from "react-hot-toast";
import {
  ImageIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  VideoIcon,
  XIcon,
  FileIcon,
  SquareStopIcon,
  PlusIcon,
} from "lucide-react";

function MessageInput() {
  const { playRandomSound } = useKeyboardSound();
  const { sendMessage, isSendingMessage } = useChatStore();
  const { isSoundEnabled } = useSettingStore();

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null); // For audio, video, file messages

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const hasContent =
      text.trim() || selectedImages.length > 0 || selectedMedia;
    if (!hasContent) return;

    if (isSoundEnabled) playRandomSound();

    try {
      const payload = {
        text: text.trim(),
        images:
          selectedImages.length > 0
            ? selectedImages.map((img) => img.file)
            : [],
        media: selectedMedia
          ? { file: selectedMedia.file, type: selectedMedia.type }
          : null,
      };

      await sendMessage(payload);

      //   Reset form
      setText("");
      setSelectedImages([]);
      setSelectedMedia(null);
      setShowEmojiPicker(false);

      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.log("Error sending message", error);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (selectedMedia) setSelectedMedia(null);

    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setSelectedImages((prev) => {
      const newImages = prev.filter((_, index) => index !== indexToRemove);
      if (newImages.length === 0 && imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      return newImages;
    });
  };

  const handleMediaChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (selectedImages.length > 0) setSelectedImages([]);

    setSelectedMedia({
      type,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setSelectedImages([]);
      setSelectedMedia(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioFile = new File([audioBlob], "voice_message.webm", {
            type: "audio/webm",
          });

          setSelectedMedia({
            type: "audio",
            file: audioFile,
            url: audioUrl,
            name: "Voice Message",
          });
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Mic error:", error);
        toast.error("Error accessing your microphone.");
      }
    }
  };

  // --- EMOJI ---
  const handleEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="px-4 py-2 border-t border-slate-700/50">
      {/* IMAGE PREVIEW */}
      {selectedImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 mb-2 px-1">
          {selectedImages.map((img, index) => (
            <div key={index} className="relative shrink-0 group">
              <img
                src={img.url}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-slate-700"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-slate-600 shadow-sm"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-20 h-20 flex items-center justify-center rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-500 transition-colors shrink-0"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* VIDEO/FILE/AUDIO PREVIEW */}
      {selectedMedia && (
        <div className="mx-auto mb-3 flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg w-fit max-w-full relative">
          {/* VIDEO */}
          {selectedMedia.type === "video" && (
            <video
              src={selectedMedia.url}
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
          )}

          {/* FILE / AUDIO */}
          {(selectedMedia.type === "file" ||
            selectedMedia.type === "audio") && (
            <div className="w-20 h-20 flex flex-col items-center justify-center bg-slate-700 rounded-lg border border-slate-600">
              {selectedMedia.type === "audio" ? (
                <MicIcon className="w-8 h-8 text-cyan-400" />
              ) : (
                <FileIcon className="w-8 h-8 text-slate-300" />
              )}
              <span className="text-[10px] text-slate-300 truncate w-full px-1 text-center">
                {selectedMedia.name}
              </span>
            </div>
          )}

          <button
            onClick={removeMedia}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-md transition-colors"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* HIDDEN INPUTS */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={imageInputRef}
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        type="file"
        accept="video/*"
        ref={videoInputRef}
        onChange={(e) => handleMediaChange(e, "video")}
        className="hidden"
      />
      <input
        type="file"
        accept="*"
        ref={fileInputRef}
        onChange={(e) => handleMediaChange(e, "file")}
        className="hidden"
      />

      <form
        onSubmit={handleSendMessage}
        className="mx-auto flex flex-col gap-2"
      >
        <div className="flex gap-2">
          {/* Nút ẢNH */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="message-icon-btn py-2 group"
          >
            <ImageIcon className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Nút VIDEO */}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="message-icon-btn py-2 group"
          >
            <VideoIcon className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Nút GHI ÂM */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`message-icon-btn py-2 group transition-all ${isRecording ? "bg-red-500/20 text-red-500 animate-pulse" : ""}`}
          >
            {isRecording ? (
              <SquareStopIcon className="w-5 h-5 fill-current" />
            ) : (
              <MicIcon className="w-5 h-5 group-hover:text-cyan-400" />
            )}
          </button>

          {/* Nút FILE */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="message-icon-btn py-2 group"
          >
            <PaperclipIcon className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
          </button>
        </div>

        <div className="flex gap-2 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              isSoundEnabled && playRandomSound();
            }}
            disabled={isRecording}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 placeholder-slate-500 disabled:opacity-50"
            placeholder={isRecording ? "Đang ghi âm..." : "Nhập tin nhắn..."}
          />

          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              className={`message-icon-btn h-full ${showEmojiPicker ? "text-yellow-400" : ""}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmileIcon className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-50 shadow-xl border border-slate-700 rounded-xl overflow-hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            // Disable nếu không có text VÀ không có ảnh VÀ không có media khác
            disabled={
              (!text.trim() && selectedImages.length === 0 && !selectedMedia) ||
              isRecording ||
              isSendingMessage
            }
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSendingMessage ? (
              <LoaderIcon className="w-full h-5 p-2.5 animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
