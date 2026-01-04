import { FileText, Download } from "lucide-react";

const FileMessage = ({ fileUrl, fileName, fileSize, isMyMessage }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const fileExtension = fileName?.split(".").pop().toUpperCase() || "FILE";

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl max-w-[280px] cursor-pointer transition-colors border
        ${
          isMyMessage
            ? "bg-cyan-700 border-cyan-600 hover:bg-cyan-800"
            : "bg-slate-800 border-slate-700 hover:bg-slate-750"
        }`}
      onClick={() => window.open(fileUrl, "_blank")}
    >
      <div
        className={`p-2.5 rounded-lg flex items-center justify-center shrink-0 
          ${isMyMessage ? "bg-black/20 text-cyan-100" : "bg-slate-700 text-cyan-500"}
        `}
      >
        <FileText size={24} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <h4
          className={`text-sm font-semibold truncate ${
            isMyMessage ? "text-white" : "text-slate-200"
          }`}
          title={fileName}
        >
          {fileName}
        </h4>

        <p
          className={`text-xs mt-0.5 truncate ${
            isMyMessage ? "text-cyan-100/70" : "text-slate-400"
          }`}
        >
          {formatFileSize(fileSize)} • {fileExtension}
        </p>
      </div>

      <div
        className={`opacity-0 group-hover:opacity-100 transition-opacity ${isMyMessage ? "text-white" : "text-slate-400"}`}
      >
        <Download size={20} />
      </div>
    </div>
  );
};

export default FileMessage;
