import { API_URL } from './gameConfig';

// Fetch a random question from the server
export const fetchQuestion = async () => {
    const response = await fetch(`${API_URL}/questions`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

// Fetch follow-up questions for a given question
export const fetchFollowUpQuestions = async (questionName) => {
    const response = await fetch(`${API_URL}/follow-up-questions/${encodeURIComponent(questionName)}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

// Submit an answer to the server
export const submitAnswer = async (questionId, editorContent, lobbyId) => {
    const response = await fetch(`${API_URL}/questions/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question_id: questionId, user_answer: editorContent, lobby_id: lobbyId })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

// Create a new lobby
export const createLobby = async () => {
    const response = await fetch(`${API_URL}/create_lobby`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

// Join an existing lobby
export const joinLobby = async (lobbyId) => {
    const response = await fetch(`${API_URL}/join_lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId }),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

// Find an available lobby
export const findLobby = async () => {
    const response = await fetch(`${API_URL}/find_lobby`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};