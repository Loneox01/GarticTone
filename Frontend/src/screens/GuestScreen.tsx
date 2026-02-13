import Keyboard from "../components/Keyboard.tsx";
import TopBar from "../components/TopBar.tsx";
import styles from '../styles/GuestScreen.module.css';

import type { Lobby } from "../types/lobby.ts";
import { GAME_MODES } from '../types/gameModes.ts';

import iconClassic from '../assets/icon_classic.png'
import iconKaro from '../assets/icon_karo.png'

interface GuestScreenProps {
    nickname: string;
    lobby: Lobby;
    onBack: () => void;
}

const GuestScreen = ({ onBack, nickname, lobby }: GuestScreenProps) => {
    const MODE_ICONS: Record<string, string> = {
        CLASSIC: iconClassic,
        BLIND_KARAOKE: iconKaro,
    };

    return (
        <div className={styles['guest-container']}>

            <TopBar
                onBack={onBack}
                nickname={nickname}
                lobbyId={lobby.lobbyId}
                variant="default"
            />

            {/* BLACK LINE SEPERATES TOP BAR FROM LOBBY ELEMENTS */}
            <hr style={{ borderColor: '#444', margin: '5px 0 20px 0' }} />

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
                            {Object.entries(GAME_MODES).map(([key, config]) => {
                                return (
                                    <button
                                        key={key}
                                        className={`${styles['mode-card']}`}
                                    >
                                        <div className={styles['mode-visual-area']}>
                                            {/* Icon */}
                                            <div className={styles['mode-icon']}>
                                                <img
                                                    src={MODE_ICONS[key]}
                                                    alt={`${config.label} icon`}
                                                    className={styles['mode-img']}
                                                />
                                            </div>

                                            {/* Description (Visible on hover) */}
                                            <div className={styles['mode-description-overlay']}>
                                                <p>{config.description}</p>
                                            </div>
                                        </div>

                                        <div className={styles['mode-footer']}>
                                            <h3>{config.label}</h3>                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <Keyboard />
        </div>
    );
};

export default GuestScreen;