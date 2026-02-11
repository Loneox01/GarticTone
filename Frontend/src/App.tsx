import './App.css'
import { useState, useEffect, useRef } from 'react'
import { socket } from './services/socket';

import type { Lobby } from "./types/lobby.ts";
import { GAME_FLOWS, type GameViews } from './types/views.ts';

import GuestScreen from './screens/GuestScreen';
import HomeScreen from './screens/HomeScreen';
import RecordingScreen from './screens/RecordingScreen';
import HostScreen from './screens/HostScreen.tsx';
import PromptScreen from './screens/PromptScreen.tsx';
import ListeningScreen from './screens/ListeningScreen.tsx';

function App() {

    const [view, setView] = useState<GameViews>('HOME');
    const [nickname, setNickname] = useState('');
    const [lobby, setLobby] = useState<Lobby | null>(null);;
    const lobbyRef = useRef<Lobby | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [screenIndex, setScreenIndex] = useState(0); // refer to GAME_FLOWS
    const [ownPrompt, setOwnPrompt] = useState<string | null>(null);
    const [playersReady, setPlayersReady] = useState({ ready: 0, total: 0 });
    const [currentRecording, setCurrentRecording] = useState<any[]>([]);
    const [listeningTime, setListeningTime] = useState<number>(0);

    // lobby ref.
    useEffect(() => {
        lobbyRef.current = lobby;
    }, [lobby]);

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

        socket.on("user_left", (data: { leaver: string }) => {
            setLobby(prevLobby => {
                if (!prevLobby) return null;

                const updatedPlayers = { ...prevLobby.players };

                delete updatedPlayers[data.leaver];

                return {
                    ...prevLobby,
                    players: updatedPlayers
                };
            });
        });

        socket.on("join_error", (data) => {
            setError(data.message);
        });

        // SYNC: START GAME
        socket.on("game_start", (data: {
            gameMode: string,
            settings: Record<string, any>,
            assignedPrompt: string | null
        }) => {
            setLobby(prevLobby => {
                if (!prevLobby) return null;

                return {
                    ...prevLobby,
                    gameMode: data.gameMode,
                    settings: {
                        ...data.settings,
                        inputList: "" // clear it out, no longer used
                    }
                };
            });
            setOwnPrompt(data.assignedPrompt);

            setScreenIndex(0);
            setNextScreen();
        });

        socket.on("lobby_dismantled", () => {
            setNickname('');
            setError('HOST_DISCONNECT')
            setView('HOME');
            setLobby(null);
        });

        socket.on("update_players_ready", (data: { ready: number, total: number }) => {
            setPlayersReady(data);
        });

        socket.on("next_assignment", (data: {
            nextRec: any[],
            listeningTime: number
        }) => {
            setCurrentRecording(data.nextRec);
            setListeningTime(data.listeningTime);
            setNextScreen();
            setPlayersReady(prev => ({
                ready: 0,
                total: prev.total
            }));
        });

        return () => {
            socket.off("lobby_joined");
            socket.off("user_left");
            socket.off("join_error");
            socket.off("game_start");
            socket.off("lobby_dismantled");
            socket.off("update_players_ready")
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

    // SYNC: START GAME
    const initGame = (mode: string, settings: Record<string, any>) => {
        socket.emit("game_init", {
            lobbyId: lobby?.lobbyId,
            gameMode: mode,
            settings: settings
        });
    }

    // SYNC: LOBBY GAME STARTED
    const passRecording = (recordingData: any[]) => {
        socket.emit("submit_recording", {
            nickname: nickname,
            recording: recordingData
        });
    }

    const setNextScreen = () => {
        const currentLobby = lobbyRef.current;
        if (!currentLobby || !currentLobby.gameMode) return;

        const mode = currentLobby.gameMode as keyof typeof GAME_FLOWS;
        const currentFlow = GAME_FLOWS[mode];

        setScreenIndex((prevIndex) => {
            const nextIndex = prevIndex + 1;
            const nextView = currentFlow[prevIndex];

            if (nextView) {
                setView(nextView);
                return nextIndex;
            }
            return prevIndex;
        });
    };

    return (
        <div className="app-main">
            {view === 'HOME' && (
                <HomeScreen onJoin={goToLobby} externalError={error} />
            )}

            {view === 'LOBBY' && lobby && (
                <GuestScreen
                    nickname={nickname}
                    lobby={lobby} // Pass the whole object
                    onBack={() => goToHome()}
                />
            )}

            {view === 'HOSTLOBBY' && lobby && (
                <HostScreen
                    nickname={nickname}
                    lobby={lobby}
                    onBack={() => goToHome()}
                    onStart={(mode, settings) => {
                        lobby.gameMode = mode;
                        lobby.settings = settings;
                        initGame(mode, settings);
                    }}
                />
            )}

            {view === 'PROMPT' && lobby && (
                <PromptScreen
                    nickname={nickname}
                    lobby={lobby}
                    prompt={ownPrompt || ""}
                    onBack={() => goToHome()}
                    onNext={() => setNextScreen()}
                />
            )}

            {view === 'RECORDING' && lobby && (
                <RecordingScreen
                    nickname={nickname}
                    lobby={lobby}
                    playersReady={playersReady}
                    onBack={() => goToHome()}
                    onNext={(recordingData) => passRecording(recordingData)} />
            )}

            {view === 'LISTENING' && lobby && (
                <ListeningScreen
                    nickname={nickname}
                    lobby={lobby}
                    listeningTime={listeningTime}
                    recording={currentRecording}
                    onBack={() => goToHome()}
                    onNext={() => goToHome()} />
            )}

        </div>
    );

}

export default App
