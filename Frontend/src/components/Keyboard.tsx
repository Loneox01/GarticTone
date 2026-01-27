interface Key {
    note: string;
    type: "white" | "black"
}

const OCTAVE: Key[] = [
    { note: 'C', type: 'white' },
    { note: 'C#', type: 'black' },
    { note: 'D', type: 'white' },
    { note: 'D#', type: 'black' },
    { note: 'E', type: 'white' },
    { note: 'F', type: 'white' },
    { note: 'F#', type: 'black' },
    { note: 'G', type: 'white' },
    { note: 'G#', type: 'black' },
    { note: 'A', type: 'white' },
    { note: 'A#', type: 'black' },
    { note: 'B', type: 'white' },
];

const Keyboard = () => {
    const numOctaves = 3;
    const keyboard = Array.from({ length: numOctaves }, (_, octaveIndex) =>
        OCTAVE.map(key => ({
            ...key,
            id: `${key.note}${octaveIndex}` // i.e. C0, B#2, etc
        }))
    ).flat();

    // creates an array of keys, i.e. [ { note: 'C',  type: 'white', id: 'C0' }, ... ]

    return (
        <div className="keyboard">
            {keyboard.map((key) => (
                <div
                    key={key.id}
                    // selects built in CSS attribute className by conditional
                    className={key.type === 'white' ? 'white_key' : 'black_key'}
                >
                </div>
            ))}
        </div>
    );
}

export default Keyboard