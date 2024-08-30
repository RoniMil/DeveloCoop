import React from 'react';
import '../styles.css'

const LobbyInterface = ({ lobbyId,
    playerId,
    playerCount,
    isReady,
    toggleReady,
    readyMessages,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage }) => {
    return (
        <div className="lobby-container">
            <div className="lobby-header">
                <p className="lobby-info">Lobby ID: {lobbyId}</p>
                {playerId && <p className="player-info">You are Player {playerId}</p>}
                <p className="player-count">{playerCount}/2 players</p>
                <button
                    className={`button ready-button ${isReady ? 'not-ready' : ''}`}
                    onClick={toggleReady}
                >
                    {isReady ? 'Not Ready' : 'Ready'}
                </button>
            </div>
            <div className="chat-container">
                {readyMessages.map((msg, index) => (
                    <p key={`ready-${index}`} className="ready-message"><strong>{msg}</strong></p>
                ))}
                {chatMessages.map((msg, index) => (
                    <p key={`chat-${index}`}>{msg}</p>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type your message..."
                />
                <button className="button" onClick={sendChatMessage}>Send</button>
            </div>
        </div>
    );
};

export default LobbyInterface;