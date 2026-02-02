import type { Player } from "./player.ts";

export interface Lobby {
    lobbyId: string;
    players: Record<string, Player>;
    lobbyHost: string;
}