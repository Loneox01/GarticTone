import { useState, useRef, useEffect } from 'react'
import { now, start, getTransport, getContext } from "tone";
import Keyboard from "../components/Keyboard";
import sampler from '../components/Sampler';

import type { Lobby } from "../types/lobby.ts";

import styles from '../styles/RecordingScreen.module.css';

interface RecordingScreenProps {
    nickname: string;
    lobby: Lobby;
    playersReady: { ready: number, total: number };
    onBack: () => void;
    onNext: (recordingData: { type: 'on' | 'off', note: string, time: number }[]) => void;
}

const RecordingScreen = ({ nickname, lobby, playersReady, onBack, onNext }: RecordingScreenProps) => {
    const recDuration = lobby.settings.recDuration;
    const roundDuration = lobby.settings.roundDuration;

    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<{ type: 'on' | 'off', note: string, time: number }[]>([]);

    // ui states
    const [recTimeLeft, setRecTimeLeft] = useState<number>(recDuration);
    const [roundTimeLeft, setRoundTimeLeft] = useState<number>(roundDuration);
    const [isPlayback, setIsPlayback] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);

    // refs
    const playbackTimeoutRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<number | null>(null);

    // round timer
    useEffect(() => {
        const roundTimer = setInterval(() => {
            setRoundTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(roundTimer);
                    setIsWaiting(true);
                    onNext(recording);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(roundTimer); // cleanup
    }, []);

    // recording timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = window.setInterval(() => {
                const elapsed = now() - startTimeRef.current;
                const remaining = Math.max(0, recDuration - elapsed);
                setRecTimeLeft(remaining);

                if (remaining <= 0) {
                    // stop recording, enforce time limit
                    setIsRecording(false);
                }
            }, 100);
        } else {
            // not recording, reset
            if (timerRef.current) window.clearInterval(timerRef.current);
            setRecTimeLeft(recDuration);
        }

        return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }, [isRecording, recDuration]);

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
            <div className={styles['top-bar']}>
                <div className={styles['left-section']}>
                    <button onClick={onBack} className={styles['btn-back']}>← Leave</button>
                </div>

                <div className={styles['info-cluster']}>
                    <div className={styles['info-box']}>
                        <span>PLAYER:</span> <strong>{nickname}</strong>
                    </div>
                    <div className={styles['info-box']}>
                        <span>LOBBY:</span> <strong>{lobby.lobbyId}</strong>
                    </div>
                </div>

                <div className={styles['right-section']}>
                    <div className={`${styles['round-timer']} 
                        ${roundTimeLeft < 10 ? styles['panic'] : ''} 
                        ${roundTimeLeft <= 3 ? styles['final'] : ''}`
                    }>
                        Round Ends: {roundTimeLeft}s
                    </div>
                </div>
            </div>

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