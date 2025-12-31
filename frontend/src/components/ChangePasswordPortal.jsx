import { createPortal } from "react-dom";
import { LoaderIcon } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useState } from "react";

function ChangePasswordPortal({ open, onClose }) {
  const { changePassword, isChangingPassword } = useAuthStore();
  const [data, setData] = useState({ oldPassword: "", newPassword: "" });

  if (!open) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await changePassword(data);
      onClose();
    } catch (error) {
      console.log("Error changing password", error);
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
          {/* USER INFO */}
          <div className="space-y-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-slate-400">Old Password</span>
              </label>
              <input
                type="password"
                onChange={(e) =>
                  setData({ ...data, oldPassword: e.target.value })
                }
                className="input input-bordered w-full bg-slate-800 user-input"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-slate-400">New Password</span>
              </label>
              <input
                type="password"
                onChange={(e) =>
                  setData({ ...data, newPassword: e.target.value })
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
            disabled={isChangingPassword}
          >
            {isChangingPassword ? (
              <LoaderIcon className="w-full h-5 p-2.5 animate-spin" />
            ) : (
              "Change Password"
            )}
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

export default ChangePasswordPortal;
