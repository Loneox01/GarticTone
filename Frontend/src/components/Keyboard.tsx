import { useRef, useState } from "react";

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

// Sound dict
const SEMITONE_MAP: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
};

// Convert key to frequency
function keyIdToFrequency(id: string): number {
    const match = id.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 440;

    const [, note, uiOctStr] = match;
    const uiOct = Number(uiOctStr);

    // Map UI octaves 0–2 to musical octaves 3–5
    const realOct = uiOct + 3;

    const midi = 12 + realOct * 12 + SEMITONE_MAP[note]; // C0 = 12
    return 440 * Math.pow(2, (midi - 69) / 12);
}

const Keyboard = () => {
    const numOctaves = 3;
    const keyboard = Array.from({ length: numOctaves }, (_, octaveIndex) =>
        OCTAVE.map((key) => ({
            ...key,
            id: `${key.note}${octaveIndex}`, // i.e. C0, B#2, etc
        })),
    ).flat();

    // creates an array of keys, i.e. [ { note: 'C',  type: 'white', id: 'C0' }, ... ]

    const [pressedId, setPressedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const activeNotesRef = useRef<
        Map<string, { osc: OscillatorNode; gain: GainNode }>
    >(new Map());

    async function startNote(keyId: string) {
        audioCtxRef.current ??= new AudioContext();
        const ctx = audioCtxRef.current;

        await ctx.resume();

        if (activeNotesRef.current.has(keyId)) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Choose oscillation type;
        osc.type = "sine";
        // osc.type = "triangle";
        // osc.type = "square";
        osc.frequency.value = keyIdToFrequency(keyId);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();

        activeNotesRef.current.set(keyId, { osc, gain });
    }

    function stopNote(keyId: string) {
        const ctx = audioCtxRef.current;
        const node = activeNotesRef.current.get(keyId);
        if (!ctx || !node) return;

        const now = ctx.currentTime;
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        node.osc.stop(now + 0.06);
        activeNotesRef.current.delete(keyId);
    }

    return (
        <div className="keyboard">
            {keyboard.map((key) => {
                const isPressed = pressedId === key.id;
                const isHovered = hoveredId === key.id;

                // selects built in CSS attribute className by conditional, init as wrapper and key Class
                const wrapperClass =
                    key.type === "white"
                        ? "white_key_wrapper"
                        : "black_key_wrapper";
                const keyClass =
                    (key.type === "white" ? "white_key" : "black_key") +
                    (isPressed ? " pressed" : "") +
                    (isHovered ? " hovered" : "");

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
