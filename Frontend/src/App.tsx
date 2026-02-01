import './App.css'
import { useState, useEffect } from 'react'
import { socket } from './services/socket';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import RecordingScreen from './screens/RecordingScreen';

function App() {

    const [view, setView] = useState<'home' | 'lobby' | 'action'>('action');
    const [nickname, setNickname] = useState('');
    const [lobbyId, setLobbyId] = useState('');
    const [players, setPlayers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // frontend PASSIVE LISTENER
    useEffect(() => {
        socket.on("lobby_joined", (data) => {
            setLobbyId(data.lobby);
            setPlayers(data.players);
            setView('lobby'); // move rooms
        });

        socket.on("join_error", (data) => {
            setError(data.message);
        });

        return () => {
            socket.off("lobby_joined");
            socket.off("join_error");
        };
    }, []);

    // frontend TRIGGER MESSENGER

    // SYNC: JOIN LOBBY
    const goToLobby = (nickname: string, lobbyId: string) => {
        // global NN for frontend
        setNickname(nickname);

        // connect
        if (!socket.connected) socket.connect();

        // message to backend
        socket.emit("join_lobby", {
            user: nickname,
            lobby: lobbyId
        });
    };

    // SYNC: RETURN HOME
    const goToHome = () => {
        socket.emit("leave_lobby", {
            lobby: lobbyId,
            user: nickname
        });
        setView('home');
        // Reset local room data
        setLobbyId('');
        setPlayers([]);
    };

    // SYNC: ACTIVE LOBBY
    socket.on("user_left", (data) => {
        setPlayers(data.players);
    });

    return (
        <div className="app-main">
            {view === 'home' && (
                <HomeScreen onJoin={goToLobby} externalError={error} />
            )}

            {view === 'lobby' && (
                <GameScreen
                    nickname={nickname}
                    lobbyId={lobbyId}
                    players={players}
                    onBack={() => goToHome()}
                />
            )}

            {view === 'action' && (
                <RecordingScreen
                    nickname={nickname}
                    lobbyId={lobbyId}
                    players={players}
                    recDuration={10} // Example value
                    roundDuration={15} // Example value
                    onBack={() => setView('home')}
                />
            )}
        </div>
    );

}

export default App
