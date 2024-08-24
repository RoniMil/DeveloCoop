import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import LobbyInterface from './components/LobbyInterface';
import GameInterface from './components/GameInterface';
import frogImage from './images/develocoop_logo.png';
import { GAME_MODES } from './gameConfig';
import { fetchQuestion, fetchFollowUpQuestions, submitAnswer, createLobby, joinLobby, findLobby } from './apiService';
import useWebSocket from './hooks/useWebSocket';

function App() {
  // Game state
  const [gameMode, setGameMode] = useState(null);
  const [inLobby, setInLobby] = useState(false);
  const [showLobbyOptions, setShowLobbyOptions] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverOptions, setGameOverOptions] = useState({
    playAgain: () => {},
    backToMainMenu: () => {}
  });

  // Player state
  const [playerId, setPlayerId] = useState(null);
  const [playerCount, setPlayerCount] = useState(1);

  // Question state
  const [questionData, setQuestionData] = useState({
    declaration: '',
    description: '',
    name: '',
    id: null
  });
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [seenQuestions, setSeenQuestions] = useState(new Set());
  const [editorContent, setEditorContent] = useState('');

  // Lobby state
  const [lobbyId, setLobbyId] = useState('');
  const [joinLobbyId, setJoinLobbyId] = useState('');

  // Game progress state
  const [isReady, setIsReady] = useState(false);
  const [isSubmitReady, setIsSubmitReady] = useState(false);
  const [isNextQuestionReady, setIsNextQuestionReady] = useState(false);
  const [passedAllTests, setPassedAllTests] = useState(false);

  // UI state
  const [submissionResult, setSubmissionResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [readyMessages, setReadyMessages] = useState([]);
  const [submitReadyMessages, setSubmitReadyMessages] = useState([]);
  const [nextQuestionReadyMessages, setNextQuestionReadyMessages] = useState([]);


  const isInitialMount = useRef(true);

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'player_id':
        setPlayerId(data.id);
        break;
      case 'message':
        setChatMessages(prev => [...prev, data.content]);
        break;
      case 'player_count':
        setPlayerCount(data.count);
        break;
      case 'lobby_reset':
        setQuestionData({ declaration: '', description: '', name: '', id: null });
        setEditorContent('');
        setSubmissionResult('');
        setLoading(false);
        setReadyMessages([]);
        setSubmitReadyMessages([]);
        setNextQuestionReadyMessages([]);
        setIsReady(false);
        setIsSubmitReady(false);
        setIsNextQuestionReady(false);
        setPassedAllTests(false);
        setInLobby(true);
        break;
      case 'game_start':
        setInLobby(false);
        setGameMode('two-players');
        setQuestionData({
          declaration: data.question["Question Declaration"],
          description: data.question["Question Description"],
          name: data.question["Question Name"],
          id: data.question["_id"]
        });
        setEditorContent(data.question["Question Declaration"]);
        break;
      case 'player_ready':
        if (data.ready) {
          setReadyMessages(prev => [...prev, `Player ${data.player_id} is ready`]);
        } else {
          setReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready`));
        }
        break;
      case 'player_submit_ready':
        if (data.submit_ready) {
          setSubmitReadyMessages(prev => [...prev, `Player ${data.player_id} is ready to submit`]);
        } else {
          setSubmitReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready to submit`));
        }
        break;
      case 'player_next_question_ready':
        if (data.next_question_ready) {
          setNextQuestionReadyMessages(prev => [...prev, `Player ${data.player_id} is ready for the next question`]);
        } else {
          setNextQuestionReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready for the next question`));
        }
        break;
      case 'submit_code':
        handleSubmit(data.question_id, data.editor_content, data.lobby_id);
        break;
      case 'reset_submit_ready':
        setIsSubmitReady(false);
        setSubmitReadyMessages([]);
        break;
      case 'move_to_next_question':
        setQuestionData({
          declaration: data.question["Question Declaration"],
          description: data.question["Question Description"],
          name: data.question["Question Name"],
          id: data.question["_id"]
        });
        setEditorContent(data.question["Question Declaration"]);
        setSubmissionResult('');
        setSubmitReadyMessages([]);
        setNextQuestionReadyMessages([]);
        setIsSubmitReady(false);
        setIsNextQuestionReady(false);
        setPassedAllTests(false);
        break;
      case 'player_left':
        setReadyMessages(prev => prev.filter(msg => msg !== `Player ${data.player_id} is ready`));
        setChatMessages(prev => [...prev, `Player ${data.player_id} left the lobby`]);
        break;
      case 'session_end':
        handleSessionEnd();
        break;
    }
  }, []);

  const sendWebSocketMessage = useWebSocket(lobbyId, handleWebSocketMessage);

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
        const data = await fetchQuestion();
        setQuestionData({
          declaration: data["Question Declaration"],
          description: data["Question Description"],
          name: data["Question Name"],
          id: data["_id"]
        });
        setEditorContent(data["Question Declaration"]);

        // Fetch follow-up questions for the initial question
        const followUps = await fetchFollowUpQuestions(data["Question Name"]);
        setFollowUpQuestions(followUps);
        setSeenQuestions(new Set());
      } catch (error) {
        console.error('Error fetching the question:', error);
      }
    }
  };

  const handleSubmitReady = useCallback(async () => {
    if (gameMode === GAME_MODES.ONE_PLAYER) {
      handleSubmit(questionData.id, editorContent, null);
    } else {
      sendWebSocketMessage({
        type: 'submit_ready',
        submit_ready: !isSubmitReady,
        editor_content: editorContent
      });
    }
    setIsSubmitReady(!isSubmitReady)
  }, [gameMode, isSubmitReady, editorContent, sendWebSocketMessage, questionData.id]);

  const handleSessionEnd = () => {
    setShowGameOver(true);
    if (gameMode === GAME_MODES.ONE_PLAYER) {
      setGameOverOptions({
        playAgain: async () => {
          setShowGameOver(false);
          setLoading(true);
          try {
            const data = await fetchQuestion();
            setQuestionData({
              declaration: data["Question Declaration"],
              description: data["Question Description"],
              name: data["Question Name"],
              id: data["_id"]
            });
            setEditorContent(data["Question Declaration"]);

            // Fetch follow-up questions for the new initial question
            const followUps = await fetchFollowUpQuestions(data["Question Name"]);
            setFollowUpQuestions(followUps);
            setSeenQuestions(new Set());
            setSubmissionResult('');
            setPassedAllTests(false);
            setIsSubmitReady(false);
            setIsNextQuestionReady(false);
          } catch (error) {
            console.error('Error fetching the question:', error);
          } finally {
            setLoading(false);
          }
        },
        backToMainMenu: () => {
          backToMainMenu();
          setShowGameOver(false);
        }
      });
    } else {
      sendWebSocketMessage({ type: 'reset_lobby' });
      setTimeout(() => {
        setShowGameOver(false);
      }, 5000);
    }
  };


  const handleNextQuestionReady = useCallback(async () => {
    if (gameMode === GAME_MODES.ONE_PLAYER) {
      // Check if there are any unseen follow-up questions
      const unseenQuestions = followUpQuestions.filter(q => !seenQuestions.has(q._id));

      if (unseenQuestions.length === 0) {
        // No more unseen questions, end the game
        handleSessionEnd();
        return;
      }

      // Select a random unseen question
      const randomIndex = Math.floor(Math.random() * unseenQuestions.length);
      const nextQuestion = unseenQuestions[randomIndex];

      // Update the question data
      setQuestionData({
        declaration: nextQuestion["Question Declaration"],
        description: nextQuestion["Question Description"],
        name: nextQuestion["Question Name"],
        id: nextQuestion["_id"]
      });

      // Update other states
      setEditorContent(nextQuestion["Question Declaration"]);
      setSubmissionResult('');
      setIsSubmitReady(false);
      setPassedAllTests(false);

      // Mark this question as seen
      setSeenQuestions(prev => new Set(prev).add(nextQuestion._id));

    } else {
      sendWebSocketMessage({ type: 'next_question_ready', next_question_ready: !isNextQuestionReady });
      setIsNextQuestionReady(!isNextQuestionReady);
    }
  }, [gameMode, followUpQuestions, seenQuestions, handleSessionEnd, sendWebSocketMessage, isNextQuestionReady]);

  const backToMainMenu = () => {
    setGameMode(null);
    setQuestionData({ declaration: '', description: '', name: '', id: null });
    setEditorContent('');
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
    setPassedAllTests(false);
    setFollowUpQuestions([]);
    setSeenQuestions(new Set());
  };

  const sendChatMessage = useCallback(() => {
    if (chatInput.trim()) {
      sendWebSocketMessage({ type: 'chat', content: chatInput });
      setChatInput('');
    }
  }, [chatInput, sendWebSocketMessage]);

  const toggleReady = useCallback(() => {
    sendWebSocketMessage({ type: 'ready', ready: !isReady });
    setIsReady(!isReady);
  }, [isReady, sendWebSocketMessage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (questionData.declaration) {
        setEditorContent(questionData.declaration);
      }
    }

  }, [questionData.declaration]);

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
          {gameMode === GAME_MODES.TWO_PLAYERS ? (
            <p>Returning to lobby...</p>
          ) : (
            <>
            <button onClick={gameOverOptions.playAgain}>Play again</button>
            <button onClick={gameOverOptions.backToMainMenu}>Back to main menu</button> 
            </>
          )}
        </div>
      ) : !gameMode && !inLobby ? (
        <div className="main-menu">
          <button onClick={() => startGame(GAME_MODES.ONE_PLAYER)}>One Player</button>
          <button onClick={() => startGame(GAME_MODES.TWO_PLAYERS)}>Two Players</button>
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
            questionData.name && (
              <GameInterface
                questionName={questionData.name}
                questionDescription={questionData.description}
                gameMode={gameMode}
                questionDeclaration={questionData.declaration}
                handleEditorChange={handleEditorChange}
                editorContent={editorContent}
                setEditorContent={setEditorContent}
                lobbyId={lobbyId}
                playerId={playerId}
                questionId={questionData.id}
                submissionResult={submissionResult}
                loading={loading}
                isSubmitReady={isSubmitReady}
                toggleSubmitReady={handleSubmitReady}
                passedAllTests={passedAllTests}
                isNextQuestionReady={isNextQuestionReady}
                toggleNextQuestionReady={handleNextQuestionReady}
                {...(gameMode === GAME_MODES.TWO_PLAYERS && {
                  submitReadyMessages,
                  nextQuestionReadyMessages,
                  chatMessages,
                  chatInput,
                  setChatInput,
                  sendChatMessage
                })}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

export default App;