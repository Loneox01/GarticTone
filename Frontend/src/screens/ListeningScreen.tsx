import styles from '../styles/ListeningScreen.module.css';
import { useState, useEffect } from 'react';
import type { Lobby } from "../types/lobby.ts";

import { now, start } from "tone";
import sampler from '../components/Sampler';

interface ListeningProps {
    nickname: string;
    lobby: Lobby;
    listeningTime: number;
    recording: { type: 'on' | 'off', note: string, time: number }[];
    onBack: () => void;
    onNext: () => void;
}

const ListeningScreen = ({ nickname, lobby, listeningTime, recording, onBack, onNext }: ListeningProps) => {
    const AUTO_ADVANCE_TIME = listeningTime;
    const [timeLeft, setTimeLeft] = useState(AUTO_ADVANCE_TIME);

    useEffect(() => {
        const playRecording = async () => {
            await start();

            const startTime = now() + 1; // 1 second "buffer" delay

            recording.forEach((msg) => {
                const timeOffset = msg.time;

                if (msg.type === 'on') {
                    sampler.triggerAttack(msg.note, startTime + timeOffset);
                } else if (msg.type === 'off') {
                    sampler.triggerRelease(msg.note, startTime + timeOffset);
                }
            });
        };

        playRecording();

        return () => {
            sampler.releaseAll();
        };
    }, [recording]);

    useEffect(() => {
        setTimeLeft(AUTO_ADVANCE_TIME);

        const interval = setInterval(() => {
            setTimeLeft((t) => Math.max(0, t - 1));
        }, 1000);

        const timeout = setTimeout(() => {
            onNext();   // fires once
        }, AUTO_ADVANCE_TIME * 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [AUTO_ADVANCE_TIME]);



    return (
        <div className={styles['listening-container']}>
            <div className={styles['top-bar']}>
                <button onClick={onBack} className={styles['btn-back']}>
                    ← Leave
                </button>
                <div className={styles['info-bar']}>
                    <div className={styles['info-box']}>
                        <span>PLAYER:</span> <strong>{nickname}</strong>
                    </div>
                    <div className={styles['info-box']}>
                        <span>MODE:</span> <strong>{lobby.gameMode}</strong>
                    </div>
                    <div className={styles['info-box']}>
                        <span>TIME LEFT:</span> <strong className={styles.timer}>{timeLeft}s</strong>
                    </div>
                </div>
            </div>

            <div className={styles['main-content']}>
                <div className={styles['briefing-header']}>
                    <h2 className={styles.subtitle}>LISTENING PHASE</h2>
                </div>

                <div className={styles['listening-display']}>
                    <h1 className={styles['listening-text']}>Listen to your friends' work!</h1>
                </div>

                <p className={styles['instruction-text']}>
                    Record your best shot at the next part.
                </p>
            </div>

            {/* Visual Countdown Bar */}
            <div className={styles['progress-wrapper']}>
                <div
                    className={styles['progress-bar']}
                    style={{ width: `${(timeLeft / AUTO_ADVANCE_TIME) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default ListeningScreen;