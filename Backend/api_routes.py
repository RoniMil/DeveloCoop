from fastapi import APIRouter, WebSocket, HTTPException
from game_logic import GameLogic, Submission, LobbyCreationResponse, JoinLobbyRequest, create_buggy_follow_up_description
from websocket_handler import handle_websocket
from database import get_question, get_follow_up_questions, get_question_by_id
from backend_config import TEST_STR, JDOODLE_URL
import random
import requests
import os

# module responsible for holding and handling the server's API points

router = APIRouter()
game_logic = GameLogic()

jdoodle_client_id = os.environ.get("JDOODLE_CLIENT_ID")
jdoodle_client_secret = os.environ.get("JDOODLE_CLIENT_SECRET")

@router.post("/create_lobby")
async def create_lobby():
    lobby_id = game_logic.create_lobby()
    return LobbyCreationResponse(lobby_id=lobby_id)

@router.post("/join_lobby")
async def join_lobby(request: JoinLobbyRequest):
    lobby = game_logic.get_lobby(request.lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if lobby.get_player_count() >= 2:
        raise HTTPException(status_code=400, detail="Lobby is full")
    return {"message": "Lobby joined successfully"}

@router.get("/find_lobby")
async def find_lobby():
    available_lobbies = [lobby_id for lobby_id, lobby in game_logic.lobbies.items() if lobby.get_player_count() == 1]
    if not available_lobbies:
        raise HTTPException(status_code=404, detail="No available lobbies")
    return {"lobby_id": random.choice(available_lobbies)}

@router.websocket("/ws/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    await handle_websocket(websocket, lobby_id, game_logic, get_question, get_follow_up_questions)

@router.get("/questions")
def get_random_question():
    return get_question()

@router.post("/questions/submit")
def get_results(submission: Submission):
    user_answer = submission.user_answer
    db_entry = get_question_by_id(submission.question_id)
    
    tests = db_entry["Question Tests"]
    answer = db_entry["Question Solution"]

    test_str = f"{tests}\n{TEST_STR}"

    execution_data = {
        "clientId": jdoodle_client_id,
        "clientSecret": jdoodle_client_secret,
        "script": f"{answer}\n{user_answer}\n{test_str}",
        "language": "python3",
        "versionIndex": "0",
    }

    response = requests.post(JDOODLE_URL, json=execution_data)
    return response.json()

@router.get("/follow-up-questions/{question_name}")
def get_follow_ups(question_name: str):
    follow_ups = get_follow_up_questions(question_name)
    if follow_ups:
        return follow_ups
    else:
        raise HTTPException(status_code=404, detail="No follow-up questions found")