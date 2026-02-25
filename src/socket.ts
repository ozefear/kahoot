import { io } from "socket.io-client";

// In development, the socket server is on the same host/port.
// In production, it's also on the same host/port.
export const socket = io();
