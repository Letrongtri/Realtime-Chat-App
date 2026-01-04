import Logo from "../../../assets/logo.svg?react";

function NoChatPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 mb-6">
      <Logo className="w-28 h-28 mx-auto text-cyan-400" />
      <h3 className="text-xl font-semibold text-slate-200 mb-2">
        Select a conversation
      </h3>
      <p className="text-slate-400 max-w-md">
        Choose a contact from the sidebar to start chatting or continue a
        previous conversation.
      </p>
    </div>
  );
}

export default NoChatPlaceholder;
