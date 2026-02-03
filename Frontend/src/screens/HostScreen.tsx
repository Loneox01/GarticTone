import { useState, useEffect } from 'react'

import Keyboard from "../components/Keyboard";
import styles from '../styles/HostScreen.module.css';

import { GAME_MODES } from '../types/gameModes.ts';
import type { Lobby } from "../types/lobby.ts";

interface HostScreenProps {
    nickname: string;
    lobby: Lobby;
    onBack: () => void;
    onStart: (gameMode: string, settings: Record<string, any>) => void;
}

const HostScreen = ({ onBack, onStart, nickname, lobby }: HostScreenProps) => {
    const [activeTab, setActiveTab] = useState<'modes' | 'options'>('modes');
    const [gameMode, setGameMode] = useState('CLASSIC');
    const [settings, setSettings] = useState(() => {
        const initialSettings: Record<string, any> = {};
        const defaultModeSettings = GAME_MODES['CLASSIC' as keyof typeof GAME_MODES].settings;

        Object.entries(defaultModeSettings).forEach(([k, v]) => {
            initialSettings[k] = v.default;
        });

        return initialSettings;
    });

    useEffect(() => {
        const modeSettings = GAME_MODES[gameMode as keyof typeof GAME_MODES].settings;

        if ('recDuration' in modeSettings && settings.recDuration >= settings.roundDuration) {

            const recConfig = (modeSettings as any).recDuration;
            const recOptions = recConfig.options;

            const validOption = [...recOptions]
                .reverse()
                .find((opt: number) => opt < settings.roundDuration);

            if (validOption !== undefined) {
                setSettings(prev => ({
                    ...prev,
                    recDuration: validOption
                }));
            }
        }
    }, [settings.roundDuration, gameMode]);

    const handleModeChange = (modeKey: string) => {
        setGameMode(modeKey);
        // Reset settings to the new mode's defaults
        const newDefaults: Record<string, any> = {};
        Object.entries(GAME_MODES[modeKey as keyof typeof GAME_MODES].settings).forEach(([k, v]) => {
            newDefaults[k] = v.default;
        });
        setSettings(newDefaults);
    };

    const handleStart = () => {
        // Pass the final "locked in" settings up to App.tsx
        onStart(gameMode, settings);
    };

    const renderSetting = (key: string, config: any) => {
        // This looks at your local 'settings' state to see what is currently picked
        const currentValue = settings[key];

        switch (config.type) {
            case 'multi':
            case 'binary':
                return (
                    <div key={key} className={styles['setting-row']}>
                        <span className={styles['setting-label']}>{config.label}</span>
                        <div className={styles['pill-group']}>
                            {config.options.map((opt: any) => {
                                // Logic: Disable recDuration options >= roundDuration
                                const isDisabled =
                                    key === 'recDuration' &&
                                    typeof opt === 'number' &&
                                    settings['roundDuration'] !== undefined && // Safety check
                                    opt >= settings['roundDuration'];

                                return (
                                    <button
                                        key={opt}
                                        disabled={isDisabled}
                                        className={`${styles['pill-btn']} 
                                        ${currentValue === opt ? styles['active'] : ''} 
                                        ${isDisabled ? styles['disabled-pill'] : ''}`
                                        }
                                        onClick={() => setSettings({ ...settings, [key]: opt })}
                                    >
                                        {opt}{typeof opt === 'number' ? 's' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'list':
                return (
                    <div key={key} className={styles['setting-row-column']}>
                        <div className={styles['label-header']}>
                            <span className={styles['setting-label']}>{config.label}</span>
                            <span className={styles['helper-text']}>Items separated by comma</span>
                        </div>
                        <textarea
                            className={styles['list-textarea']}
                            value={currentValue || ''}
                            placeholder={config.placeholder}
                            onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

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
                    {(
                        <button className={styles['btn-start']} onClick={handleStart}>
                            Start Game
                        </button>
                    )}
                    <div className={styles['player-box-list']}>
                        {Object.values(lobby.players).map((player) => (
                            <div key={player.nickname} className={styles['player-tag']}>
                                <div className={styles['status-dot']}></div>
                                <span className={styles['player-name']}>{player.nickname}</span>
                                {player.nickname === nickname && <span className={styles['label-you']}> (You)</span>}
                                {player.nickname === lobby.lobbyHost && <span className={styles['label-host']}> (Host)</span>}
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
                                {Object.entries(GAME_MODES).map(([key, config]) => {
                                    const isActive = gameMode === key;
                                    return (
                                        <button
                                            key={key}
                                            className={`${styles['mode-card']} ${isActive ? styles['active'] : ''}`}
                                            onClick={() => handleModeChange(key)}
                                        >
                                            <div className={styles['mode-visual-area']}>
                                                {/* The Icon (Visible by default) */}
                                                <div className={styles['mode-icon']}>
                                                    {/* Placeholder for your assets later */}
                                                    <div className={styles['icon-placeholder']} />
                                                </div>

                                                {/* The Description (Visible on hover) */}
                                                <div className={styles['mode-description-overlay']}>
                                                    <p>{config.description}</p>
                                                </div>
                                            </div>

                                            <div className={styles['mode-footer']}>
                                                <h3>{config.label}</h3>
                                                {isActive && <span className={styles['active-dot']} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles['options-container']}>
                                <div className={styles['settings-scroll-area']}>
                                    {Object.entries(GAME_MODES[gameMode as keyof typeof GAME_MODES].settings).map(
                                        ([key, config]) => renderSetting(key, config)
                                    )}
                                </div>
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