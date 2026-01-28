import { io } from "socket.io-client";

// URL of backend server
const URL = "http://localhost:8000";

export const socket = io(URL, {
    autoConnect: false // connect on click
});