import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(BASE_URL, {
            auth: { token: localStorage.getItem("token") },
            autoConnect: false,
        });
    }
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    // Refresh auth token before connecting
    s.auth = { token: localStorage.getItem("token") };
    s.connect();
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
