import './App.css'
import { useState, useEffect } from 'react'
import { socket } from './services/socket';

import type { Lobby } from "./types/lobby.ts";
import type { GameView } from './types/views.ts';

import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import RecordingScreen from './screens/RecordingScreen';
import HostScreen from './screens/HostScreen.tsx';

function App() {

    const [view, setView] = useState<GameView>('HOME');
    const [nickname, setNickname] = useState('');
    const [lobby, setLobby] = useState<Lobby | null>(null);;
    const [error, setError] = useState<string | null>(null);

    // frontend PASSIVE LISTENER
    useEffect(() => {
        socket.on("lobby_joined", (data: Lobby & { username: string }) => {
            setLobby(data);
            setView((currentView) => {
                if (currentView === 'HOME') {
                    return data.lobbyHost === data.username ? 'HOSTLOBBY' : 'LOBBY';
                }
                return currentView;
            });
        });

        socket.on("user_left", (data: Lobby) => {
            setLobby(data);
        });

        socket.on("join_error", (data) => {
            setError(data.message);
        });

        return () => {
            socket.off("lobby_joined");
            socket.off("user_left");
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

    const goToHome = () => {
        if (lobby) {
            socket.emit("leave_lobby", {
                lobby: lobby.lobbyId,
                user: nickname
            });
        }
        setView('HOME');
        setLobby(null);
    };

    return (
        <div className="app-main">
            {view === 'HOME' && (
                <HomeScreen onJoin={goToLobby} externalError={error} />
            )}

            {view === 'LOBBY' && lobby && (
                <GameScreen
                    nickname={nickname}
                    lobby={lobby} // Pass the whole object
                    onBack={() => goToHome()}
                />
            )}

            {view === 'RECORDING' && lobby && (
                <RecordingScreen
                    nickname={nickname}
                    lobby={lobby}
                    recDuration={10}
                    roundDuration={15}
                    onBack={() => goToHome()}
                />
            )}

            {view === 'HOSTLOBBY' && lobby && (
                <HostScreen
                    nickname={nickname}
                    lobby={lobby}
                    onBack={() => goToHome()}
                />
            )}
        </div>
    );

}

export default App
