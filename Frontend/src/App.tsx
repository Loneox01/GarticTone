import './App.css'
import { useState, useEffect } from 'react'
import { socket } from './services/socket';
import Home from './screens/HomeScreen';
import Game from './screens/GameScreen';

function App() {

    const [view, setView] = useState<'home' | 'lobby'>('home');
    const [nickname, setNickname] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [players, setPlayers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // frontend PASSIVE LISTENER
    useEffect(() => {
        socket.on("lobby_joined", (data) => {
            setRoomCode(data.lobby);
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
            lobby: roomCode,
            user: nickname
        });
        setView('home');
        // Reset local room data
        setRoomCode('');
        setPlayers([]);
    };

    // SYNC: ACTIVE LOBBY
    socket.on("user_left", (data) => {
        setPlayers(data.players);
    });

    return (
        <div className="app-main">
            {view === 'home' ? (
                <Home onJoin={goToLobby} externalError={error} />
            ) : (
                <Game onBack={goToHome} />
            )}
        </div>
    );

}

export default App
