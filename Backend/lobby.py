from fastapi import WebSocket
from typing import Dict

class Lobby:
    def __init__(self, lobby_id: str):
        self.lobby_id = lobby_id
        self.players: Dict[str, WebSocket] = {}
        self.ready_players: set = set()
        self.is_player_one_taken = False


    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        if self.is_player_one_taken:
            player_id = "2"
        else:
            player_id = "1" 
            self.is_player_one_taken = True   
        self.players[player_id] = websocket
        return player_id

    def disconnect(self, player_id: str):
        self.players.pop(player_id, None)
        self.ready_players.discard(player_id)
        if player_id == "1":
            self.is_player_one_taken = False
        

    async def broadcast(self, message: str):
        for websocket in self.players.values():
            await websocket.send_text(message)

    def set_ready(self, player_id: str, is_ready: bool):
        if is_ready:
            self.ready_players.add(player_id)
        else:
            self.ready_players.discard(player_id)


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