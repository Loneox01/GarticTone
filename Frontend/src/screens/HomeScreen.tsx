import '../styles/HomeScreen.css';

interface HomeProps {
    onStart: () => void;
}

const Home = ({ onStart }: HomeProps) => {
    return (
        <div className="home-container">
            <button onClick={onStart} className="btn-start">
                To Lobby
            </button>
        </div>
    );
};

export default Home;