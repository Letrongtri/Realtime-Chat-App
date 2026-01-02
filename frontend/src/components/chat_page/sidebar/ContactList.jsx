import { useEffect } from "react";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoContactFound from "./NoContactFound";
import { useContactStore } from "../../../store/useContactStore";
import { User, Users, Bell } from "lucide-react";
import ContactSection from "./ContactSection";
import { formatMessageTime } from "../../../lib/dateFns";

function ContactList() {
  const { friends, groups, requests, isLoading, getContacts, selectContact } =
    useContactStore();

  useEffect(() => {
    getContacts();
  }, [getContacts]);

  if (isLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="w-full h-full select-none flex flex-col pr-2">
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* FRIENDS SECTION */}
        <ContactSection title="Friends" childrenCount={friends.length}>
          <ul className="space-y-1">
            {friends.length === 0 && <NoContactFound />}
            {friends.map((friend) => (
              <li
                key={friend._id}
                onClick={() => selectContact()}
                className="flex items-center gap-2 px-3 py-1 text-sm text-slate-400 hover:bg-slate-700 hover:text-cyan-400 cursor-pointer rounded-sm"
              >
                <User size={14} />
                <span>{friend.fullName}</span>

                {/* TODO: FIX ONLINE STATUS */}
                <div className="user-online"></div>
              </li>
            ))}
          </ul>
        </ContactSection>

        {/* GROUPS SECTION */}
        <ContactSection title="Groups" childrenCount={groups.length}>
          <ul className="space-y-1">
            {groups.length > 0 ? (
              groups.map((group) => (
                <li
                  key={group._id}
                  onClick={() => selectContact(group._id)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-slate-400 hover:bg-slate-700 hover:text-cyan-400 cursor-pointer rounded-sm"
                >
                  <Users size={14} />
                  <span>{group.groupName}</span>
                </li>
              ))
            ) : (
              <li className="px-3 py-1 text-xs text-slate-600 italic">
                No groups yet
              </li>
            )}
          </ul>
        </ContactSection>

        {/* REQUEST SECTION */}
        <ContactSection title="Requests" childrenCount={requests.length}>
          <ul className="space-y-1">
            {requests.length > 0 ? (
              requests.map((req) => (
                <li
                  key={req._id}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-slate-400 hover:bg-slate-700 hover:text-yellow-400 cursor-pointer rounded-sm"
                >
                  <Bell size={14} />
                  <div className="flex-1">
                    <div className="flex gap-2 pb-1">
                      <h4 className="font-medium truncate flex-1">
                        {req.senderId.fullName}
                      </h4>
                      <p className="text-xs">
                        {formatMessageTime(req.updatedAt)}
                      </p>
                    </div>

                    <p className="text-xs">
                      {req.requestMessage && req.requestMessage.length > 20
                        ? req.requestMessage.slice(0, 20) + "..."
                        : req.requestMessage}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-1 text-xs text-slate-600 italic">
                No new requests
              </li>
            )}
          </ul>
        </ContactSection>
      </div>
    </div>
  );
}

export default ContactList;
