from pydantic import BaseModel
from typing import Dict
from itertools import count
from lobby import Lobby

# module responsible for handling the game logic (lobby and question handling etc) and the data models used by the server

# Data models 
class Submission(BaseModel):
    question_id: str
    user_answer: str
    lobby_id: str | None = None

class LobbyCreationResponse(BaseModel):
    lobby_id: str

class JoinLobbyRequest(BaseModel):
    lobby_id: str

class GameLogic:
    def __init__(self):
        self.lobbies: Dict[str, Lobby] = {}
        self.lobby_id_counter = count(1)

    # Create a new lobby with a unique ID
    def create_lobby(self) -> str:
        lobby_id = str(next(self.lobby_id_counter))
        self.lobbies[lobby_id] = Lobby(lobby_id)
        return lobby_id
    
    # Retrieve a lobby by its ID
    def get_lobby(self, lobby_id: str) -> Lobby:
        return self.lobbies.get(lobby_id)
    
    # Remove a lobby from the game
    def remove_lobby(self, lobby_id: str):
        self.lobbies.pop(lobby_id, None)

# Fetch a new question and its follow-ups, then set them for the lobby
def fetch_and_set_question(lobby: Lobby, get_question, get_follow_up_questions):
    question = get_question()
    lobby.set_question(question)
    lobby.set_follow_up_questions(get_follow_up_questions(question["Question Name"]))