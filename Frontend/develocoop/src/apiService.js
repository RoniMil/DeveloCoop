import { API_URL } from './gameConfig';

export const fetchQuestion = async () => {
    const response = await fetch(`${API_URL}/questions`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

export const fetchFollowUpQuestions = async (questionName) => {
    const response = await fetch(`${API_URL}/follow-up-questions/${encodeURIComponent(questionName)}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

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

export const createLobby = async () => {
    const response = await fetch(`${API_URL}/create_lobby`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

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

export const findLobby = async () => {
    const response = await fetch(`${API_URL}/find_lobby`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};