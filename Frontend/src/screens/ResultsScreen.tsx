import { useState, useEffect, useRef } from 'react';
import { start, getTransport } from "tone";
import sampler from '../components/Sampler';
import TopBar from '../components/TopBar';

import styles from '../styles/ResultsScreen.module.css';

interface ResultsScreenProps {
    nickname: string;
    results: { recList: any[], prompts: string[] };
    onHome: () => void;
}

const ResultsScreen = ({ nickname, results, onHome }: ResultsScreenProps) => {
    const [playingIndex, setPlayingIndex] = useState<number>(-1);
    const [progress, setProgress] = useState<number>(0);
    const progressFrameRef = useRef<number>(0);

    const Transport = getTransport();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, []);

    const stopPlayback = () => {
        Transport.stop();
        Transport.cancel(); // Clears all scheduled events
        sampler.releaseAll(); // Silences any currently ringing notes
        setPlayingIndex(-1);
        setProgress(0);
        if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
    };

    const handlePlay = async (index: number) => {
        if (playingIndex === index) {
            stopPlayback();
            return;
        }

        stopPlayback();
        await start();

        const chain = results.recList[index];
        if (!chain || chain.length === 0) return;

        // Calculate total duration (last note time + a small buffer)
        const lastEventTime = Math.max(...chain.map((n: any) => n.time));
        const totalDuration = lastEventTime + 1.5;

        // Schedule playback events (matching RecordingScreen logic)
        chain.forEach((note: any) => {
            Transport.schedule((time) => {
                if (note.type === 'on') {
                    sampler.triggerAttack(note.note, time);
                } else {
                    sampler.triggerRelease(note.note, time);
                }
            }, note.time);
        });

        // Auto-stop at the end
        Transport.schedule(() => {
            stopPlayback();
        }, totalDuration);

        setPlayingIndex(index);
        Transport.start();

        // Visual Progress Loop
        const updateProgress = () => {
            const current = Transport.seconds;
            const p = Math.min(100, (current / totalDuration) * 100);
            setProgress(p);

            if (Transport.state === 'started') {
                progressFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };
        updateProgress();
    };

    return (
        <div className={styles['results-container']}>
            <TopBar
                onBack={onHome}
                nickname={nickname}
                variant="dark" // Using the darker theme to match Results/Listening
            />

            <div className={styles['main-content']}>
                <div className={styles['header-section']}>
                    <h2 className={styles.title}>SESSION RESULTS</h2>
                    <p className={styles.subtitle}>Click a card to hear how the song evolved!</p>
                </div>

                <div className={styles['results-grid']}>
                    {results.prompts.map((prompt, index) => {
                        const noteCount = results.recList[index]?.length || 0;
                        const isPlaying = playingIndex === index;

                        return (
                            <div
                                key={index}
                                className={`${styles['result-card']} ${isPlaying ? styles['playing'] : ''}`}
                                onClick={() => handlePlay(index)}
                            >
                                <div className={styles['card-header']}>
                                    <span className={styles['track-num']}>TRACK #{index + 1}</span>
                                    <span className={styles['note-count']}>{noteCount} NOTES</span>
                                </div>

                                <h3 className={styles['prompt-text']}>"{prompt}"</h3>

                                <div className={styles['playback-controls']}>
                                    <button className={styles['btn-play-mini']}>
                                        {isPlaying ? "STOP" : "PLAY BACK"}
                                    </button>

                                    <div className={styles['mini-progress-track']}>
                                        <div
                                            className={styles['mini-progress-fill']}
                                            style={{ width: isPlaying ? `${progress}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResultsScreen;