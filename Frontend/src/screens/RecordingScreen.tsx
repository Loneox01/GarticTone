import { useState, useRef, useEffect } from 'react'
import { now, start, getTransport, getContext } from "tone";
import Keyboard from "../components/Keyboard";
import TopBar from '../components/TopBar.tsx';
import sampler from '../components/Sampler';

import type { Lobby } from "../types/lobby.ts";

import styles from '../styles/RecordingScreen.module.css';

interface RecordingScreenProps {
    nickname: string;
    lobby: Lobby;
    playersReady: { ready: number, total: number };
    prevRecording?: { type: 'on' | 'off', note: string, time: number }[];
    onBack: () => void;
    onNext: (recordingData: { type: 'on' | 'off', note: string, time: number }[]) => void;
}

const RecordingScreen = ({ nickname, lobby, playersReady, prevRecording, onBack, onNext }: RecordingScreenProps) => {
    const recDuration = lobby.settings.recDuration;
    const roundDuration = lobby.settings.roundDuration;

    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<{ type: 'on' | 'off', note: string, time: number }[]>([]);
    const recordingRef = useRef(recording);

    useEffect(() => {
        recordingRef.current = recording;
    }, [recording]);

    // ui states
    const [recTimeLeft, setRecTimeLeft] = useState<number>(recDuration);
    const [roundTimeLeft, setRoundTimeLeft] = useState<number>(roundDuration);
    const [isPlayback, setIsPlayback] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);

    // refs
    const playbackTimeoutRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<number | null>(null);
    const [isRefPlaying, setIsRefPlaying] = useState(false);

    const playReference = async () => {
        if (!prevRecording || isRefPlaying) return;

        await start();
        setIsRefPlaying(true);
        const startTime = now() + 0.1;

        prevRecording.forEach((msg) => {
            if (msg.type === 'on') {
                sampler.triggerAttack(msg.note, startTime + msg.time);
            } else if (msg.type === 'off') {
                sampler.triggerRelease(msg.note, startTime + msg.time);
            }
        });

        const lastEventTime = prevRecording[prevRecording.length - 1]?.time || 0;
        setTimeout(() => setIsRefPlaying(false), (lastEventTime + 0.5) * 1000);
    };


    // round timer
    useEffect(() => {
        const interval = setInterval(() => {
            setRoundTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsWaiting(true);
                    onNext(recordingRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [onNext]);

    // delta handler for held notes (note start/stop)
    const handleNoteStart = (noteName: string) => {
        if (!isRecording) return;
        const elapsed = now() - startTimeRef.current;
        setRecording(prev => [...prev, { type: 'on', note: noteName, time: elapsed }]);
    };
    const handleNoteStop = (noteName: string) => {
        if (!isRecording) return;
        const elapsed = now() - startTimeRef.current;
        setRecording(prev => [...prev, { type: 'off', note: noteName, time: elapsed }]);
    };

    // rec timer
    const toggleRecording = async () => {
        if (!isRecording) {
            await start();

            // override old recording
            setRecording([]);
            startTimeRef.current = now();
            setIsRecording(true);
        } else {
            // manual end recording early
            setIsRecording(false);
        }
    };

    const playBack = async () => {
        console.log(recording)
        // this checks for browser allowing audio
        if (getContext().state !== 'running') {
            await start();
        }

        // stop playback
        if (isPlayback) {
            getTransport().stop();
            // clear upcoming notes
            getTransport().cancel();
            // clear lingering souds
            sampler.releaseAll();
            // clear the auto-reset timer
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
            }
            setIsPlayback(false);
            return;
        }

        // else start playback
        if (recording.length === 0) return;

        setIsPlayback(true);

        // reset Transport to the beginning
        getTransport().stop();
        getTransport().cancel();
        getTransport().position = 0;

        // schedule events ON THE TRANSPORT
        recording.forEach(event => {
            getTransport().schedule((time) => {
                if (event.type === 'on') {
                    sampler.triggerAttack(event.note, time);
                } else {
                    sampler.triggerRelease(event.note, time);
                }
            }, event.time); // event.time is in seconds
        });

        getTransport().start();

        // calculate end time to reset the button automatically
        const lastEventTime = recording[recording.length - 1].time;
        playbackTimeoutRef.current = window.setTimeout(() => {
            setIsPlayback(false);
            getTransport().stop();
        }, (lastEventTime + 1) * 1000); // +1s buffer
    };

    return (
        <div className={styles['screen-container']}>
            {isWaiting && (
                <div className={styles['waiting-overlay']}>
                    <div className={styles['waiting-content']}>
                        {/* Pulsing Turquoise Icon */}
                        <div className={styles['spinner-container']}>
                            <div className={styles['pulse-ring']} />
                            <div className={styles['music-icon']}>♪</div>
                        </div>

                        <h2>Waiting for the lobby...</h2>

                        <div className={styles['progress-text']}>
                            {/* Display player ready count */}
                            {playersReady.ready} / {playersReady.total} Players Ready
                        </div>

                        <div className={styles['loading-bar-bg']}>
                            <div
                                className={styles['loading-bar-fill']}
                                style={{
                                    width: `${playersReady.total > 0 ? (playersReady.ready / playersReady.total) * 100 : 0}%`
                                }} />
                        </div>
                    </div>
                </div>
            )}
            {/* 1. TOP BAR: Global Info (Quiet/Static) */}

            <TopBar
                onBack={onBack}
                nickname={nickname}
                lobbyId={lobby.lobbyId}
                timer={roundTimeLeft}
                isPanic={roundTimeLeft < 10}
                variant="glass"
            />

            {/* 2. ACTION BAR: Controls and Timers */}
            <div className={styles['action-bar']}>
                <div className={styles['timer-box']}>
                    <span className={styles['label']}>REC LIMIT</span>
                    <div className={`${styles['timer']} ${isRecording ? styles['active'] : ''}`}>
                        {recTimeLeft.toFixed(1)}s
                    </div>
                </div>

                <div className={styles['controls']}>
                    <button
                        onClick={toggleRecording}
                        className={`${styles['btn-rec']} ${isRecording ? styles['recording'] : ''}`}
                        disabled={isPlayback}
                    >
                        {isRecording ? "Stop" : "Record"}
                    </button>

                    <button
                        onClick={playBack}
                        disabled={isRecording || recording.length === 0}
                        className={`${styles['btn-play']} ${isPlayback ? styles['playing'] : ''}`}
                    >
                        {isPlayback ? "Stop" : "Play Back"}
                    </button>
                </div>
            </div>
            {/* 3. BOTTOM SECTION */}
            <div className={styles['bottom-section']}>
                <div className={styles['ready-bar']}>
                    {prevRecording && prevRecording.length > 0 && (
                        <button
                            className={styles['btn-ref']}
                            onClick={playReference}
                            disabled={isRefPlaying}
                        >
                            {isRefPlaying ? "Playing..." : "Play Reference"}
                        </button>
                    )}
                    <button
                        className={styles['btn-ready']}
                        disabled={recording.length === 0 || isRecording}
                        onClick={() => {
                            setIsWaiting(true);
                            onNext(recording);
                        }}
                    >
                        Ready! <span>✓</span>
                    </button>
                </div>

                {/* 4. KEYBOARD */}
                <Keyboard onPlayNote={handleNoteStart} onStopNote={handleNoteStop} />
            </div>
        </div>
    );
}

export default RecordingScreen;