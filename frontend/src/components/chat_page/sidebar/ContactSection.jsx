import { useState } from "react";
import { ChevronRight } from "lucide-react";

const ContactSection = ({
  title,
  childrenCount,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1 p-2 hover:bg-slate-800/50 transition-colors cursor-pointer group"
      >
        {/* ICON */}
        <ChevronRight
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide group-hover:text-white">
          {title} {childrenCount > 0 && `(${childrenCount})`}
        </span>
      </button>

      {/* CONTENT */}
      {isOpen && (
        <div className="pl-2 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default ContactSection;
