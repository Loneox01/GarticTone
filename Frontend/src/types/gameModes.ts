export const GAME_MODES = {
    CLASSIC: {
        label: "Classic",
        description: "The classic Gartic Tone experience.",
        settings: {
            roundDuration:
            {
                label: "Round Time",
                type: "multi",
                default: 60,
                options: [15, 30, 60, 120, 300]
            },
            recDuration: {
                label: "Recording Time",
                type: "multi",
                default: 15,
                options: [5, 10, 15, 30, 60]
            },
            inputList: {
                label: "Song List",
                type: "list",
                default: "",
                placeholder: "eg. Song A, Song B, ... Uses internal default if not provided"
            },
            visibility: {
                label: "Visibility",
                type: "binary",
                default: 'Public',
                options: ['Public', 'Private']
            },
        }
    },
    BLIND_KARAOKE: {
        label: "Blind Karaoke",
        description: "Guess the melody given the background.",
        settings: {
            roundDuration:
            {
                label: "Round Time",
                type: "multi",
                default: 60,
                options: [15, 30, 60, 120, 300]
            },
            inputList: {
                label: "Song List",
                type: "list",
                default: "",
                placeholder: "eg. Song A, Song B, ... Uses internal default if not provided"
            },
            visibility: {
                label: "Visibility",
                type: "binary",
                default: 'Public',
                options: ['Public', 'Private']
            }
        }
    }
};