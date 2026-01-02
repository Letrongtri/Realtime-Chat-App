export const generateChatName = (chat, currentUserId) => {
  if (chat.isGroup) {
    return chat.groupName;
  } else {
    return chat.members.find((member) => member._id !== currentUserId).fullName;
  }
};

export const generateChatAvatarPath = (chat, currentUserId) => {
  if (chat.isGroup) {
    return chat?.groupAvatar?.url || "/images/group_avatar.png";
  } else {
    return (
      chat.members.find((member) => member._id !== currentUserId)?.avatar
        ?.url || "/images/avatar.png"
    );
  }
};

export const generatePreviewMessage = (message, currentUserId) => {
  var sender = "";

  if (message.senderId !== currentUserId) {
    sender = `${message.senderId}: `;
  }
  if (message.messageType === "text") {
    return sender + message.text;
  } else if (message.messageType === "image") {
    return sender + "Image";
  } else if (message.messageType === "video") {
    return sender + "Video";
  } else if (message.messageType === "audio") {
    return sender + "Audio";
  } else if (message.messageType === "file") {
    return sender + "File";
  } else {
    return "Unknown";
  }
};
