import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from "@codemirror/lang-python";
import { autocompletion } from '@codemirror/autocomplete';
import CooperativeEditor from './CooperativeEditor';
import '../styles.css';
import './editor.css'

const GameInterface = ({
    questionName,
    questionDescription,
    gameMode,
    questionDeclaration,
    handleEditorChange,
    editorContent,
    setEditorContent,
    lobbyId,
    playerId,
    questionId,
    submissionResult,
    loading,
    isSubmitReady,
    toggleSubmitReady: handleSubmitReady,
    passedAllTests,
    isNextQuestionReady,
    toggleNextQuestionReady: handleNextQuestionReady,
    submitReadyMessages,
    nextQuestionReadyMessages,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    questionSolution,
    isShowSolutionReady,
    toggleShowSolutionReady: handleShowSolutionReady,
    wasSolutionRevealed,
    showConfirmDialog,
    setShowConfirmDialog,
    showSolution,
    setShowSolution,
    handleConfirmShowSolution,
    showSolutionCount
}) => {

    useEffect(() => {
        console.log("GameInterface props updated:", {
            isShowSolutionReady,
            wasSolutionRevealed,
            showSolution,
            gameMode,
            playerId
        });
    }, [isShowSolutionReady, wasSolutionRevealed, showSolution, gameMode, playerId]);

    const getSolutionButtonText = () => {
        if (gameMode === 'two-players') {
            return `Show Solution ${showSolutionCount}/2`;
        }
        return 'Show Solution';
    };

    return (
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
                    <div className="editor-container">
                        <CodeMirror
                            value={editorContent}
                            extensions={[python(), autocompletion()]}
                            onChange={(value) => {
                                setEditorContent(value);
                                handleEditorChange(value);
                            }}
                            basicSetup={{
                                tabSize: 2,
                                lineNumbers: true,
                                highlightActiveLineGutter: false,
                                foldGutter: false,
                                dropCursor: false,
                                allowMultipleSelections: false,
                                indentOnInput: false,
                                bracketMatching: false,
                                closeBrackets: false,
                                autocompletion: false,
                                rectangularSelection: false,
                                crosshairCursor: false,
                                highlightActiveLine: false,
                                highlightSelectionMatches: false,
                                closeBracketsKeymap: false,
                                searchKeymap: false,
                                foldKeymap: false,
                                completionKeymap: false,
                                lintKeymap: false,
                            }}
                            className="single-player-editor"
                        />
                    </div>
                )}
                <div id="problem">
                    <div>{questionDescription}</div>
                </div>
            </div>
            {gameMode === 'two-players' && (
                <>
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
                        <button className="button" onClick={sendChatMessage}>Send</button>
                    </div>
                </>
            )}
            {submissionResult && (
                <div className="result-container">
                    <h3>Results:</h3>
                    <pre>{submissionResult}</pre>
                </div>
            )}
            <div className="button-container">
                <button
                    onClick={handleSubmitReady}
                    disabled={loading}
                    className={`button submit-button ${isSubmitReady ? 'waiting' : ''}`}
                >
                    {isSubmitReady ? 'Waiting...' : 'Submit'}
                </button>
                {loading && <div className="loading-spinner"></div>}
                {passedAllTests && (
                    <button
                        onClick={handleNextQuestionReady}
                        className={`button next-question-button ${isNextQuestionReady ? 'waiting' : ''}`}
                    >
                        {isNextQuestionReady ? 'Waiting...' : 'Next Question'}
                    </button>
                )}
                <button
                    className={`button show-solution-button`}
                    onClick={handleShowSolutionReady}
                >
                    {getSolutionButtonText()}
                </button>
            </div>
            {showConfirmDialog && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h2>Are you sure?</h2>
                        <p>Viewing the solution may impact your learning experience. Are you sure you want to proceed?</p>
                        <div className="dialog-buttons">
                            <button className="button" onClick={() => setShowConfirmDialog(false)}>Cancel</button>
                            <button className="button" onClick={handleConfirmShowSolution}>Continue</button>
                        </div>
                    </div>
                </div>
            )}
            {showSolution && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h2>Solution</h2>
                        <pre className="solution-code">{questionSolution}</pre>
                        <button className="button" onClick={() => setShowSolution(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameInterface;