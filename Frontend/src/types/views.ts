export const GAME_VIEWS = {
    HOME: 'HOME',
    LOBBY: 'LOBBY',
    HOSTLOBBY: 'HOSTLOBBY',
    PROMPT: 'PROMPT',
    RECORDING: 'RECORDING',
} as const;


export type GameViews = typeof GAME_VIEWS[keyof typeof GAME_VIEWS];

export const GAME_FLOWS = {
    CLASSIC: [
        GAME_VIEWS.PROMPT,
        GAME_VIEWS.RECORDING
    ],
    BLIND_KARAOKE: [GAME_VIEWS.RECORDING]
} as const;

export type GameFlows = keyof typeof GAME_FLOWS;