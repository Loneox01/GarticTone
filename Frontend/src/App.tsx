import './App.css'
import { useState, useEffect } from 'react'
import { socket } from './services/socket';
import Home from './screens/HomeScreen';
import Game from './screens/GameScreen';

function App() {

    const [view, setView] = useState<'home' | 'lobby'>('home');

    useEffect(() => {
        socket.on("user_joined", (data) => {
            console.log("New player in the lobby:", data.user);
        });

        return () => {
            socket.off("user_joined");
        };
    }, []);

    // SYNC: JOIN LOBBY
    const goToLobby = () => {
        socket.connect(); // opens the connection
        socket.emit("join_lobby", { lobby: "MainRoom" });
        setView('lobby');
    };

    // SYNC: RETURN HOME
    const goToHome = () => {
        socket.emit("leave_lobby", { lobby: "MainRoom" });
        setView('home');
    };

    return (
        <div className="app-main">
            {view === 'home' ? (
                <Home onStart={goToLobby} />
            ) : (
                <Game onBack={goToHome} />
            )}
        </div>
    );

}

export default App
