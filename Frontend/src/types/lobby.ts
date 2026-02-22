import type { Player } from "./player.ts";

export interface Lobby {
    // Basic Info
    lobbyId: string;      // maps to room_code in DB
    lobbyHost: string;    // maps to host_nickname
    players: Record<string, Player>;

    // Game Configuration
    gameMode: string;     // maps to game_mode
    settings: Record<string, any>;

    gameStarted: boolean; // maps to game_started
    roundNum: number;     // maps to round_num (1, 2, 3...)
    numRounds: number;    // maps to num_rounds (usually total player count)
    recList: any[][];     // maps to rec_list (The actual audio/note data)
}