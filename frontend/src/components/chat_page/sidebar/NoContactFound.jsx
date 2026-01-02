import Logo from "../../../assets/logo.svg?react";

function NoContactFound() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <Logo className="w-28 h-28 mx-auto text-cyan-400" />
      <div>
        <h4 className="text-slate-200 font-medium mb-1">No friends yet</h4>
        <p className="text-slate-400 text-sm px-6">
          Making friends is a great way to start a conversation
        </p>
      </div>
      <button
        onClick={() => {
          // TODO: Open friend request modal
        }}
        className="px-4 py-2 text-sm text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
      >
        Connect friends
      </button>
    </div>
  );
}
export default NoContactFound;
