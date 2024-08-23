import json
import os
from dotenv import find_dotenv, load_dotenv
from pydantic import BaseModel
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from game_logic import GameLogic
from lobby import Lobby
from itertools import count
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
    lobby = game_logic.get_lobby(lobby_id)
    if not lobby:
        await websocket.close(code=4000)
        return

    player_id = await lobby.connect(websocket)
    try:
        await websocket.send_json({"type": "player_id", "id": player_id})
        await lobby.broadcast(json.dumps({"type": "message", "content": f"Player {player_id} joined the lobby"}))
        await lobby.broadcast(json.dumps({"type": "player_count", "count": lobby.get_player_count()}))
        
        while True:
            data = await websocket.receive_json()
            if data["type"] == "reset_lobby":
                lobby.reset_lobby()
                fetch_and_set_question(lobby, get_question, get_follow_up_questions)
                await lobby.broadcast(json.dumps({"type": "lobby_reset"}))
            elif data["type"] == "ready":
                is_ready = data.get("ready", True)
                lobby.set_ready(player_id, is_ready)
                await lobby.broadcast(json.dumps({"type": "player_ready", "player_id": player_id, "ready": is_ready}))
                if lobby.all_players_ready():
                    if not lobby.get_question():
                        fetch_and_set_question(lobby, get_question, get_follow_up_questions)
                    await lobby.broadcast(json.dumps({"type": "game_start", "question": lobby.get_question()}))
            elif data["type"] == "submit_ready":
                is_submit_ready = data.get("submit_ready", True)
                lobby.set_submit_ready(player_id, is_submit_ready)
                await lobby.broadcast(json.dumps({"type": "player_submit_ready", "player_id": player_id, "submit_ready": is_submit_ready}))
                if lobby.all_players_submit_ready():
                    lobby.set_editor_content(data.get("editor_content", ""))
                    await lobby.broadcast(json.dumps({"type": "submit_code", "question_id": lobby.get_question()["_id"], "editor_content": lobby.get_editor_content(), "lobby_id": lobby.get_lobby_id()}))
                    await lobby.broadcast(json.dumps({"type": "reset_submit_ready"}))
                    lobby.reset_submit_ready()
            elif data["type"] == "next_question_ready":
                is_next_question_ready = data.get("next_question_ready", True)
                lobby.set_next_question_ready(player_id, is_next_question_ready)
                await lobby.broadcast(json.dumps({"type": "player_next_question_ready", "player_id": player_id, "next_question_ready": is_next_question_ready}))
                if lobby.all_players_next_question_ready():
                    follow_up_questions = lobby.get_follow_up_questions()
                    if not follow_up_questions:
                        await lobby.broadcast(json.dumps({"type": "session_end", "message": "No more follow-up questions available."}))
                    else:
                        next_question = follow_up_questions.pop(random.randrange(len(follow_up_questions)))
                        lobby.set_question(next_question)
                        await lobby.broadcast(json.dumps({"type": "move_to_next_question", "question": next_question}))
                    lobby.reset_next_question_ready()
            elif data["type"] == "chat":
                await lobby.broadcast(json.dumps({"type": "message", "content": f"Player {player_id}: {data['content']}"}))

    except WebSocketDisconnect:
        lobby.disconnect(player_id)
        await lobby.broadcast(json.dumps({"type": "player_left", "player_id": player_id}))
        await lobby.broadcast(json.dumps({"type": "player_count", "count": lobby.get_player_count()}))
        if lobby.get_player_count() == 0:
            game_logic.remove_lobby(lobby_id)


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
