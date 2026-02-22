export interface Player {
    nickname: string;

    player_index: number;    // Used to calculate which recording to send them
    ready: boolean;         // Used by the Host to know when to advance the round

    assigned_prompt?: string; // The song name or prompt they start with
}