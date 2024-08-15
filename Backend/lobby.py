from fastapi import WebSocket
from typing import Dict
import json

class Lobby:
    def __init__(self, lobby_id: str):
        self.lobby_id = lobby_id
        self.players: Dict[str, WebSocket] = {}
        self.ready_players: set = set()
        self.next_player_id = 1

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        player_id = str(self.next_player_id)
        self.players[player_id] = websocket
        self.next_player_id += 1
        return player_id

    def disconnect(self, player_id: str):
        self.players.pop(player_id, None)
        self.ready_players.discard(player_id)

    async def broadcast(self, message: str):
        for websocket in self.players.values():
            await websocket.send_text(message)

    def set_ready(self, player_id: str):
        self.ready_players.add(player_id)

    def all_players_ready(self):
        return len(self.ready_players) == 2 and len(self.players) == 2

    def get_player_count(self):
        return len(self.players)

    def get_player_id(self, websocket: WebSocket):
        for player_id, ws in self.players.items():
            if ws == websocket:
                return player_id
        return None

    def reset(self):
        self.ready_players.clear()

    async def send_to_player(self, player_id: str, message: str):
        if player_id in self.players:
            await self.players[player_id].send_text(message)