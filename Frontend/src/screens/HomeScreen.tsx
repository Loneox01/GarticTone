import styles from '../styles/Homescreen.module.css';
import { useState, useEffect } from 'react'
import MusicBackground from '../components/DriftingNotes';

import GT_logo from '../assets/GT_logo.png'

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

    const isNicknameError = externalError === "NICKNAME_TAKEN" || (isShaking && nickname === '' && !(externalError === "HOST_DISCONNECT"));
    const isLobbyError = externalError === "LOBBY_NOT_FOUND" || externalError === "HOST_DISCONNECT";

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
            else if (externalError === "HOST_DISCONNECT") {
                setLobbyId('');
                setPlaceholderLID("Host closed the lobby.");
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
                {/* Logo */}
                <img src={GT_logo} alt="Gartic Tone Logo" className={styles['home-logo']} />

                <input
                    // NICKNAME INPUT BAR            
                    className={`${styles['game-input']} ${isShaking && isNicknameError ? styles['error-shake'] : ''}`}
                    placeholder={placeholderNN}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <input
                    // LOBBYID INPUT BAR
                    className={`${styles['game-input']} ${isShaking && isLobbyError ? styles['error-shake'] : ''}`}
                    placeholder={placeholderLID}
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