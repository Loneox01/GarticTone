export const GAME_VIEWS = {
    HOME: 'HOME',
    LOBBY: 'LOBBY',
    HOSTLOBBY: 'HOSTLOBBY',
    PROMPT: 'PROMPT',
    RECORDING: 'RECORDING',
    LISTENING: 'LISTENING',
    RESULTS: 'RESULTS'
} as const;


export type GameViews = typeof GAME_VIEWS[keyof typeof GAME_VIEWS];

export const GAME_FLOWS = {
    CLASSIC: [
        GAME_VIEWS.PROMPT,
        GAME_VIEWS.RECORDING,
        GAME_VIEWS.LISTENING,
        GAME_VIEWS.RESULTS
    ],
    BLIND_KARAOKE: [GAME_VIEWS.HOME]
} as const;

export type GameFlows = keyof typeof GAME_FLOWS;