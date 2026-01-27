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

  return (
    <div className="keyboard">
      {keyboard.map((key) => {
        const isPressed = pressedId === key.id;
        // selects built in CSS attribute className by conditional
        const className =
          (key.type === "white" ? "white_key" : "black_key") +
          (isPressed ? " pressed" : "");

        return (
          <div
            key={key.id}
            className={className}
            onMouseDown={() => setPressedId(key.id)}
            onMouseUp={() => setPressedId(null)}
            onMouseLeave={() => setPressedId(null)}
            onTouchStart={() => setPressedId(key.id)}
            onTouchEnd={() => setPressedId(null)}
          />
        );
      })}
    </div>
  );
};

export default Keyboard;
