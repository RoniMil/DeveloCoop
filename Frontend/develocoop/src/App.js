import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import './styles.css';
import { python } from "@codemirror/lang-python";
import { autocompletion } from '@codemirror/autocomplete';
import frogImage from './images/develocoop_logo.png';
import CooperativeEditor from './CooperativeEditor';

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
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isSubmitReady, setIsSubmitReady] = useState(false);
  const [isNextQuestionReady, setIsNextQuestionReady] = useState(false);
  const [lobbyId, setLobbyId] = useState('');
  const [showLobbyOptions, setShowLobbyOptions] = useState(false);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [playerCount, setPlayerCount] = useState(1);
  const [readyPlayers, setReadyPlayers] = useState(new Set());
  const [submitReadyPlayers, setSubmitReadyPlayers] = useState(new Set());
  const [nextQuestionReadyPlayers, setNextQuestionReadyPlayers] = useState(new Set());
  const [readyMessages, setReadyMessages] = useState([]);
  const [submitReadyMessages, setSubmitReadyMessages] = useState([]);
  const [nextQuestionReadyMessages, setNextQuestionReadyMessages] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [editorContent, setEditorContent] = useState('');
  const [passedAllTests, setPassedAllTests] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const isInitialMount = useRef(true);
  const websocketRef = useRef(null);

  const handleEditorChange = useCallback((content) => {
    setEditorContent(content);
    setUserAnswer(content);
  }, []);

  const handleSubmit = async (questionID, submissionContent, lobbyID) => {
    setLoading(true);
    try {
      const data = {
        question_id: questionID,
        user_answer: submissionContent,
        lobby_id: lobbyID
      };

      console.log('Submitting data:', data);

      const response = await fetch(`${API_URL}/questions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.output.includes("Passed all")) {
        setSubmissionResult(`${result.output}\nMemory used: ${result.memory}\nCPU time used: ${result.cpuTime}`);
        // set new state that allows presenting the next question button and thus allows moving to the next question
        setPassedAllTests(true);
      } else {
        setSubmissionResult(result.output);
      }


    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionResult(`There's been an error processing your submission: [${error.message}].\nPlease check your input and try again.\nHint: you may want to check for infinite loops.`)
    } finally {
      setLoading(false);
      setIsSubmitReady(false)
    }
  };

  const startGame = async (mode) => {
    if (mode === 'two-players') {
      setShowLobbyOptions(true);
    } else {
      setGameMode(mode);
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
    }
  };

  const handleSessionEnd = () => {
    setShowGameOver(true);

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'reset_lobby' }));
    }

    setTimeout(() => {
      setShowGameOver(false);
    }, 5000); // Show "Game Over" screen for 5 seconds

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
    setChatMessages([]);
    setReadyMessages([]);
    setSubmitReadyMessages([]);
    setNextQuestionReadyMessages([]);
    setChatInput('');
    setIsReady(false);
    setIsSubmitReady(false);
    setIsNextQuestionReady(false);
    setLobbyId('');
    setShowLobbyOptions(false);
    setJoinLobbyId('');
    setPlayerCount(1);
    setReadyPlayers(new Set());
    setSubmitReadyPlayers(new Set());
    setNextQuestionReadyPlayers(new Set());
    setPassedAllTests(false);
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  const createLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/create_lobby`, { method: 'POST' });
      const data = await response.json();
      setLobbyId(data.lobby_id);
      setInLobby(true);
      setShowLobbyOptions(false);
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
        setShowLobbyOptions(false);
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
        setShowLobbyOptions(false);
      } else {
        alert('No available lobbies found. Try creating a new one.');
      }
    } catch (error) {
      console.error('Error finding lobby:', error);
      alert('Failed to find an available lobby. Please try again or create a new one.');
    }
  };

  const connectToLobby = useCallback((lobbyId) => {
    console.log(`Connecting to lobby: ${lobbyId}`);
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already open, skipping connection');
      return;
    }

    websocketRef.current = new WebSocket(`ws://localhost:8000/ws/${lobbyId}`);

    websocketRef.current.onopen = () => {
      console.log(`Connected to lobby: ${lobbyId}`);
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);

        switch (data.type) {
          case 'player_id':
            setPlayerId(data.id);
            break;
          case 'message':
            console.log(data.content);
            setChatMessages(prev => [...prev, data.content]);
            console.log(data.content);
            break;
          case 'player_count':
            setPlayerCount(data.count);
            break;
          case 'lobby_reset':
            setQuestionDeclaration('');
            setQuestionDescription('');
            setQuestionName('');
            setUserAnswer('');
            setQuestionId(null);
            setSubmissionResult('');
            setLoading(false);
            setReadyMessages([]);
            setSubmitReadyMessages([]);
            setNextQuestionReadyMessages([]);
            setIsReady(false);
            setIsSubmitReady(false);
            setIsNextQuestionReady(false);
            setReadyPlayers(new Set());
            setSubmitReadyPlayers(new Set());
            setNextQuestionReadyPlayers(new Set());
            setPassedAllTests(false);
            setInLobby(true);
            break;
          case 'game_start':
            console.log('Game starting, updating state...');
            setInLobby(false);
            setGameMode('two-players');
            setQuestionDeclaration(data.question["Question Declaration"]);
            setQuestionDescription(data.question["Question Description"]);
            setQuestionName(data.question["Question Name"]);
            setQuestionId(data.question["_id"]);
            setUserAnswer(data.question["Question Declaration"]);
            break;
          case 'player_ready':
            if (data.ready) {
              setReadyPlayers(prev => new Set(prev).add(data.player_id));
              setReadyMessages(prev => [...prev, `Player ${data.player_id} is ready`]);
            } else {
              setReadyPlayers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.player_id);
                return newSet;
              });
              setReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready`));
            }
            break;
          case 'player_submit_ready':
            if (data.submit_ready) {
              setSubmitReadyPlayers(prev => new Set(prev).add(data.player_id));
              setSubmitReadyMessages(prev => [...prev, `Player ${data.player_id} is ready to submit`]);
            } else {
              setSubmitReadyPlayers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.player_id);
                return newSet;
              });
              setSubmitReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready to submit`));
            }
            break;
          case 'player_next_question_ready':
            if (data.next_question_ready) {
              setNextQuestionReadyPlayers(prev => new Set(prev).add(data.player_id));
              setNextQuestionReadyMessages(prev => [...prev, `Player ${data.player_id} is ready for the next question`]);
            } else {
              setNextQuestionReadyPlayers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.player_id);
                return newSet;
              });
              setNextQuestionReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready for the next question`));
            }
            break;
          case 'submit_code':
            handleSubmit(data.question_id, data.editor_content, data.lobby_id);
            break;
          case 'reset_submit_ready':
            setIsSubmitReady(false);
            setSubmitReadyPlayers(new Set());
            setSubmitReadyMessages([]);
            break;
          case 'move_to_next_question':
            console.log(`next question ready players before reset: ${nextQuestionReadyPlayers.size}`);
            setQuestionDeclaration(data.question["Question Declaration"]);
            setQuestionDescription(data.question["Question Description"]);
            setQuestionName(data.question["Question Name"]);
            setQuestionId(data.question["_id"]);
            setUserAnswer(data.question["Question Declaration"]);
            setEditorContent(data.question["Question Declaration"]);
            setSubmissionResult('');
            setSubmitReadyMessages([]);
            setNextQuestionReadyMessages([]);
            setIsSubmitReady(false);
            setIsNextQuestionReady(false);
            setSubmitReadyPlayers(new Set());
            setNextQuestionReadyPlayers(new Set());
            setPassedAllTests(false);
            console.log(`next question ready players after reset: ${nextQuestionReadyPlayers.size}`);
            break;
          case 'player_left':
            setReadyPlayers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.player_id);
              return newSet;
            });
            setReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready`));
            setChatMessages(prev => [...prev, `Player ${data.player_id} left the lobby`]);
            break;
          case 'session_end':
            // session end function (state handling etc)
            handleSessionEnd()
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocketRef.current.onclose = (event) => {
      if (!event.wasClean) {
        setTimeout(() => connectToLobby(lobbyId), 1000);
      }
      console.log(`Disconnected from lobby: ${lobbyId}`, event);
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);

  const sendChatMessage = useCallback(() => {
    if (chatInput.trim() && websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log(`Sending chat message: ${chatInput}`);
      websocketRef.current.send(JSON.stringify({ type: 'chat', content: chatInput }));
      setChatInput('');
    } else {
      console.error('WebSocket is not open or chat input is empty');
      console.log('WebSocket readyState:', websocketRef.current ? websocketRef.current.readyState : 'WebSocket not initialized');
    }
  }, [chatInput]);

  const toggleReady = useCallback(() => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'ready', ready: !isReady }));
      setIsReady(!isReady);
    } else {
      console.error('WebSocket is not open, cannot send ready state');
    }
  }, [isReady]);

  const toggleSubmitReady = useCallback(() => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'submit_ready',
        submit_ready: !isSubmitReady,
        editor_content: editorContent
      }));
      setIsSubmitReady(!isSubmitReady);
    } else {
      console.error('WebSocket is not open, cannot send submit ready state');
    }
  }, [isSubmitReady, editorContent]);

  const toggleNextQuestionReady = useCallback(() => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'next_question_ready', next_question_ready: !isNextQuestionReady }));
      setIsNextQuestionReady(!isNextQuestionReady);
    } else {
      console.error('WebSocket is not open, cannot send next question ready state');
    }
  }, [isNextQuestionReady]);

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (lobbyId) {
      connectToLobby(lobbyId);
    }
  }, [lobbyId, connectToLobby]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (questionDeclaration) {
        setEditorContent(questionDeclaration);
        setUserAnswer(questionDeclaration);
      }
    }
  }, [questionDeclaration]);

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


  return (
    <div style={{ padding: '20px' }}>
      <img src={frogImage} alt="Frog Coding" className="header-image" />
      <h1>DeveloCoop</h1>
      {showGameOver ? (
        <div className="game-over-screen">
          <h2>Game Over</h2>
          <p>Returning to lobby...</p>
        </div>
      ) : !gameMode && !inLobby ? (
        <div className="main-menu">
          <button onClick={() => startGame('one-player')}>One Player</button>
          <button onClick={() => startGame('two-players')}>Two Players</button>
        </div>
      ) : (
        <>
          <button onClick={backToMainMenu} className="button back-button">Back to Main Menu</button>
          {inLobby ? (
            <div className="lobby-container">
              <div className="lobby-header">
                <p className="lobby-info">Lobby ID: {lobbyId}</p>
                {playerId && <p className="player-info">You are Player {playerId}</p>}
                <p className="player-count">{playerCount}/2 players</p>
                <button onClick={toggleReady} className={`ready-button ${isReady ? 'not-ready' : ''}`}>
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
                <button onClick={sendChatMessage}>Send</button>
              </div>
            </div>
          ) : (
            questionName && (
              <div className="main-container">
                <h3>{questionName}</h3>
                <div className="content-container">
                  {gameMode === 'two-players' ? (
                    <CooperativeEditor
                      questionDeclaration={questionDeclaration}
                      onChange={handleEditorChange}
                      roomName={lobbyId}
                      isPlayer1={playerId === '1'}
                      userId={`Player ${playerId}`}
                      questionId={questionId}
                    />
                  ) : (
                    <CodeMirror
                      value={userAnswer}
                      extensions={[python(), autocompletion()]}
                      onChange={(value) => {
                        setUserAnswer(value);
                        setEditorContent(value);
                      }}
                      basicSetup={{
                        tabSize: 2
                      }}
                    />
                  )}
                  <div id="problem">
                    {questionDescription}
                  </div>
                </div>
                <div className="chat-container">
                  {submitReadyMessages.map((msg, index) => (
                    <p key={`ready-to-submit${index}`} className="ready-message"><strong>{msg}</strong></p>
                  ))}
                  {nextQuestionReadyMessages.map((msg, index) => (
                    <p key={`ready-to-move-to-next-question${index}`} className="ready-message"><strong>{msg}</strong></p>
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
                  <button onClick={sendChatMessage}>Send</button>
                </div>
                {submissionResult && (
                  <div className="result-container">
                    <h3>Results:</h3>
                    <pre>{submissionResult}</pre>
                  </div>
                )}
                <button onClick={toggleSubmitReady} disabled={loading} className="button">
                  {isSubmitReady ? 'Waiting...' : 'Submit'}
                </button>
                {loading && <div className="loading-spinner"></div>}
                {passedAllTests && (
                  <button onClick={toggleNextQuestionReady} className="button">
                    {isNextQuestionReady ? 'Waiting...' : 'Next Question'}
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

export default App;