import json
import os
from bson import ObjectId
from dotenv import find_dotenv, load_dotenv
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from lobby import Lobby
from itertools import count

load_dotenv(find_dotenv())

app = FastAPI()

origins = [
    "http://localhost:3000",  # The origin of your Next.js frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

mongodb_pwd = os.environ.get("MONGODB_PWD")
mongodb_user = os.environ.get("MONGODB_USER")
jdoodle_client_id = os.environ.get("JDOODLE_CLIENT_ID")
jdoodle_client_secret = os.environ.get("JDOODLE_CLIENT_SECRET")

connection_str = f"mongodb+srv://{mongodb_user}:{mongodb_pwd}@develocoop.vjutg.mongodb.net/?retryWrites=true&w=majority&appName=DeveloCoop"
client = MongoClient(connection_str, server_api=ServerApi("1"))

questions_db = client.DeveloCoop.Questions
test_db = client.DeveloCoop.test

test_hardcoded_str = """wrong_answers = [(test, user_solution(*test), solution(*test)) for test in test_cases if user_solution(*test) != solution(*test)]
if not wrong_answers:
    print('Passed all tests!')
else:
    print('Failed on the following tests:')
    for test_case, your_answer, answer in wrong_answers:
        print("On input: " + str(list(test_case)) + ", your result: " + str(your_answer) + ", expected answer: " + str(answer))"""


# class for submit answer post request framework
class Submission(BaseModel):
    question_id: str
    user_answer: str
    lobby_id: str | None = None


class LobbyCreationResponse(BaseModel):
    lobby_id: str


class JoinLobbyRequest(BaseModel):
    lobby_id: str


lobbies = {}
lobby_id_counter = count(1)


@app.post("/create_lobby")
async def create_lobby():
    lobby_id = str(next(lobby_id_counter))
    lobbies[lobby_id] = Lobby(lobby_id)
    return LobbyCreationResponse(lobby_id=lobby_id)

@app.post("/join_lobby")
async def join_lobby(request: JoinLobbyRequest):
    lobby_id = request.lobby_id
    if lobby_id not in lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if lobbies[lobby_id].get_player_count() >= 2:
        raise HTTPException(status_code=400, detail="Lobby is full")
    return {"message": "Lobby joined successfully"}

@app.get("/find_lobby")
async def find_lobby():
    for lobby_id, lobby in lobbies.items():
        if lobby.get_player_count() == 1:
            return {"lobby_id": lobby_id}
    raise HTTPException(status_code=404, detail="No available lobbies")


@app.websocket("/ws/{lobby_id}")
async def websocket_endpoint(websocket: WebSocket, lobby_id: str):
    if lobby_id not in lobbies:
        await websocket.close(code=4000)
        return

    lobby = lobbies[lobby_id]
    player_id = await lobby.connect(websocket)
    try:
        await websocket.send_json({"type": "player_id", "id": player_id})
        await lobby.broadcast(
            json.dumps(
                {"type": "message", "content": f"Player {player_id} joined the lobby"}
            )
        )
        await lobby.broadcast(
            json.dumps({"type": "player_count", "count": lobby.get_player_count()})
        )
        while True:
            data = await websocket.receive_json()
            if data["type"] == "ready":
                is_ready = data.get("ready", True)
                lobby.set_ready(player_id, is_ready)
                await lobby.broadcast(
                    json.dumps(
                        {
                            "type": "player_ready",
                            "player_id": player_id,
                            "ready": is_ready,
                        }
                    )
                )
                if lobby.all_players_ready():
                    if not lobby.get_question():
                        # Fetch a question only if it hasn't been set yet
                        question = get_question()
                        lobby.set_question(question)
                    # Send the question to both players
                    await lobby.broadcast(
                        json.dumps(
                            {"type": "game_start", "question": lobby.get_question()}
                        )
                    )
            if data["type"] == "submit_ready":
                is_submit_ready = data.get("submit_ready", True)
                lobby.set_submit_ready(player_id, is_submit_ready)
                # await lobby.send_editor_content(data.get("editor_content", ""))
                await lobby.broadcast(
                    json.dumps(
                        {
                            "type": "player_submit_ready",
                            "player_id": player_id,
                            "submit_ready": is_submit_ready,
                        }
                    )
                )
                if lobby.all_players_submit_ready():
                    lobby.set_editor_content(data.get("editor_content", ""))
                    # Send the question to both players
                    await lobby.broadcast(
                        json.dumps(
                            {"type": "submit_code", "question_id": lobby.get_question()["_id"], "editor_content": lobby.get_editor_content(), "lobby_id": lobby.get_lobby_id()}
                        )
                    )        
            elif data["type"] == "chat":
                await lobby.broadcast(
                    json.dumps(
                        {
                            "type": "message",
                            "content": f"Player {player_id}: {data['content']}",
                        }
                    )
                )
    except WebSocketDisconnect:
        lobby.disconnect(player_id)
        await lobby.broadcast(
            json.dumps({"type": "player_left", "player_id": player_id})
        )
        await lobby.broadcast(
            json.dumps({"type": "player_count", "count": lobby.get_player_count()})
        )
        if lobby.get_player_count() == 0:
            del lobbies[lobby_id]


@app.get("/questions")
def get_question():
    # !!!change DB to questions when actual DB exists!!!
    question = test_db.aggregate([{"$sample": {"size": 1}}]).next()
    question["_id"] = str(question["_id"])
    return question


@app.post("/questions/submit")
def get_results(submission: Submission):
    user_answer = submission.user_answer
    test_db = client.DeveloCoop.test
    # predefined from the excel sheet given a question id
    db_entry = test_db.find_one({"_id": ObjectId(submission.question_id)})
    tests = db_entry["Question Tests"]
    answer = db_entry["Question Solution"]

    test_str = f"{tests}\n{test_hardcoded_str}"

    execution_data = {
        "clientId": jdoodle_client_id,
        "clientSecret": jdoodle_client_secret,
        "script": f"{answer}\n{user_answer}\n{test_str}",
        "language": "python3",
        "versionIndex": "0",
    }

    # Make the POST request to execute code
    response = requests.post("https://api.jdoodle.com/v1/execute", json=execution_data)

    # Output the result
    return response.json()


# def get_followup


if __name__ == "__main__":
    uvicorn.run(app)
