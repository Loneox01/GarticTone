import './App.css';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient.ts';
import { DEFAULT_SONG_LIST } from './types/constants.ts'

import type { Lobby } from "./types/lobby.ts";
import { GAME_FLOWS } from './types/views.ts';

import GuestScreen from './screens/GuestScreen.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import RecordingScreen from './screens/RecordingScreen.tsx';
import HostScreen from './screens/HostScreen.tsx';
import PromptScreen from './screens/PromptScreen.tsx';
import ListeningScreen from './screens/ListeningScreen.tsx';
import ResultsScreen from './screens/ResultsScreen.tsx';

function App() {

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

    const isAdvancingRoundRef = useRef(false);

    useEffect(() => {
        lobbyRef.current = lobby;
    }, [lobby]);

    // Supabase disconnect listener
    useEffect(() => {
        if (!lobby?.lobbyId || !nickname) return;
        const roomCode = lobby.lobbyId;

        // Send heartbeat
        const heartbeatInterval = setInterval(async () => {
            await supabase.from('players')
                .update({ last_seen: new Date().toISOString() })
                .eq('room_code', roomCode)
                .eq('nickname', nickname);
        }, 3000);

        // Cleanup stale players - SQL triggers handle the rest
        const cleanupInterval = setInterval(async () => {
            const staleThreshold = new Date(Date.now() - 10000);

            await supabase.from('players')
                .delete()
                .eq('room_code', roomCode)
                .lt('last_seen', staleThreshold.toISOString());
        }, 5000);

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(cleanupInterval);
        };
    }, [lobby?.lobbyId, nickname]);

    // ==========================================
    // FRONTEND PASSIVE LISTENER (SUPABASE SYNC)
    // ==========================================
    useEffect(() => {
        if (!lobby?.lobbyId) return;
        const roomCode = lobby.lobbyId;

        // 1. Listen for player changes (joins, leaves, ready status)
        const playersChannel = supabase
            .channel(`players-${roomCode}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `room_code=eq.${roomCode}`
            }, async () => {
                const { data } = await supabase.from('players')
                    .select('*')
                    .eq('room_code', roomCode)
                    .order('created_at', { ascending: true });

                if (data) {
                    let readyCount = 0;
                    const playersDict: Record<string, any> = {};

                    data.forEach(p => {
                        if (p.ready) readyCount++;
                        playersDict[p.nickname] = p;
                    });

                    setPlayersReady({ ready: readyCount, total: data.length });
                    setLobby(prev => prev ? { ...prev, players: playersDict } : null);

                    // Host advance logic with race condition guard
                    const currentLobby = lobbyRef.current;
                    if (currentLobby?.lobbyHost === nickname &&
                        readyCount === data.length &&
                        data.length > 0 &&
                        !isAdvancingRoundRef.current) {  // ← NEW GUARD

                        // Set flag IMMEDIATELY to block concurrent calls
                        isAdvancingRoundRef.current = true;

                        try {
                            const { data: currentRoom } = await supabase.from('rooms')
                                .select('round_num, num_rounds')
                                .eq('room_code', roomCode)
                                .single();

                            if (currentRoom) {


                                await supabase.from('rooms').update({
                                    round_num: currentRoom.round_num + 1
                                }).eq('room_code', roomCode);

                                await supabase.from('players').update({
                                    ready: false
                                }).eq('room_code', roomCode);
                            }
                        } finally {
                            // Reset flag after a short delay to allow room update to propagate
                            setTimeout(() => {
                                isAdvancingRoundRef.current = false;
                            }, 1000);
                        }
                    }
                }
            })
            .subscribe();

        // 2. Listen for ROOM changes (Game Start, Round Advancement, Dismantle)
        const roomsChannel = supabase
            .channel(`rooms-${roomCode}`)
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'rooms',
                filter: `room_code=eq.${roomCode}`
            }, () => {
                // Room was deleted (by trigger) - just go home
                setError('HOST_DISCONNECT');
                resetLocalState();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `room_code=eq.${roomCode}`
            }, async (payload) => {
                const updatedRoom = payload.new as any;
                if (updatedRoom) {
                    // 1. SYNC: lobby state
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
                    // If the DB round is higher than our local round, a new round has started
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
            });

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
            });
        }
    };

    const goToHome = async () => {
        if (lobby && nickname) {
            await supabase.from('players')
                .delete()
                .eq('room_code', lobby.lobbyId)
                .eq('nickname', nickname);
        }

        resetLocalState();
    };

    const resetLocalState = () => {
        setLobby(null);
        setScreenIndex(0);
        setOwnPrompt(null);
        setCurrentRecording([]);
        setGameResults(null);
        setListeningTime(0);
        setPlayersReady({ ready: 0, total: 0 });
        setNickname('');
    };

    // SYNC: START GAME (Triggered by Host)
    const initGame = async (mode: string, settings: Record<string, any>) => {
        if (!lobby) return;

        // 1. Get all players
        const { data: players } = await supabase.from('players').select('*').eq('room_code', lobby.lobbyId);
        if (!players || players.length < 2) return alert("2+ players required to play.");

        // 2. Prepare Prompts & Initial Chains
        let availablePrompts: string[] = [];

        if (settings.inputList && settings.inputList.trim().length > 0) {
            availablePrompts = settings.inputList.split(',').map((item: string) => item.trim());
        }

        if (availablePrompts.length < players.length) {
            availablePrompts = [...DEFAULT_SONG_LIST];
        }

        // 3. Assign indexes and prompts to players
        for (let i = availablePrompts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availablePrompts[i], availablePrompts[j]] = [availablePrompts[j], availablePrompts[i]];
        }

        const emptyRecList = Array.from({ length: players.length }, () => []);

        // 4. Assign indexes and prompts to players
        const updates = players.map((p, index) => {
            return supabase.from('players').update({
                player_index: index,
                // Use modulo index so if we have more players than prompts, it wraps around
                assigned_prompt: availablePrompts[index % availablePrompts.length],
                ready: false
            }).eq('id', p.id);
        });
        await Promise.all(updates);

        // 5. Update the room to Start Game
        await supabase.from('rooms').update({
            game_mode: mode,
            settings: settings,
            game_started: true,
            round_num: 1,
            num_rounds: Math.min(players.length, 10),
            rec_list: emptyRecList
        }).eq('room_code', lobby.lobbyId);
    };

    // SYNC: SUBMIT RECORDING
    const passRecording = async (recordingData: any[]) => {
        console.log('🎵 passRecording CALLED:', {
            timestamp: Date.now(),
            nickname,
            lobbyId: lobby?.lobbyId,
            dataLength: recordingData.length,
            firstNote: recordingData[0],
            lastNote: recordingData[recordingData.length - 1]
        });

        if (!lobby) {
            return;
        }

        // 1. Fetch current state
        const { data: room } = await supabase.from('rooms')
            .select('rec_list, round_num')
            .eq('room_code', lobby.lobbyId)
            .single();
        const { data: me } = await supabase.from('players')
            .select('player_index')
            .eq('room_code', lobby.lobbyId)
            .eq('nickname', nickname)
            .single();


        if (!room || !me) {
            return;
        }

        const roundNum = room.round_num || 1;
        const targetChainIndex = (me.player_index + roundNum - 1) % room.rec_list.length;


        const targetChain = room.rec_list[targetChainIndex] || [];
        const currentDuration = targetChain.length > 0
            ? Math.max(...targetChain.map((n: any) => n.time))
            : 0;

        const offsetRecording = recordingData.map(note => ({
            ...note,
            time: note.time + currentDuration
        }));

        await supabase.rpc('append_recording', {
            p_room_code: lobby.lobbyId,
            p_chain_index: targetChainIndex,
            p_new_notes: offsetRecording,
            p_nickname: nickname
        });
    };

    // ==========================================
    // HOST AUTO-ADVANCE TIMER (AFK / DISCONNECT FALLBACK)
    // ==========================================
    useEffect(() => {
        if (!lobby || !lobby.gameStarted || lobby.lobbyHost !== nickname) return;

        const mode = lobby.gameMode as keyof typeof GAME_FLOWS;
        const flow = GAME_FLOWS[mode];
        if (!flow) return;

        const currentViewType = flow[screenIndex - 1];

        if (currentViewType === 'RECORDING') {
            const roundDur = lobby.settings?.roundDuration || 15;
            const timeLimit = roundDur + 5;

            const autoAdvanceTimer = setTimeout(async () => {
                const me = lobby.players[nickname];

                if (me && !me.ready) {
                    // console.log("⏳ Host AFK fallback: Submitting silence...");
                    await passRecording([]);
                }
            }, timeLimit * 1000);

            return () => {
                clearTimeout(autoAdvanceTimer);
            };
        }
    }, [screenIndex, lobby?.roundNum, lobby?.gameStarted]);

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

    const renderActiveScreen = () => {
        if (!lobby) return <HomeScreen onJoin={goToLobby} externalError={error} />;

        if (!lobby.gameStarted) {
            // Check if current user is the host instead of using 'view'
            return lobby.lobbyHost === nickname
                ? <HostScreen nickname={nickname} lobby={lobby} onBack={goToHome} onStart={initGame} />
                : <GuestScreen nickname={nickname} lobby={lobby} onBack={goToHome} />;
        }

        const mode = lobby.gameMode as keyof typeof GAME_FLOWS;
        const flow = GAME_FLOWS[mode];
        const currentViewType = flow[screenIndex - 1];

        switch (currentViewType) {
            case 'PROMPT':
                return <PromptScreen
                    nickname={nickname}
                    lobby={lobby}
                    prompt={ownPrompt || ""}
                    onBack={() => goToHome()}
                    onNext={() => setNextScreen(true)} />;
            case 'RECORDING':
                return <RecordingScreen
                    nickname={nickname}
                    lobby={lobby}
                    playersReady={playersReady}
                    prevRecording={currentRecording}
                    onBack={() => goToHome()}
                    onNext={(recordingData) => passRecording(recordingData)} />;
            case 'LISTENING':
                return <ListeningScreen
                    nickname={nickname}
                    lobby={lobby}
                    listeningTime={listeningTime}
                    recording={currentRecording}
                    onBack={() => goToHome()}
                    onNext={() => listenToRec()} />;
            case 'RESULTS':
                return <ResultsScreen
                    results={gameResults!}
                    nickname={nickname}
                    onHome={goToHome}
                />;
            default:
                return <div>Loading...       (if this is Blind Karaoke, Sorry! It's still in progess. Please refresh and try out Classic in the mean time. )</div>;
        }
    };

    return (
        <div className="app-main">
            {renderActiveScreen()}
        </div>
    );
}

export default App