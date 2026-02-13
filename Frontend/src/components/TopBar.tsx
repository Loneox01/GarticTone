import styles from '../styles/TopBar.module.css';

interface TopBarProps {
    onBack: () => void;
    nickname: string;
    lobbyId?: string;      // Optional: Used in Guest/Host/Recording
    gameMode?: string;     // Optional: Used in Listening/Prompt
    timer?: number;        // Optional: The countdown value
    timerLabel?: string;   // Optional: "Round Ends" vs "Time Left"
    isPanic?: boolean;     // Optional: Triggers red "panic" state for Recording
    variant?: 'default' | 'dark' | 'glass';
}

const TopBar = ({
    onBack,
    nickname,
    lobbyId,
    gameMode,
    timer,
    timerLabel,
    isPanic,
    variant = 'default'
}: TopBarProps) => {

    const containerClass = `${styles['top-bar-container']} ${styles[variant]}`;

    return (
        <div className={containerClass}>
            <div className={styles['left-section']}>
                <button onClick={onBack} className={styles['btn-back']}>
                    ← Leave
                </button>
            </div>

            <div className={styles['info-cluster']}>
                <div className={styles['info-box']}>
                    <span>PLAYER:</span> <strong>{nickname}</strong>
                </div>

                {/* Conditional rendering based on what data is passed */}
                {lobbyId && (
                    <div className={styles['info-box']}>
                        <span>LOBBY:</span> <strong>{lobbyId}</strong>
                    </div>
                )}

                {gameMode && (
                    <div className={styles['info-box']}>
                        <span>MODE:</span> <strong>{gameMode}</strong>
                    </div>
                )}

                {/* Standard Timer (Listening/Prompt style) */}
                {variant === 'dark' && timer !== undefined && (
                    <div className={styles['info-box']}>
                        <span>{timerLabel || 'TIME LEFT'}:</span>
                        <strong className={styles.timer}>{timer}s</strong>
                    </div>
                )}
            </div>

            <div className={styles['right-section']}>
                {/* Specialized Recording Timer (Green/Red Pulse style) */}
                {variant === 'glass' && timer !== undefined && (
                    <div className={`${styles['round-timer']} ${isPanic ? styles['panic'] : ''}`}>
                        {timerLabel || 'Round Ends'}: {timer}s
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopBar;