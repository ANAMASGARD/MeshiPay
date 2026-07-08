/** Default export for TypeScript; Metro resolves `.native` / `.web` at bundle time. */
export {
  broadcast,
  ensureP2PWorklet,
  joinRoom,
  leaveRoom,
  shutdownP2PWorklet,
  useP2PRoom,
} from './p2p-room.web';
