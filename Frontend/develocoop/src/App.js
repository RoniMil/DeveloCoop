import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import './styles.css';
import { python } from "@codemirror/lang-python";
import { autocompletion } from '@codemirror/autocomplete';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';



function App() {
  const [questionDeclaration, setQuestionDeclaration] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [questionName, setQuestionName] = useState('');
  // const [questionSolution, setQuestionSolution] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [questionId, setQuestionId] = useState(null);
  const [submissionResult, setSubmissionResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState(null);


  const fetchQuestion = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/questions');
      const data = await response.json();
      setQuestionDeclaration(data["Question Declaration"]);
      setQuestionDescription(data["Question Description"]);
      setQuestionName(data["Question Name"]);
      // setQuestionSolution(data["Question Solution"]);
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
      const response = await fetch('http://127.0.0.1:8000/questions/submit', {
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
      setLoading(false); // Stop loading
    }
  };

  const startGame = (mode) => {
    setGameMode(mode);
    fetchQuestion();
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
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>DeveloCoop</h1>
      {!gameMode ? (
        <div className="main-menu">
          <button onClick={() => startGame('one-player')}>One Player</button>
          <button onClick={() => startGame('two-players')}>Two Players</button>
        </div>
      ) : (
        questionName && (
          <div className="main-container">
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
            <button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Answer'}
            </button>
            {loading && <div className="loading-spinner"></div>}
            <button onClick={backToMainMenu} className="back-button">Back to Main Menu</button>
          </div>
        )
      )}
    </div>
  );
}

export default App;
