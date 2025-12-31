import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUserStore } from "../store/useUserStore";
import { LoaderIcon } from "react-hot-toast";

function UserProfilePortal({
  open,
  user,
  onClose,
  onChangePassword,
  onDelete,
}) {
  const [userData, setUserData] = useState(user);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const { updateProfile, isUpdatingProfile } = useUserStore();
  const avatarInputRef = useRef(null);

  if (!open) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setSelectedAvatar(reader.result);
    };
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      formData.append("fullName", userData.fullName);
      formData.append("email", userData.email);

      const file = avatarInputRef.current.files[0];
      if (file) formData.append("avatar", file);

      await updateProfile(formData);
      onClose();
    } catch (error) {
      console.log("Error updating profile", error);
    }
  };

  return createPortal(
    <dialog className="modal modal-open">
      <div className="modal-box bg-slate-900 border border-slate-700">
        {/* CLOSE MODAL */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>

        <form className="space-y-4">
          {/* AVATAR */}
          <div className="w-full flex items-center justify-center">
            <div className="avatar w-24 cursor-pointer">
              <button
                type="button"
                className="group relative w-24 h-24 overflow-hidden rounded-full"
                onClick={() => avatarInputRef.current.click()}
              >
                <img
                  className="rounded-full size-full object-cover"
                  src={
                    selectedAvatar || user.avatar.url || "/images/avatar.png"
                  }
                  alt="avatar"
                />

                {/* overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-s">Change</span>
                </div>
              </button>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* USER INFO */}
          <div className="space-y-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-slate-400">Full name</span>
              </label>
              <input
                type="text"
                value={userData?.fullName || ""}
                onChange={(e) =>
                  setUserData({ ...userData, fullName: e.target.value })
                }
                className="input input-bordered w-full bg-slate-800 user-input"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-slate-400">Email</span>
              </label>
              <input
                type="email"
                value={userData?.email || ""}
                onChange={(e) =>
                  setUserData({ ...userData, email: e.target.value })
                }
                className="input input-bordered w-full bg-slate-800 user-input"
              />
            </div>
          </div>

          <div className="h-4"></div>

          {/* ACTIONS */}
          <button
            className="btn btn-sm btn-outline w-full"
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile}
          >
            {isUpdatingProfile ? (
              <LoaderIcon className="w-full h-5 p-2.5 animate-spin" />
            ) : (
              "Update profile"
            )}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline w-full"
            onClick={onChangePassword}
          >
            Change password
          </button>

          <button
            className="btn btn-sm btn-error w-full mt-3"
            onClick={onDelete}
          >
            Delete account
          </button>
        </form>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>,
    document.body
  );
}

export default UserProfilePortal;
