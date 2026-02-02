import styles from '../styles/Homescreen.module.css';
import { useState, useEffect } from 'react'
import MusicBackground from '../components/DriftingNotes';

interface HomeProps {
    onJoin: (nickname: string, lobbyId: string) => void;
    externalError: string | null;
}

const HomeScreen = ({ onJoin, externalError }: HomeProps) => {
    const [nickname, setNickname] = useState('');
    const [lobbyId, setLobbyId] = useState('');
    const [placeholderNN, setPlaceholderNN] = useState('Nickname');
    const [placeholderLID, setPlaceholderLID] = useState('LobbyID');
    const [isShaking, setIsShaking] = useState(false);

    const nnError = externalError === "NICKNAME_TAKEN" || (nickname === '');
    const lidError = externalError === "LOBBY_NOT_FOUND";

    useEffect(() => {
        if (externalError) {

            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);

            if (externalError == "NICKNAME_TAKEN") {
                // clear the nickname if it was taken
                setNickname('');
                setPlaceholderNN("Nickname taken, try another one."); // placeholder
            }
            else if (externalError === "LOBBY_NOT_FOUND") {
                // input lobbyId not found
                setLobbyId('');
                setPlaceholderLID("Lobby not found."); // placeholder
            }
        }
    }, [externalError]);

    const handleJoin = () => {
        if (nickname.trim() === '') {
            setNickname('');
            setPlaceholderNN('Please input a Nickname.');

            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400)
            return;
        }
        onJoin(nickname, lobbyId);
    };

    return (
        <div className={styles['home-container']}>
            <MusicBackground />
            <div className={styles['home-content']}>
                <input
                    // NICKNAME INPUT BAR            
                    className={`${styles['game-input']} ${isShaking && nnError ? styles['error-shake'] : ''}`} placeholder={placeholderNN}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <input
                    // LOBBYID INPUT BAR
                    className={`${styles['game-input']} ${isShaking && lidError ? styles['error-shake'] : ''}`} placeholder={placeholderLID}
                    value={lobbyId}
                    onChange={(e) => setLobbyId(e.target.value)}
                />
                <button
                    // START BUTTON
                    className={styles['btn-start']}
                    onClick={handleJoin}
                >
                    PLAY
                </button>
            </div>
        </div>
    );
};

export default HomeScreen;