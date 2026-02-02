import { useState, useRef, useEffect } from 'react'
import * as Tone from "tone";
import Keyboard from "../components/Keyboard";
import sampler from '../components/Sampler';
import type { Player } from "../types/player.ts";

import styles from '../styles/RecordingScreen.module.css';

interface RecordingScreenProps {
    nickname: string;
    lobbyId: string;
    players: Player[];
    recDuration: number;
    roundDuration: number;
    onBack: (nickname: string, lobbyId: string) => void;
}

const RecordingScreen = ({ nickname, lobbyId, recDuration, roundDuration, onBack, players }: RecordingScreenProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<{ type: 'on' | 'off', note: string, time: number }[]>([]);

    // ui states
    const [recTimeLeft, setRecTimeLeft] = useState(recDuration);
    const [roundTimeLeft, setRoundTimeLeft] = useState(roundDuration);
    const [isPlayback, setIsPlayback] = useState(false);

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
                    // Handle Screen Transfer Here.
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
                const elapsed = Tone.now() - startTimeRef.current;
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
        const elapsed = Tone.now() - startTimeRef.current;
        setRecording(prev => [...prev, { type: 'on', note: noteName, time: elapsed }]);
    };
    const handleNoteStop = (noteName: string) => {
        if (!isRecording) return;
        const elapsed = Tone.now() - startTimeRef.current;
        setRecording(prev => [...prev, { type: 'off', note: noteName, time: elapsed }]);
    };

    const toggleRecording = async () => {
        if (!isRecording) {
            await Tone.start();

            // override old recording
            setRecording([]);
            startTimeRef.current = Tone.now();
            setIsRecording(true);
        } else {
            // manual end recording early
            setIsRecording(false);
        }
    };

    const playBack = async () => {
        // this checks for browser allowing audio
        if (Tone.getContext().state !== 'running') {
            await Tone.start();
        }

        // stop playback
        if (isPlayback) {
            Tone.getTransport().stop();
            // clear upcoming notes
            Tone.getTransport().cancel();
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
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
        Tone.getTransport().position = 0;

        // schedule events ON THE TRANSPORT
        recording.forEach(event => {
            Tone.getTransport().schedule((time) => {
                if (event.type === 'on') {
                    sampler.triggerAttack(event.note, time);
                } else {
                    sampler.triggerRelease(event.note, time);
                }
            }, event.time); // event.time is in seconds
        });

        Tone.getTransport().start();

        // calculate end time to reset the button automatically
        const lastEventTime = recording[recording.length - 1].time;
        playbackTimeoutRef.current = window.setTimeout(() => {
            setIsPlayback(false);
            Tone.getTransport().stop();
        }, (lastEventTime + 1) * 1000); // +1s buffer
    };

    return (
        <div className={styles['screen-container']}>
            { /* leave + timers */}
            <div className={styles['top-bar']}>
                <div className={styles['left-section']}>
                    <button onClick={() => onBack(nickname, lobbyId)} className={styles['btn-back']}>
                        <span className={styles['icon']}>← </span>
                        <span className={styles['text']}>Leave</span>
                    </button>
                </div>

                <div className={styles['middle-section']}>
                    <div className={`${styles['timer']} ${isRecording ? styles['active'] : ''}`}>
                        {recTimeLeft.toFixed(1)}s
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
            { /* buttons */}
            <div className={styles['controls']}>
                <button
                    onClick={toggleRecording}
                    className={`${styles['btn-rec']} ${isRecording ? styles['recording'] : ''}`}
                    disabled={isPlayback} // disable record if playing back
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

            <Keyboard
                onPlayNote={handleNoteStart}
                onStopNote={handleNoteStop}
            />
        </div>
    );
}

export default RecordingScreen;