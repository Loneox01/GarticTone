import { useMemo } from "react";
import styles from '../styles/DriftingNotes.module.css';


const MusicBackground = () => {
    const NUM_NOTES = 90;
    const notes = ['♩', '♪', '♫', '♬', '♭', '♯'];

    // initializes a steady stream of notes one time of length NUM_NOTES
    const staticNotes = useMemo(() => {
        const lanes = [
            { min: 10, max: 20 }, // top Stream
            { min: 40, max: 50 }, // middle Stream
            { min: 70, max: 80 }  // bottom Stream
        ];

        return [...Array(NUM_NOTES)].map((_, i) => {
            // pick a lane, 
            const lane = lanes[i % lanes.length];

            return {
                id: i,
                symbol: notes[Math.floor(Math.random() * notes.length)],
                top: Math.random() * (lane.max - lane.min) + lane.min,
                delay: Math.random() * -15, // negative fills screen immediately
                duration: Math.random() * 5 + 10, // optional override for random duration time
                size: Math.random() * 15 + 20,
                opacity: Math.random() * 0.5 + 0.2
            };
        });
    }, []);

    return (
        <div className={styles['music-container']}>
            {staticNotes.map((note) => (
                <span
                    key={note.id}
                    className={styles['floating-note']}
                    style={{
                        top: `${note.top}%`,
                        animationDelay: `${note.delay}s`,
                        fontSize: `${note.size}px`,
                        opacity: note.opacity
                    }}
                >
                    {note.symbol}
                </span>
            ))}
        </div>
    );
};

export default MusicBackground;