import styles from '../styles/PromptScreen.module.css';
import { useState, useEffect } from 'react'

import type { Lobby } from "../types/lobby.ts";

interface PromptProps {
    nickname: string;
    lobby: Lobby;
    prompt: string;
    onBack: () => void;
    onNext: () => void;
}

const PromptScreen = ({ nickname, lobby, prompt, onBack, onNext }: PromptProps) => {
    const AUTO_ADVANCE_TIME = 10;
    const [timeLeft, setTimeLeft] = useState(AUTO_ADVANCE_TIME);

    useEffect(() => {
        setTimeLeft(AUTO_ADVANCE_TIME);
        const interval = setInterval(() => {
            setTimeLeft((t) => Math.max(0, t - 1));
        }, 1000);

        const timeout = setTimeout(() => {
            onNext();
        }, AUTO_ADVANCE_TIME * 1000);

        return () => {
            clearInterval(interval); clearTimeout(timeout);
        };
    }, []);

    return (
        <div className={styles['prompt-container']}>
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
                    <h2 className={styles.subtitle}>YOUR SONG ASSIGNMENT</h2>
                </div>

                <div className={styles['prompt-display']}>
                    <h1 className={styles['prompt-text']}>{prompt}</h1>
                </div>

                <p className={styles['instruction-text']}>
                    Record your best shot at this song!
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

export default PromptScreen;