import { useState } from 'react'

import Keyboard from "../components/Keyboard";
import styles from '../styles/HostScreen.module.css';

import type { Lobby } from "../types/lobby.ts";

interface HostScreenProps {
    nickname: string;
    lobby: Lobby;
    onBack: () => void;
}

const HostScreen = ({ onBack, nickname, lobby }: HostScreenProps) => {
    const [activeTab, setActiveTab] = useState<'modes' | 'options'>('modes');

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
            <hr style={{ borderColor: '#444', margin: '20px 0' }} />
            {/* BLACK LINE SEPERATES TOP BAR FROM LOBBY ELEMENTS */}

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

                {/* RIGHT SIDE: Tabs & Settings (60%) */}
                <div className={styles['settings-panel']}>
                    <div className={styles['tab-header']}>
                        <button
                            className={`${styles['tab-btn']} ${activeTab === 'modes' ? styles['active'] : ''}`}
                            onClick={() => setActiveTab('modes')}
                        >
                            Game Modes
                        </button>
                        <button
                            className={`${styles['tab-btn']} ${activeTab === 'options' ? styles['active'] : ''}`}
                            onClick={() => setActiveTab('options')}
                        >
                            Custom Options
                        </button>
                    </div>

                    <div className={styles['tab-content']}>
                        {activeTab === 'modes' ? (
                            <div className={styles['modes-container']}>
                                {/* Game mode selection goes here */}
                                <p>Select a Game Mode</p>
                            </div>
                        ) : (
                            <div className={styles['options-container']}>
                                {/* Custom options go here */}
                                <p>Configure Rules</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Keyboard />
        </div>
    );
};

export default HostScreen;