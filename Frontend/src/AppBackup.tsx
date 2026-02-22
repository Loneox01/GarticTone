import './App.css';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { DEFAULT_SONG_LIST } from './types/constants.ts'

import type { Lobby } from "./types/lobby.ts";
import { GAME_FLOWS, type GameViews } from './types/views.ts';

import GuestScreen from './screens/GuestScreen';
import HomeScreen from './screens/HomeScreen';
import RecordingScreen from './screens/RecordingScreen';
import HostScreen from './screens/HostScreen.tsx';
import PromptScreen from './screens/PromptScreen.tsx';
import ListeningScreen from './screens/ListeningScreen.tsx';
import ResultsScreen from './screens/ResultsScreen.tsx';

function App() {

    const [view, setView] = useState<GameViews>('HOME');
    const [nickname, setNickname] = useState('');
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const lobbyRef = useRef<Lobby | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [screenIndex, setScreenIndex] = useState(0);
    const [ownPrompt, setOwnPrompt] = useState<string | null>(null);
    const [playersReady, setPlayersReady] = useState({ ready: 0, total: 0 });
    const [currentRecording, setCurrentRecording] = useState<any[]>([]);
    const [listeningTime, setListeningTime] = useState<number>(0);
    const [gameResults, setGameResults] = useState<{ recList: any[], prompts: string[] } | null>(null);

    useEffect(() => {
        lobbyRef.current = lobby;
    }, [lobby]);

    // screen handler
    useEffect(() => {
        if (!lobby?.gameMode) return;

        const mode = lobby.gameMode as keyof typeof GAME_FLOWS;
        const currentFlow = GAME_FLOWS[mode];
        const viewToSet = currentFlow[screenIndex - 1];

        if (viewToSet && viewToSet !== view) {
            setView(viewToSet);
        }
    }, [screenIndex, lobby?.gameMode]);

    // ==========================================
    // FRONTEND PASSIVE LISTENER (SUPABASE SYNC)
    // ==========================================
    useEffect(() => {
        if (!lobby?.lobbyId) return;

        const roomCode = lobby.lobbyId;

        // 1. Listen for PLAYER changes (Joins, Leaves, Ready Status)
        const playersChannel = supabase
            .channel(`players-${roomCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}` }, async () => {

                // Fetch the latest players
                const { data } = await supabase.from('players').select('*').eq('room_code', roomCode);

                if (data) {
                    let readyCount = 0;
                    const playersDict: Record<string, any> = {};

                    data.forEach(p => {
                        if (p.ready) readyCount++;
                        playersDict[p.nickname] = p; // Rebuild the dictionary
                    });

                    setPlayersReady({ ready: readyCount, total: data.length });

                    // Sync the dictionary back into the lobby state
                    setLobby(prev => prev ? { ...prev, players: playersDict } : null);

                    // === THE HOST ADVANCE LOGIC ===
                    const currentLobby = lobbyRef.current;
                    if (currentLobby?.lobbyHost === nickname && readyCount === data.length && data.length > 0) {
                        const { data: currentRoom } = await supabase.from('rooms')
                            .select('round_num, num_rounds')
                            .eq('room_code', roomCode)
                            .single();

                        if (currentRoom) {
                            await supabase.from('rooms').update({
                                round_num: currentRoom.round_num + 1
                            }).eq('room_code', roomCode);

                            // Reset everyone to not ready
                            await supabase.from('players').update({ ready: false }).eq('room_code', roomCode);
                        }
                    }
                }
            })
            .subscribe();

        // 2. Listen for ROOM changes (Game Start, Round Advancement, Dismantle)
        const roomsChannel = supabase
            .channel(`rooms-${roomCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, async (payload) => {

                // If Host deletes the room, kick everyone out
                if (payload.eventType === 'DELETE') {
                    setNickname('');
                    setError('HOST_DISCONNECT');
                    setView('HOME');
                    setLobby(null);
                    return;
                }

                const updatedRoom = payload.new as any;

                if (updatedRoom) {
                    // 1. Sync the lobby state
                    // We map the snake_case from DB to your camelCase Lobby type
                    setLobby(prev => prev ? {
                        ...prev,
                        gameMode: updatedRoom.game_mode || prev.gameMode,
                        settings: updatedRoom.settings || prev.settings,
                        roundNum: updatedRoom.round_num,
                        numRounds: updatedRoom.num_rounds,
                        recList: updatedRoom.rec_list,
                        gameStarted: updatedRoom.game_started
                    } : null);

                    const currentLobby = lobbyRef.current;
                    if (!currentLobby) return;

                    // 2. SYNC: GAME OVER
                    if (updatedRoom.round_num > updatedRoom.num_rounds && updatedRoom.num_rounds > 0) {
                        const { data: allPlayers } = await supabase
                            .from('players')
                            .select('*')
                            .eq('room_code', roomCode)
                            .order('player_index', { ascending: true });

                        if (allPlayers) {
                            setGameResults({
                                recList: updatedRoom.rec_list,
                                prompts: allPlayers.map(p => p.assigned_prompt)
                            });

                            // Use the flow length to set the index to the last screen (RESULTS)
                            const mode = updatedRoom.game_mode as keyof typeof GAME_FLOWS;
                            const flow = GAME_FLOWS[mode];
                            setScreenIndex(flow.length);
                        }
                        return;
                    }

                    // 3. SYNC: ROUND ADVANCEMENT
                    // If the DB round is higher than our local round, a new round has started!
                    if (updatedRoom.round_num > (currentLobby.roundNum || 1)) {
                        const myPlayer = currentLobby.players[nickname];

                        if (myPlayer && updatedRoom.rec_list) {
                            const totalChains = updatedRoom.rec_list.length;
                            const targetChainIndex = (myPlayer.player_index + updatedRoom.round_num - 1) % totalChains;
                            const nextRecordingToHear = updatedRoom.rec_list[targetChainIndex];

                            setCurrentRecording(nextRecordingToHear || []);

                            if (updatedRoom.round_num > 1) {
                                setScreenIndex(3); // Skips PROMPT and RECORDING to go to LISTENING
                            } else {
                                setScreenIndex(1);
                            }
                        }

                        const durationSetting = updatedRoom.settings?.recDuration || 15;
                        const calculatedTime = (durationSetting * (updatedRoom.round_num - 1)) + 2;
                        setListeningTime(calculatedTime);
                    }

                    // 4. SYNC: INITIAL GAME START
                    if (updatedRoom.game_started && screenIndex === 0) {
                        const { data: me } = await supabase
                            .from('players')
                            .select('assigned_prompt')
                            .eq('room_code', roomCode)
                            .eq('nickname', nickname)
                            .single();

                        setOwnPrompt(me?.assigned_prompt || "Start a melody!");
                        setScreenIndex(1); // Moves from Lobby to the first game screen (PROMPT)
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(playersChannel);
            supabase.removeChannel(roomsChannel);
        };
    }, [lobby?.lobbyId, nickname, screenIndex]);


    // ==========================================
    // FRONTEND TRIGGER MESSENGERS
    // ==========================================

    // SYNC: JOIN LOBBY
    const goToLobby = async (newName: string, lobbyId: string) => {
        const username = newName.trim();
        let code = lobbyId.trim().toUpperCase();
        setNickname(username);
        setError(null);

        if (!code) {
            // 1. HOSTING A NEW LOBBY
            code = Math.random().toString(36).substring(2, 8).toUpperCase();

            const { error: roomErr } = await supabase.from('rooms').insert([{
                room_code: code, host_nickname: username
            }]);

            if (roomErr) return setError("Failed to create room");

            await supabase.from('players').insert([{ room_code: code, nickname: username }]);

            // Set local state
            setLobby({
                lobbyId: code,
                lobbyHost: username,
                players: { [username]: { nickname: username, player_index: 0, ready: false } },
                gameMode: "",
                settings: {},
                gameStarted: false,
                roundNum: 1,
                numRounds: 1,
                recList: []
            }); setView('HOSTLOBBY');

        } else {
            // 2. JOINING EXISTING LOBBY
            const { data: room } = await supabase.from('rooms').select('*').eq('room_code', code).single();
            if (!room) return setError("LOBBY_NOT_FOUND");

            const { error: pErr } = await supabase.from('players').insert([{ room_code: code, nickname: username }]);
            if (pErr) return setError("NICKNAME_TAKEN");

            // Fetch initial players to populate the dictionary
            const { data: playersData } = await supabase.from('players').select('*').eq('room_code', code);
            const playersDict: Record<string, any> = {};
            playersData?.forEach(p => {
                playersDict[p.nickname] = {
                    nickname: p.nickname,
                    player_index: p.player_index,
                    assigned_prompt: p.assigned_prompt
                };
            });

            setLobby({
                lobbyId: code,
                lobbyHost: room.host_nickname,
                players: playersDict,
                gameMode: room.game_mode || "",
                settings: room.settings || {},
                gameStarted: room.game_started || false,
                roundNum: room.round_num || 1,
                numRounds: room.num_rounds || 1,
                recList: room.rec_list || []
            }); setView('LOBBY');
        }
    };

    const goToHome = async () => {
        if (lobby && nickname) {
            if (lobby.lobbyHost === nickname) {
                // Host leaves: Delete room (Database triggers will cascade and delete all players)
                await supabase.from('rooms').delete().eq('room_code', lobby.lobbyId);
            } else {
                // Guest leaves
                await supabase.from('players').delete().eq('room_code', lobby.lobbyId).eq('nickname', nickname);
            }
        }

        // Reset local states
        setLobby(null); setCurrentRecording([]); setOwnPrompt(null); setGameResults(null);
        setListeningTime(0); setScreenIndex(0); setPlayersReady({ ready: 0, total: 0 });
        setNickname(''); setView('HOME');
    };

    // SYNC: START GAME (Triggered by Host)
    const initGame = async (mode: string, settings: Record<string, any>) => {
        if (!lobby) return;

        // 1. Get all players
        const { data: players } = await supabase.from('players').select('*').eq('room_code', lobby.lobbyId);
        if (!players || players.length < 2) return alert("2+ players required to play.");

        // 2. Prepare Prompts & Initial Chains
        const isClassic = mode === "CLASSIC";
        let availablePrompts = isClassic ? [...DEFAULT_SONG_LIST] : [];
        // Shuffle prompts
        availablePrompts = availablePrompts.sort(() => 0.5 - Math.random());

        const emptyRecList = Array.from({ length: players.length }, () => []);

        // 3. Assign indexes and prompts to players
        const updates = players.map((p, index) => {
            return supabase.from('players').update({
                player_index: index,
                assigned_prompt: isClassic ? availablePrompts[index] : null,
                ready: false
            }).eq('id', p.id);
        });
        await Promise.all(updates);

        // 4. Update the room to Start Game
        await supabase.from('rooms').update({
            game_mode: mode,
            settings: settings,
            game_started: true,
            round_num: 1,
            num_rounds: players.length, // From main.py logic
            rec_list: emptyRecList
        }).eq('room_code', lobby.lobbyId);
    };

    // SYNC: SUBMIT RECORDING
    const passRecording = async (recordingData: any[]) => {
        if (!lobby) return;

        // 1. Fetch current room state & my player index
        const { data: room } = await supabase.from('rooms').select('rec_list, round_num').eq('room_code', lobby.lobbyId).single();
        const { data: me } = await supabase.from('players').select('player_index').eq('room_code', lobby.lobbyId).eq('nickname', nickname).single();

        if (!room || !me) return;

        let currentRecList = room.rec_list || [];
        const roundNum = room.round_num || 1;

        // 2. Calculate which chain we are adding to
        const targetChainIndex = (me.player_index + roundNum - 1) % currentRecList.length;
        let targetChain = currentRecList[targetChainIndex] || [];

        // 3. Apply Time Offset (from your main.py)
        const currentDuration = targetChain.length > 0
            ? Math.max(...targetChain.map((n: any) => n.time))
            : 0;

        const offsetRecording = recordingData.map(note => ({
            ...note,
            time: note.time + currentDuration
        }));

        // 4. Update the specific chain
        currentRecList[targetChainIndex] = [...targetChain, ...offsetRecording];

        // 5. Save the new chain to the room and mark myself as Ready
        await supabase.from('rooms').update({ rec_list: currentRecList }).eq('room_code', lobby.lobbyId);
        await supabase.from('players').update({ ready: true }).eq('room_code', lobby.lobbyId).eq('nickname', nickname);
    };

    const setNextScreen = (forward: boolean = true) => {
        setScreenIndex((prev) => {
            const mode = lobbyRef.current?.gameMode as keyof typeof GAME_FLOWS;
            const flow = mode ? GAME_FLOWS[mode] : [];
            const next = forward ? prev + 1 : prev - 1;
            const clamped = Math.max(1, Math.min(flow.length, next));
            return clamped;
        });
    };

    const setNextScreenRef = useRef(setNextScreen);

    useEffect(() => {
        setNextScreenRef.current = setNextScreen;
    });

    const listenToRec = () => {
        const endTime = currentRecording.length > 0 ? Math.max(...currentRecording.map(n => n.time)) : 0;
        const truncTime = 5;
        const startTime = Math.max(0, endTime - truncTime);
        const truncatedRef = currentRecording
            .filter(note => note.time >= startTime)
            .map(note => ({ ...note, time: note.time - startTime }));

        setCurrentRecording(truncatedRef);
        setNextScreen(false);
    };

    return (
        <div className="app-main">
            {view === 'HOME' && <HomeScreen onJoin={goToLobby} externalError={error} />}

            {view === 'LOBBY' && lobby && (
                <GuestScreen nickname={nickname} lobby={lobby} onBack={() => goToHome()} />
            )}

            {view === 'HOSTLOBBY' && lobby && (
                <HostScreen
                    nickname={nickname}
                    lobby={lobby}
                    onBack={() => goToHome()}
                    onStart={(mode, settings) => {
                        initGame(mode, settings); // Pushes update to DB
                    }}
                />
            )}

            {view === 'PROMPT' && lobby && (
                <PromptScreen
                    nickname={nickname}
                    lobby={lobby}
                    prompt={ownPrompt || ""}
                    onBack={() => goToHome()}
                    onNext={() => setNextScreen(true)}
                />
            )}

            {view === 'RECORDING' && lobby && (
                <RecordingScreen
                    nickname={nickname}
                    lobby={lobby}
                    playersReady={playersReady}
                    prevRecording={currentRecording}
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
                    onNext={() => listenToRec()} />
            )}

            {view === 'RESULTS' && gameResults && (
                <ResultsScreen
                    results={gameResults}
                    nickname={nickname}
                    onHome={goToHome}
                />
            )}

        </div>
    );

}

export default App