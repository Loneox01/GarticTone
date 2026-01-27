import { useState } from "react";

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

    return (
        <div className="keyboard">
            {keyboard.map((key) => {
                const isPressed = pressedId === key.id;
                const isHovered = hoveredId === key.id;

                // selects built in CSS attribute className by conditional, init as wrapper and key Class
                const wrapperClass = key.type === "white" ? "white_key_wrapper" : "black_key_wrapper";
                const keyClass =
                    (key.type === "white" ? "white_key" : "black_key") +
                    (isPressed ? " pressed" : "") +
                    (isHovered ? " hovered" : "");

                return (
                    /* wrapper div handles interactives and "hitboxes" */
                    <div
                        key={key.id}
                        className={wrapperClass}
                        onMouseDown={() => setPressedId(key.id)}
                        onMouseUp={() => setPressedId(null)}
                        onMouseEnter={() => setHoveredId(key.id)}
                        onMouseLeave={() => {
                            setPressedId(null);
                            setHoveredId(null);
                        }}
                        onTouchStart={() => setPressedId(key.id)}
                        onTouchEnd={() => setPressedId(null)}
                    >
                        {/* key div handles visuals */}
                        <div
                            className={keyClass}>
                            {key.type === "white" && <span>{key.note}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Keyboard;
