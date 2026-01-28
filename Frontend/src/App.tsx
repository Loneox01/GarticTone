import { useState, useEffect } from 'react'
import Keyboard from './components/Keyboard'
import { socket } from './services/socket';
import './App.css'


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

    if (view === 'home') {
        return (
            <div style={styles.container}>
                <button onClick={goToLobby} style={styles.button}>
                    To Lobby
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <button onClick={goToHome} style={styles.backButton}>
                ← Back to Home
            </button>
            <hr />
            <Keyboard />
        </div>
    );

}

const styles = {
    container: { padding: '20px', textAlign: 'center' as const },
    button: { padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer' },
    backButton: { padding: '5px 10px', marginBottom: '10px' }
};

export default App
