import { setMessages, updateMessageStatus } from "@/redux/chatSlice";
import { getSocketInstance } from "@/redux/socketSlice";
import { useEffect } from "react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { connected } = useSelector((store) => store.socketio);
  const { messages } = useSelector((store) => store.chat);
  const { selectedUser, user } = useSelector((store) => store.auth);
  const socket = getSocketInstance();
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!selectedUser) return; // Prevent errors if selectedUser is not set

    const handleMessageStatus = (statusUpdate) => {
      dispatch(updateMessageStatus(statusUpdate));
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
      if (readerId === selectedUser._id) {
        dispatch(
          setMessages(
            messages.map((message) =>
              message.senderId === user?._id
                ? {
                    ...message,
                    status: "seen",
                    readAt: new Date().toISOString(),
                  }
                : message,
            ),
          ),
        );
      }
    };

    socket?.on("userTyping", handleUserTyping);
    socket?.on("userStoppedTyping", handleUserStoppedTyping);
    socket?.on("messagesRead", handleMessagesRead);
    socket?.on("messageStatus", handleMessageStatus);

    return () => {
      socket?.off("userTyping", handleUserTyping);
      socket?.off("userStoppedTyping", handleUserStoppedTyping);
      socket?.off("messagesRead", handleMessagesRead);
      socket?.off("messageStatus", handleMessageStatus);
      setIsTyping(false);
    };
  }, [messages, selectedUser, user?._id, dispatch, socket, connected]);

  return { isTyping };
};

export default useGetRTM;
