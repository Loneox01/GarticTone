import type { Player } from "./player.ts";

export interface Lobby {
    lobbyId: string;
    players: Record<string, Player>;
    lobbyHost: string;
    gameMode: string;
    settings: Record<string, any>;
}