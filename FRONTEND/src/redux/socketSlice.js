import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
  name: "socketio",
  initialState: {
    connected: false,
  },
  reducers: {
    setSocketConnected: (state, action) => {
      state.connected = action.payload;
    },
  },
});

let socketInstance = null;

export const setSocketInstance = (socket) => {
  socketInstance = socket;
};

export const getSocketInstance = () => socketInstance;
export const { setSocketConnected } = socketSlice.actions;
export default socketSlice.reducer;
