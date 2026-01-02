import { useSearchStore } from "../../../store/useSearchStore";
import PageLoader from "../../common/PageLoader";

function SearchPreview() {
  const { users, isSearching } = useSearchStore();
  return (
    <div className="border-top">
      {isSearching ? (
        <PageLoader />
      ) : (
        <pre>{JSON.stringify(users, null, 2)}</pre>
      )}
      ;
    </div>
  );
}

export default SearchPreview;
