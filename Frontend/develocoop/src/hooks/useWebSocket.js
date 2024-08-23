import { useCallback, useEffect, useRef } from 'react';
import { WS_URL } from '../gameConfig';

const useWebSocket = (lobbyId, handleWebSocketMessage) => {
    const websocketRef = useRef(null);

    const connectToLobby = useCallback(() => {
        console.log(`Connecting to lobby: ${lobbyId}`);
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already open, skipping connection');
            return;
        }

        websocketRef.current = new WebSocket(`${WS_URL}/${lobbyId}`);

        websocketRef.current.onopen = () => {
            console.log(`Connected to lobby: ${lobbyId}`);
        };

        websocketRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        websocketRef.current.onclose = (event) => {
            if (!event.wasClean) {
                setTimeout(() => connectToLobby(), 1000);
            }
            console.log(`Disconnected from lobby: ${lobbyId}`, event);
        };

        websocketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [lobbyId, handleWebSocketMessage]);

    useEffect(() => {
        if (lobbyId) {
            connectToLobby();
        }
        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }
        };
    }, [lobbyId, connectToLobby]);

    const sendWebSocketMessage = useCallback((message) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not open, cannot send message');
        }
    }, []);

    return sendWebSocketMessage;
};

export default useWebSocket;