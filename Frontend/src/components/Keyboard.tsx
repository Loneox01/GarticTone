import { useState } from "react";
import * as Tone from "tone";
import sampler from "./Sampler";
import styles from '../styles/Keyboard.module.css';

interface KeyboardProps {
    // recording prop, optional
    onPlayNote?: (noteName: string) => void;
    onStopNote?: (noteName: string) => void;
}

interface Key {
    note: string;
    type: "white" | "black";
}

const OCTAVE: Key[] = [
    { note: "C", type: "white" },
    { note: "C#", type: "black" },
    { note: "D", type: "white" },
    { note: "D#", type: "black" },
    { note: "E", type: "white" },
    { note: "F", type: "white" },
    { note: "F#", type: "black" },
    { note: "G", type: "white" },
    { note: "G#", type: "black" },
    { note: "A", type: "white" },
    { note: "A#", type: "black" },
    { note: "B", type: "white" },
];

const getNoteName = (id: string) => {
    const match = id.match(/^([A-G]#?)(\d+)$/);
    if (!match) return null;
    return `${match[1]}${Number(match[2]) + 3}`;
};

const Keyboard = ({ onPlayNote, onStopNote }: KeyboardProps) => {
    const numOctaves = 3;
    const keyboard = [
        ...Array.from({ length: numOctaves }, (_, octaveIndex) =>
            OCTAVE.map((key) => ({
                ...key,
                id: `${key.note}${octaveIndex}`,
            }))
        ).flat(),
        // high C6
        { note: "C", type: "white", id: `C${numOctaves}` }
    ];

    // creates an array of keys, i.e. [ { note: 'C',  type: 'white', id: 'C0' }, ... ]

    const [pressedId, setPressedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    async function startNote(keyId: string) {
        // Standard Tone.js safety: Audio won't play until a user interaction
        if (Tone.getContext().state !== 'running') {
            await Tone.start();
        }

        const noteName = getNoteName(keyId);
        if (!noteName) return;

        // triggerAttack starts the sound
        sampler.triggerAttack(noteName);

        setPressedId(keyId); // Update UI

        if (onPlayNote) {
            onPlayNote(noteName);
        }
    }

    function stopNote(keyId: string) {
        const noteName = getNoteName(keyId);
        if (!noteName) return;

        // triggerRelease starts the "fade out" (release) phase
        sampler.triggerRelease(noteName);

        setPressedId(null); // Reset UI

        if (onStopNote) {
            onStopNote(noteName);
        }
    }

    return (
        <div className={styles['keyboard']}>
            {keyboard.map((key) => {
                const isPressed = pressedId === key.id;
                const isHovered = hoveredId === key.id;

                // selects built in CSS attribute className by conditional, init as wrapper and key Class
                const wrapperClass =
                    key.type === "white"
                        ? styles['white_key_wrapper']
                        : styles['black_key_wrapper'];

                const keyClass = `${key.type === "white" ? styles['white_key'] : styles['black_key']} ${isPressed ? styles['pressed'] : ""
                    } ${isHovered ? styles['hovered'] : ""}`;

                return (
                    /* wrapper div handles interactives and "hitboxes" */
                    <div
                        key={key.id}
                        className={wrapperClass}
                        onMouseDown={() => {
                            setPressedId(key.id);
                            void startNote(key.id);
                        }}
                        onMouseUp={() => {
                            setPressedId(null);
                            stopNote(key.id);
                        }}
                        onMouseEnter={() => {
                            setHoveredId(key.id);
                        }}
                        onMouseLeave={() => {
                            setPressedId(null);
                            setHoveredId(null);
                            stopNote(key.id);
                        }}
                        onTouchStart={() => {
                            setPressedId(key.id);
                            void startNote(key.id);
                        }}
                        onTouchEnd={() => {
                            setPressedId(null);
                            stopNote(key.id);
                        }}
                    >
                        {/* key div handles visuals */}
                        <div className={keyClass}>
                            {key.type === "white" && <span>{key.note}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Keyboard;