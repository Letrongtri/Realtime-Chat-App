import { useState } from "react";
import { LogOutIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import { useSettingStore } from "../../../store/useSettingStore";
import { useUserStore } from "../../../store/useUserStore";
import UserProfilePortal from "./UserProfilePortal";
import ChangePasswordPortal from "../../users/ChangePasswordPortal";
import ConfirmDialog from "../../common/ConfirmDialog";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

function ProfileHeader() {
  const { logout, authUser } = useAuthStore();
  const { isSoundEnabled, tonggleSound } = useSettingStore();
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const { deleteProfile } = useUserStore();

  const handleDeleteProfile = async () => {
    try {
      await deleteProfile();
    } catch (error) {
      console.log("Error deleting profile", error);
    }
  };

  return (
    <div className="p-5 border-b border-slate-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* AVATAR */}
          <div
            className="avatar online w-12 h-12 cursor-pointer"
            onClick={() => setOpenProfile(true)}
          >
            <img
              className="rounded-full size-full object-cover"
              src={authUser?.avatar?.url || "/images/avatar.png"}
              alt="avatar"
            />
          </div>

          {/* USERNAME & ONLINE STATUS */}
          <div>
            <h3 className="text-slate-200 font-medium text-base max-w-[180px] truncate">
              {authUser?.fullName}
            </h3>
            <p className="text-sm text-slate-400">Online</p>
          </div>
        </div>
        {/* ACTIONS */}
        <div className="flex gap-4 items-center">
          {/* SOUNDS */}
          <button
            className="icon-btn"
            onClick={() => {
              mouseClickSound.currentTime = 0; // Reset the audio
              mouseClickSound
                .play()
                .catch((error) => console.log("Audio play failed:", error));
              tonggleSound();
            }}
          >
            {isSoundEnabled ? (
              <Volume2Icon className="size-5" />
            ) : (
              <VolumeOffIcon className="size-5" />
            )}
          </button>

          {/* LOGOUT */}
          <button
            className="icon-btn"
            onClick={() => setOpenLogoutDialog(true)}
          >
            <LogOutIcon className="size-5"></LogOutIcon>
          </button>
        </div>

        <UserProfilePortal
          key={"user-modal-key"}
          open={openProfile}
          user={authUser}
          onClose={() => setOpenProfile(false)}
          onChangePassword={() => {
            setOpenChangePassword(true);
            setOpenProfile(false);
          }}
          onDelete={() => {
            setOpenDeleteDialog(true);
            setOpenProfile(false);
          }}
        />

        <ConfirmDialog
          key={"logout-dialog-key"}
          open={openLogoutDialog}
          title="Confirm logout"
          message="Are you sure you want to log out?"
          cancelText="Cancel"
          confirmText="Log out"
          onCancel={() => setOpenLogoutDialog(false)}
          onConfirm={() => {
            setOpenLogoutDialog(false);
            logout();
          }}
        />

        <ConfirmDialog
          key={"delete-dialog-key"}
          open={openDeleteDialog}
          title="Confirm Delete Account"
          message="Are you sure you want to delete your account?"
          cancelText="Cancel"
          confirmText="Delete"
          onCancel={() => setOpenDeleteDialog(false)}
          onConfirm={() => {
            setOpenDeleteDialog(false);
            handleDeleteProfile();
            setOpenProfile(false);
            logout();
          }}
        />

        <ChangePasswordPortal
          open={openChangePassword}
          onClose={() => {
            setOpenChangePassword(false);
            setOpenProfile(true);
          }}
        />
      </div>
    </div>
  );
}

export default ProfileHeader;
