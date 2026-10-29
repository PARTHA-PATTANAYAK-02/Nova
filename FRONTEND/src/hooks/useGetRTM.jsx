import {
  markMessagesAsSeenByReader,
  updateMessageReactions,
  updateMessageStatus,
  deleteMessageForEveryone,
  deleteMessageForMe,
  setUserTyping,
  setUserStoppedTyping,
} from "@/redux/chatSlice";
import { getSocketInstance } from "@/redux/socketSlice";
import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatTypingIndicator } from "@/lib/utils";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { connected } = useSelector((store) => store.socketio);
  const { selectedUser, user } = useSelector((store) => store.auth);
  const typingUsersMap = useSelector((store) => store.chat.typingUsers || {});
  const socket = getSocketInstance();
  const typingTimeoutsRef = useRef({});

  useEffect(() => {
    if (!selectedUser) return;

    const handleMessageStatus = (statusUpdate) => {
      dispatch(updateMessageStatus(statusUpdate));
    };

    const handleMessageReactionUpdate = (reactionUpdate) => {
      const isForCurrentChat =
        (reactionUpdate.conversationId &&
          (reactionUpdate.conversationId.toString() === selectedUser._id?.toString() ||
            reactionUpdate.conversationId.toString() === selectedUser.conversationId?.toString())) ||
        (reactionUpdate.senderId &&
          [reactionUpdate.senderId, reactionUpdate.receiverId].includes(selectedUser._id?.toString()));

      if (isForCurrentChat) {
        dispatch(
          updateMessageReactions({
            ...reactionUpdate,
            conversationUserId: selectedUser._id.toString(),
          })
        );
      }
    };

    const handleUserTyping = (data) => {
      const { userId, conversationId, user: typingUser } = data || {};
      const uidStr = (userId || typingUser?._id)?.toString();
      if (!uidStr || uidStr === user?._id?.toString()) return;

      const targetChatIds = [];
      if (conversationId) targetChatIds.push(conversationId.toString());
      targetChatIds.push(uidStr);

      let cleanUser = typingUser || {};
      // If we are currently in this group, enrich user info from group participants
      if (selectedUser?.isGroup && selectedUser.participants) {
        const found = selectedUser.participants.find(
          (p) => (p?._id || p)?.toString() === uidStr
        );
        if (found && typeof found === "object") {
          cleanUser = {
            ...cleanUser,
            fullName: found.fullName || cleanUser.fullName,
            username: found.username || cleanUser.username,
            profilePicture: found.profilePicture || cleanUser.profilePicture,
          };
        }
      }

      const formattedUser = {
        userId: uidStr,
        fullName: cleanUser.fullName || "",
        username: cleanUser.username || "",
        profilePicture: cleanUser.profilePicture || "",
      };

      for (const cid of targetChatIds) {
        dispatch(setUserTyping({ chatId: cid, user: formattedUser }));

        const timeoutKey = `${cid}_${uidStr}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
        }
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          dispatch(setUserStoppedTyping({ chatId: cid, userId: uidStr }));
          delete typingTimeoutsRef.current[timeoutKey];
        }, 3500);
      }
    };

    const handleUserStoppedTyping = (data) => {
      const { userId, conversationId } = data || {};
      const uidStr = (userId || data?._id)?.toString();
      if (!uidStr) return;

      const targetChatIds = [];
      if (conversationId) targetChatIds.push(conversationId.toString());
      targetChatIds.push(uidStr);

      for (const cid of targetChatIds) {
        const timeoutKey = `${cid}_${uidStr}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
          delete typingTimeoutsRef.current[timeoutKey];
        }
        dispatch(setUserStoppedTyping({ chatId: cid, userId: uidStr }));
      }
    };

    const handleMessagesRead = ({ readerId }) => {
      if (readerId?.toString() === selectedUser._id?.toString()) {
        dispatch(markMessagesAsSeenByReader({ readerId }));
      }
    };

    const handleDeletedForEveryone = ({ messageId, deletedAt }) => {
      if (messageId) {
        dispatch(deleteMessageForEveryone({ messageId, deletedAt }));
      }
    };

    const handleDeletedForMe = ({ messageId }) => {
      if (messageId) {
        dispatch(deleteMessageForMe({ messageId }));
      }
    };

    socket?.on("userTyping", handleUserTyping);
    socket?.on("userStoppedTyping", handleUserStoppedTyping);
    socket?.on("messagesRead", handleMessagesRead);
    socket?.on("messageStatus", handleMessageStatus);
    socket?.on("messageReactionUpdated", handleMessageReactionUpdate);
    socket?.on("messageDeletedForEveryone", handleDeletedForEveryone);
    socket?.on("messageDeletedForMe", handleDeletedForMe);

    return () => {
      socket?.off("userTyping", handleUserTyping);
      socket?.off("userStoppedTyping", handleUserStoppedTyping);
      socket?.off("messagesRead", handleMessagesRead);
      socket?.off("messageStatus", handleMessageStatus);
      socket?.off("messageReactionUpdated", handleMessageReactionUpdate);
      socket?.off("messageDeletedForEveryone", handleDeletedForEveryone);
      socket?.off("messageDeletedForMe", handleDeletedForMe);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [selectedUser, user?._id, dispatch, socket, connected]);

  const currentChatTypingUsers = useMemo(() => {
    if (!selectedUser) return [];
    const directList = typingUsersMap[selectedUser._id?.toString()] || [];
    const convList = selectedUser.conversationId
      ? typingUsersMap[selectedUser.conversationId?.toString()] || []
      : [];
    const map = new Map();
    [...directList, ...convList].forEach((u) => {
      const uid = (u?.userId || u?._id)?.toString();
      if (uid && uid !== user?._id?.toString()) {
        map.set(uid, u);
      }
    });
    return Array.from(map.values());
  }, [typingUsersMap, selectedUser, user?._id]);

  const isTyping = currentChatTypingUsers.length > 0;
  const typingText = useMemo(() => {
    if (!isTyping) return "";
    return formatTypingIndicator(currentChatTypingUsers, user?._id);
  }, [currentChatTypingUsers, isTyping, user?._id]);

  return { isTyping, typingText, currentChatTypingUsers, typingUsers: typingUsersMap };
};

export default useGetRTM;
