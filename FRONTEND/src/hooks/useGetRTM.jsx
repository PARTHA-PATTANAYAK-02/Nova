import {
  markMessagesAsSeenByReader,
  updateMessageReactions,
  updateMessageStatus,
  deleteMessageForEveryone,
  deleteMessageForMe,
} from "@/redux/chatSlice";
import { getSocketInstance } from "@/redux/socketSlice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { connected } = useSelector((store) => store.socketio);
  const { selectedUser, user } = useSelector((store) => store.auth);
  const socket = getSocketInstance();
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!selectedUser) return;

    const handleMessageStatus = (statusUpdate) => {
      dispatch(updateMessageStatus(statusUpdate));
    };

    const handleMessageReactionUpdate = (reactionUpdate) => {
      const participants = [reactionUpdate.senderId, reactionUpdate.receiverId];
      if (
        participants.includes(user?._id?.toString()) &&
        participants.includes(selectedUser._id.toString())
      ) {
        dispatch(
          updateMessageReactions({
            ...reactionUpdate,
            conversationUserId: selectedUser._id.toString(),
          })
        );
      }
    };

    const handleUserTyping = ({ userId }) => {
      if (userId === selectedUser._id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = ({ userId }) => {
      if (userId === selectedUser._id) {
        setIsTyping(false);
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
      setIsTyping(false);
    };
  }, [selectedUser, user?._id, dispatch, socket, connected]);

  return { isTyping };
};

export default useGetRTM;
