import Keyboard from "../components/Keyboard";
import '../styles/GameScreen.css';
import '../styles/Keyboard.css';

interface GameScreenProps {
    onBack: () => void;
}

const Game = ({ onBack }: GameScreenProps) => {
    return (
        <div className="game-container">
            <button onClick={onBack} className="btn-back">
                ← Back to Home
            </button>
            <hr style={{ borderColor: '#444', margin: '20px 0' }} />

            <Keyboard />
        </div>
    );
};

export default Game;