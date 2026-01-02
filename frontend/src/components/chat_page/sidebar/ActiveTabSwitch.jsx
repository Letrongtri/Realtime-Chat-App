import { useSettingStore } from "../../../store/useSettingStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useSettingStore();
  return (
    <div className="grid grid-cols-2 gap-2 bg-transparent mx-4 my-2">
      <button
        onClick={() => setActiveTab("chats")}
        className={activeTab === "chats" ? "app-tab-active" : "app-tab"}
      >
        Chats
      </button>
      <button
        onClick={() => setActiveTab("contacts")}
        className={activeTab === "contacts" ? "app-tab-active" : "app-tab"}
      >
        Contacts
      </button>
    </div>
  );
}

export default ActiveTabSwitch;
