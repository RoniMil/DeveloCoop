import os
from dotenv import find_dotenv, load_dotenv
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from websocket_handler import handle_websocket
from game_logic import GameLogic
import random
from backend_config import ORIGINS, TEST_STR, JDOODLE_URL
from database import get_question, get_follow_up_questions, get_question_by_id
from game_logic import GameLogic, Submission, LobbyCreationResponse, JoinLobbyRequest, create_buggy_follow_up_description, fetch_and_set_question

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

load_dotenv(find_dotenv())

jdoodle_client_id = os.environ.get("JDOODLE_CLIENT_ID")
jdoodle_client_secret = os.environ.get("JDOODLE_CLIENT_SECRET")

game_logic = GameLogic()

@app.post("/create_lobby")
async def create_lobby():
    lobby_id = game_logic.create_lobby()
    return LobbyCreationResponse(lobby_id=lobby_id)

@app.post("/join_lobby")
async def join_lobby(request: JoinLobbyRequest):
    lobby = game_logic.get_lobby(request.lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if lobby.get_player_count() >= 2:
        raise HTTPException(status_code=400, detail="Lobby is full")
    return {"message": "Lobby joined successfully"}

@app.get("/find_lobby")
async def find_lobby():
    available_lobbies = [lobby_id for lobby_id, lobby in game_logic.lobbies.items() if lobby.get_player_count() == 1]
    if not available_lobbies:
        raise HTTPException(status_code=404, detail="No available lobbies")
    return {"lobby_id": random.choice(available_lobbies)}


@app.websocket("/ws/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    await handle_websocket(websocket, lobby_id, game_logic, get_question, get_follow_up_questions)


@app.get("/questions")
def get_random_question():
    return get_question()


@app.post("/questions/submit")
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

@app.get("/follow-up-questions/{question_name}")
def get_follow_ups(question_name: str):
    follow_ups = get_follow_up_questions(question_name)
    if follow_ups:
        for follow_up in follow_ups:
            if "Fix The Bugs" in follow_up["Question Name"]:
                follow_up["Question Description"] = create_buggy_follow_up_description(follow_up)
        return follow_ups
    else:
        raise HTTPException(status_code=404, detail="No follow-up questions found")


if __name__ == "__main__":
    uvicorn.run(app)
