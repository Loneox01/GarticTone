import Keyboard from "../components/Keyboard";
import styles from '../styles/GameScreen.module.css';
import type { Player } from "../types/player.ts";

interface GameScreenProps {
    nickname: string;
    lobbyId: string;
    players: Player[];
    onBack: (nickname: string, lobbyId: string) => void;
}

const GameScreen = ({ onBack, nickname, lobbyId, players }: GameScreenProps) => {
    return (
        <div className={styles['game-container']}>
            <button onClick={() => onBack(nickname, lobbyId)} className={styles['btn-back']}>
                ← Leave
            </button>
            <hr style={{ borderColor: '#444', margin: '20px 0' }} />
            <div className={styles['info-bar']}>
                <div className={styles['info-box']}>
                    <span>PLAYER:</span> <strong>{nickname}</strong>
                </div>
                <div className={styles['info-box']}>
                    <span>LOBBY:</span> <strong>{lobbyId}</strong>
                </div>
            </div>
            <div className={styles['player-box-list']}>
                {players.map((player, index) => (
                    <div key={index} className={styles['player-tag']}>
                        <div className={styles['status-dot']}></div>
                        <span className={styles['player-name']}>{player.nickname}</span>

                        {/* Label for the current user */}
                        {player.nickname === nickname && <span className={styles['label-you']}> (You)</span>}

                        {/* Label for the host */}
                        {player.isHost && <span className={styles['label-host']}> (Host)</span>}
                    </div>
                ))}
            </div>
            <Keyboard />
        </div>
    );
};

export default GameScreen;