import Keyboard from "../components/Keyboard";
import '../styles/GameScreen.css';
import '../styles/Keyboard.css';

interface GameScreenProps {
    nickname: string;
    lobbyId: string;
    players: string[];
    onBack: (nickname: string, lobbyId: string) => void;
}

const GameScreen = ({ onBack, nickname, lobbyId, players }: GameScreenProps) => {
    return (
        <div className="game-container">
            <button onClick={() => onBack(nickname, lobbyId)} className="btn-back">
                ← Leave Lobby
            </button>
            <hr style={{ borderColor: '#444', margin: '20px 0' }} />
            <div className="info-bar">
                <div className="info-box">
                    <span>PLAYER:</span> <strong>{nickname}</strong>
                </div>
                <div className="info-box">
                    <span>LOBBY:</span> <strong>{lobbyId}</strong>
                </div>
            </div>
            <div className="player-box-list">
                {players.map((player, index) => (
                    <div key={index} className="player-tag">
                        <div className="status-dot"></div>
                        {player} {player === nickname && "(You)"}
                    </div>
                ))}
            </div>
            <Keyboard />
        </div>
    );
};

export default GameScreen;