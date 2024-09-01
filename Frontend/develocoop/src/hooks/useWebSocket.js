import { useCallback, useEffect, useRef } from 'react';
import { WS_URL } from '../gameConfig';

const useWebSocket = (lobbyId, handleWebSocketMessage) => {
    const websocketRef = useRef(null);

    // Function to establish a WebSocket connection of lobby
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
            console.log(`WebSocket closed for lobby ${lobbyId}:`, event);
            if (!event.wasClean) {
                console.warn(`WebSocket closed unexpectedly. Code: ${event.code}, Reason: ${event.reason}`);
                setTimeout(() => connectToLobby(), 1000);
            }
            console.log(`Disconnected from lobby: ${lobbyId}`, event);
        };

        websocketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [lobbyId, handleWebSocketMessage]);

    // Effect to manage WebSocket connection lifecycle
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

    // Function to send messages through the WebSocket
    const sendWebSocketMessage = useCallback((message) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending WebSocket message:', message);
            websocketRef.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not open, cannot send message');
        }
    }, []);

    return sendWebSocketMessage;
};

export default useWebSocket;