import { SearchIcon, UserPlus2Icon, Users2Icon } from "lucide-react";
import { useState } from "react";
import { useSettingStore } from "../../../store/useSettingStore";
import { useSearchStore } from "../../../store/useSearchStore";

function SearchSection() {
  const { activeTab, setActiveTab } = useSettingStore();
  const [searchValue, setSearchValue] = useState("");
  const { searchUsers } = useSearchStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchValue) return;
    await searchUsers(searchValue);
  };

  return (
    <div className="flex items-center gap-4 mx-4 my-2">
      {/* SEARCH BAR */}
      <div className="relative flex-1">
        <form onSubmit={handleSubmit}>
          <button type="submit" className="icon-btn">
            <SearchIcon className="input-icon" />
          </button>

          <input
            type="search"
            value={searchValue}
            onFocus={() => setActiveTab("search")}
            onChange={(e) => setSearchValue(e.target.value)}
            className="search-input"
            placeholder="Search"
          />
        </form>
      </div>

      {/* BUTTONS */}
      {activeTab === "search" ? (
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          className="icon-btn"
        >
          Close
        </button>
      ) : (
        <div className="flex gap-4 items-center">
          <button className="icon-btn">
            <UserPlus2Icon className="size-5" />
          </button>

          <button className="icon-btn">
            <Users2Icon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchSection;
