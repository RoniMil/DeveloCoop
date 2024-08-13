import React, { useState } from 'react';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import './styles.css';
import { python } from "@codemirror/lang-python"
import { oneDark } from '@codemirror/theme-one-dark'; // Import a valid theme

function App() {
  const [questionDeclaration, setQuestionDeclaration] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [questionName, setQuestionName] = useState('');
  const [questionSolution, setQuestionSolution] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [questionId, setQuestionId] = useState(null);

  const fetchQuestion = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/questions');
      const data = await response.json();
      setQuestionDeclaration(data["Question Declaration"]);
      setQuestionDescription(data["Question Description"]);
      setQuestionName(data["Question Name"]);
      setQuestionSolution(data["Question Solution"]);
      setQuestionId(data["_id"]);
      setUserAnswer('');
    } catch (error) {
      console.error('Error fetching the question:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/question/submit', {
        question_id: questionId,
        user_answer: userAnswer,
      });
      alert('Answer submitted!');
    } catch (error) {
      console.error('Error submitting the answer:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>DeveloCoop</h1>
      <button onClick={fetchQuestion}>Start Session</button>
      {(
        <>
          <h3>Question:</h3>
          <p>{questionName}</p>
          <div style={{ display: 'flex' }}>
            <CodeMirror
              value={questionDeclaration}
              options={{
                lineNumbers: true,
                mode: 'python'
              }}
              theme={oneDark}
              onChange={(value) => {
                setUserAnswer(value);
              }}
            />
            <div style={{ marginLeft: '20px' }}>
              <p>{questionDescription}</p>
            </div>
          </div>
          <button onClick={handleSubmit}>Submit Answer</button>
        </>
      )}
    </div>
  );
}

export default App;
