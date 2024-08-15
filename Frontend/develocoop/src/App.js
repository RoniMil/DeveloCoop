import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import './styles.css';
import { python } from "@codemirror/lang-python";
import { autocompletion } from '@codemirror/autocomplete';
import frogImage from './images/develocoop_logo.png';

const API_URL = 'http://localhost:8000';

function App() {
  const [questionDeclaration, setQuestionDeclaration] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [questionName, setQuestionName] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [questionId, setQuestionId] = useState(null);
  const [submissionResult, setSubmissionResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState(null);
  const [inLobby, setInLobby] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [lobbyMessages, setLobbyMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [lobbyId, setLobbyId] = useState('');
  const [showLobbyOptions, setShowLobbyOptions] = useState(false);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const websocket = useRef(null);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`${API_URL}/questions`);
      const data = await response.json();
      setQuestionDeclaration(data["Question Declaration"]);
      setQuestionDescription(data["Question Description"]);
      setQuestionName(data["Question Name"]);
      setQuestionId(data["_id"]);
      setUserAnswer(data["Question Declaration"]);
    } catch (error) {
      console.error('Error fetching the question:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = {
        question_id: questionId,
        user_answer: userAnswer
      }
      const response = await fetch(`${API_URL}/questions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      setSubmissionResult(result.output);
    } catch (error) {
      setSubmissionResult(`There's been an error processing your submission: [${error.message}].\nYou may want to check for infinite loops.`)
    } finally {
      setLoading(false);
    }
  };

  const startGame = (mode) => {
    if (mode === 'two-players') {
      setShowLobbyOptions(true);
    } else {
      setGameMode(mode);
      fetchQuestion();
    }
  };

  const backToMainMenu = () => {
    setGameMode(null);
    setQuestionDeclaration('');
    setQuestionDescription('');
    setQuestionName('');
    setUserAnswer('');
    setQuestionId(null);
    setSubmissionResult('');
    setLoading(false);
    setInLobby(false);
    setPlayerId(null);
    setLobbyMessages([]);
    setChatInput('');
    setIsReady(false);
    setLobbyId('');
    setShowLobbyOptions(false);
    setJoinLobbyId('');
    if (websocket.current) {
      websocket.current.close();
    }
  };

  const createLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/create_lobby`, { method: 'POST' });
      const data = await response.json();
      setLobbyId(data.lobby_id);
      setInLobby(true);
      setShowLobbyOptions(false);  // Hide lobby options
      connectToLobby(data.lobby_id);
    } catch (error) {
      console.error('Error creating lobby:', error);
      alert('Failed to create lobby. Please try again.');
    }
  };
  
  const joinLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/join_lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: joinLobbyId }),
      });
      if (response.ok) {
        setLobbyId(joinLobbyId);
        setInLobby(true);
        setShowLobbyOptions(false);  // Hide lobby options
        connectToLobby(joinLobbyId);
      } else {
        const errorData = await response.json();
        alert(errorData.detail);
      }
    } catch (error) {
      console.error('Error joining lobby:', error);
      alert('Failed to join lobby. Please check the ID and try again.');
    }
  };
  
  const findLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/find_lobby`);
      if (response.ok) {
        const data = await response.json();
        setLobbyId(data.lobby_id);
        setInLobby(true);
        setShowLobbyOptions(false);  // Hide lobby options
        connectToLobby(data.lobby_id);
      } else {
        alert('No available lobbies found. Try creating a new one.');
      }
    } catch (error) {
      console.error('Error finding lobby:', error);
      alert('Failed to find an available lobby. Please try again or create a new one.');
    }
  };

  const connectToLobby = (lobbyId) => {
    websocket.current = new WebSocket(`ws://localhost:8000/ws/${lobbyId}`);
    websocket.current.onopen = () => {
      console.log('Connected to lobby');
    };

    websocket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'player_id') {
          setPlayerId(data.id);
        } else if (data.type === 'message') {
          setLobbyMessages(prev => [...prev, data.content]);
        } else if (data.type === 'game_start') {
          setInLobby(false);
          setGameMode('two-players');
          fetchQuestion();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.current.onclose = () => {
      console.log('Disconnected from lobby');
    };
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && websocket.current) {
      websocket.current.send(JSON.stringify({ type: 'chat', content: chatInput }));
      setChatInput('');
    }
  };

  const toggleReady = () => {
    if (websocket.current) {
      websocket.current.send(JSON.stringify({ type: 'ready' }));
      setIsReady(!isReady);
    }
  };

  useEffect(() => {
    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
    };
  }, []);

  if (showLobbyOptions) {
    return (
      <div style={{ padding: '20px' }}>
        <img src={frogImage} alt="Frog Coding" className="header-image" />
        <h1>DeveloCoop - Two Players Mode</h1>
        <button onClick={() => setShowLobbyOptions(false)} className="back-button">Back to Main Menu</button>
        <div className="lobby-options">
          <button onClick={createLobby}>Create a new lobby</button>
          <div>
            <input
              type="text"
              value={joinLobbyId}
              onChange={(e) => setJoinLobbyId(e.target.value)}
              placeholder="Enter lobby ID"
            />
            <button onClick={joinLobby}>Join lobby</button>
          </div>
          <button onClick={findLobby}>Find a random lobby</button>
        </div>
      </div>
    );
  }

  if (inLobby) {
    return (
      <div style={{ padding: '20px' }}>
        <img src={frogImage} alt="Frog Coding" className="header-image" />
        <h1>DeveloCoop - Lobby</h1>
        <button onClick={backToMainMenu} className="back-button">Back to Main Menu</button>
        <div className="lobby-container">
          <div className="lobby-header">
            <p className="lobby-info">Lobby ID: {lobbyId}</p>
            {playerId && <p className="player-info">You are Player {playerId}</p>}
            <button onClick={toggleReady} className={`ready-button ${isReady ? 'not-ready' : ''}`}>
              {isReady ? 'Not Ready' : 'Ready'}
            </button>
          </div>
          <div className="chat-container">
            {lobbyMessages.map((msg, index) => (
              <p key={index}>{msg}</p>
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
            <button onClick={sendChatMessage}>Send</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <img src={frogImage} alt="Frog Coding" className="header-image" />
      <h1>DeveloCoop</h1>
      {!gameMode ? (
        <div className="main-menu">
          <button onClick={() => startGame('one-player')}>One Player</button>
          <button onClick={() => startGame('two-players')}>Two Players</button>
        </div>
      ) : (
        questionName && (
          <div className="main-container">
            <button onClick={backToMainMenu} className="button back-button">Back to Main Menu</button>
            <h3>{questionName}</h3>
            <div className="content-container">
              <div className="CodeMirror">
                <CodeMirror
                  value={questionDeclaration}
                  extensions={[python(), autocompletion()]}
                  onChange={(value) => {
                    setUserAnswer(value);
                  }}
                  basicSetup={{
                    tabSize: 4
                  }}
                />
              </div>
              <div id="problem">
                {questionDescription}
              </div>
            </div>
            {submissionResult && (
              <div className="result-container">
                <h3>Results:</h3>
                <pre>{submissionResult}</pre>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} className="button">
              {loading ? 'Submitting...' : 'Submit Answer'}
            </button>
            {loading && <div className="loading-spinner"></div>}
          </div>
        )
      )}
    </div>
  );
}

export default App;