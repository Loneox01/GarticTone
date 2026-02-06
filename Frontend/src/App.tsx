import './App.css'
import { useState, useEffect } from 'react'
import { socket } from './services/socket';

import type { Lobby } from "./types/lobby.ts";
import { GAME_FLOWS, type GameViews } from './types/views.ts';

import GuestScreen from './screens/GuestScreen';
import HomeScreen from './screens/HomeScreen';
import RecordingScreen from './screens/RecordingScreen';
import HostScreen from './screens/HostScreen.tsx';
import PromptScreen from './screens/PromptScreen.tsx';

function App() {

    const [view, setView] = useState<GameViews>('HOME');
    const [nickname, setNickname] = useState('');
    const [lobby, setLobby] = useState<Lobby | null>(null);;
    const [error, setError] = useState<string | null>(null);
    const [screenIndex, setScreenIndex] = useState(0); // refer to GAME_FLOWS
    const [ownPrompt, setOwnPrompt] = useState<string | null>(null);

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

            const mode = data.gameMode as keyof typeof GAME_FLOWS;
            setView(GAME_FLOWS[mode][screenIndex]);

            setScreenIndex(screenIndex + 1);
        });

        socket.on("lobby_dismantled", () => {
            setNickname('');
            setError('HOST_DISCONNECT')
            setView('HOME');
            setLobby(null);
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

    const passRecording = (recordingData: any[]) => {
        socket.emit("submit_recording", {
            nickname: nickname,
            recording: recordingData
        });
    }

    const setNextScreen = () => {
        if (!lobby || !lobby.gameMode) return;

        const mode = lobby.gameMode as keyof typeof GAME_FLOWS;

        const currentFlow = GAME_FLOWS[mode];
        if (currentFlow && currentFlow[screenIndex]) {
            setView(currentFlow[screenIndex]);
            setScreenIndex(prev => prev + 1);
        }
    }

    // SYNC: START GAME
    const initGame = (mode: string, settings: Record<string, any>) => {
        socket.emit("game_init", {
            lobbyId: lobby?.lobbyId,
            gameMode: mode,
            settings: settings
        });
    }

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
                    onBack={() => goToHome()}
                    onNext={(recordingData) => passRecording(recordingData)} />
            )}


        </div>
    );

}

export default App
