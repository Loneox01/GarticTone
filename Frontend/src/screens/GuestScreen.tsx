import Keyboard from "../components/Keyboard.tsx";
import styles from '../styles/GuestScreen.module.css';
import type { Lobby } from "../types/lobby.ts";

interface GuestScreenProps {
    nickname: string;
    lobby: Lobby;
    onBack: () => void;
}

const GuestScreen = ({ onBack, nickname, lobby }: GuestScreenProps) => {
    return (
        <div className={styles['game-container']}>
            <div className={styles['top-bar']}>
                <button onClick={() => onBack()} className={styles['btn-back']}>
                    ← Leave
                </button>

                <div className={styles['info-bar']}>
                    <div className={styles['info-box']}>
                        <span>PLAYER:</span> <strong>{nickname}</strong>
                    </div>
                    <div className={styles['info-box']}>
                        <span>LOBBY:</span> <strong>{lobby.lobbyId}</strong>
                    </div>
                </div>
            </div>

            {/* BLACK LINE SEPERATES TOP BAR FROM LOBBY ELEMENTS */}
            <hr style={{ borderColor: '#444', margin: '20px 0' }} />

            <div className={styles['main-content']}>
                {/* LEFT SIDE: Player List (40%) */}
                <div className={styles['player-sidebar']}>
                    <div className={styles['player-box-list']}>
                        {Object.values(lobby.players).map((player) => (
                            <div key={player.nickname} className={styles['player-tag']}>
                                <div className={styles['status-dot']}></div>
                                <span className={styles['player-name']}>{player.nickname}</span>

                                {/* Check if this player is the local user */}
                                {player.nickname === nickname && (
                                    <span className={styles['label-you']}> (You)</span>
                                )}

                                {/* Compare nickname to the lobbyHost string from the lobby object */}
                                {player.nickname === lobby.lobbyHost && (
                                    <span className={styles['label-host']}> (Host)</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE: View Only Panel (60%) */}
                <div className={styles['settings-panel']}>
                    <div className={styles['tab-header']}>
                        {/* No buttons here, just a static label for Guests */}
                        <div className={styles['tab-label-static']}>
                            Game Settings (Host Only)
                        </div>
                    </div>

                    <div className={styles['tab-content']}>
                        <div className={styles['modes-container']}>
                            <h3>Selected Game Mode</h3>
                            <p>Waiting for the host to choose...</p>
                            {/* Later, you will map the modes here but with pointer-events: none */}
                        </div>
                    </div>
                </div>
            </div>
            <Keyboard />
        </div>
    );
};

export default GuestScreen;