import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import LobbyInterface from './components/LobbyInterface';
import GameInterface from './components/GameInterface';
import frogImage from './images/develocoop_logo.png';
import { GAME_MODES } from './gameConfig';
import { fetchQuestion, submitAnswer, createLobby, joinLobby, findLobby } from './apiService';

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

  const handleCreateLobby = async () => {
    try {
      const data = await createLobby();
      setLobbyId(data.lobby_id);
      setInLobby(true);
      setShowLobbyOptions(false);
    } catch (error) {
      console.error('Error creating lobby:', error);
      alert('Failed to create lobby. Please try again.');
    }
  };

  const handleJoinLobby = async () => {
    try {
      await joinLobby(joinLobbyId);
      setLobbyId(joinLobbyId);
      setInLobby(true);
      setShowLobbyOptions(false);
    } catch (error) {
      console.error('Error joining lobby:', error);
      alert('Failed to join lobby. Please check the ID and try again.');
    }
  };

  const handleFindLobby = async () => {
    try {
      const data = await findLobby();
      setLobbyId(data.lobby_id);
      setInLobby(true);
      setShowLobbyOptions(false);
    } catch (error) {
      console.error('Error finding lobby:', error);
      alert('Failed to find an available lobby. Please try again or create a new one.');
    }
  };

  const handleEditorChange = useCallback((content) => {
    setEditorContent(content);
    setUserAnswer(content);
  }, []);

  const handleSubmit = async (questionID, submissionContent, lobbyID) => {
    setLoading(true);
    try {
      const result = await submitAnswer(questionID, submissionContent, lobbyID);
      if (result.output.includes("Passed all")) {
        setSubmissionResult(`${result.output}\nMemory used: ${result.memory}\nCPU time used: ${result.cpuTime}`);
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
    if (mode === GAME_MODES.TWO_PLAYERS) {
      setShowLobbyOptions(true);
    } else {
      setGameMode(mode);
      try {
        const data = await fetchQuestion()
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
          <button onClick={handleCreateLobby}>Create a new lobby</button>
          <div>
            <input
              type="text"
              value={joinLobbyId}
              onChange={(e) => setJoinLobbyId(e.target.value)}
              placeholder="Enter lobby ID"
            />
            <button onClick={handleJoinLobby}>Join lobby</button>
          </div>
          <button onClick={handleFindLobby}>Find a random lobby</button>
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
            <LobbyInterface
              lobbyId={lobbyId}
              playerId={playerId}
              playerCount={playerCount}
              isReady={isReady}
              toggleReady={toggleReady}
              readyMessages={readyMessages}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
            />
          ) : (
            questionName && (
              <GameInterface
                questionName={questionName}
                questionDescription={questionDescription}
                gameMode={gameMode}
                questionDeclaration={questionDeclaration}
                handleEditorChange={handleEditorChange}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                setEditorContent={setEditorContent}
                lobbyId={lobbyId}
                playerId={playerId}
                questionId={questionId}
                submissionResult={submissionResult}
                loading={loading}
                isSubmitReady={isSubmitReady}
                toggleSubmitReady={toggleSubmitReady}
                passedAllTests={passedAllTests}
                isNextQuestionReady={isNextQuestionReady}
                toggleNextQuestionReady={toggleNextQuestionReady}
                submitReadyMessages={submitReadyMessages}
                nextQuestionReadyMessages={nextQuestionReadyMessages}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

export default App;