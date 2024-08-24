import json
from fastapi import WebSocket, WebSocketDisconnect
import random
from game_logic import fetch_and_set_question

# manages and handles incoming websocket connections, clients communication, client messages to the server

async def handle_websocket(websocket: WebSocket, lobby_id: str, game_logic, get_question, get_follow_up_questions):
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
                await handle_reset_lobby(lobby, get_question, get_follow_up_questions)
            elif data["type"] == "ready":
                await handle_ready(lobby, player_id, data, get_question, get_follow_up_questions)
            elif data["type"] == "submit_ready":
                await handle_submit_ready(lobby, player_id, data)
            elif data["type"] == "next_question_ready":
                await handle_next_question_ready(lobby, player_id, data)
            elif data["type"] == "chat":
                await handle_chat(lobby, player_id, data)

    except WebSocketDisconnect:
        await handle_disconnect(lobby, player_id, game_logic, lobby_id)

async def handle_reset_lobby(lobby, get_question, get_follow_up_questions):
    lobby.reset_lobby()
    fetch_and_set_question(lobby, get_question, get_follow_up_questions)
    await lobby.broadcast(json.dumps({"type": "lobby_reset"}))

async def handle_ready(lobby, player_id, data, get_question, get_follow_up_questions):
    is_ready = data.get("ready", True)
    lobby.set_ready(player_id, is_ready)
    await lobby.broadcast(json.dumps({"type": "player_ready", "player_id": player_id, "ready": is_ready}))
    if lobby.all_players_ready():
        if not lobby.get_question():
            fetch_and_set_question(lobby, get_question, get_follow_up_questions)
        await lobby.broadcast(json.dumps({"type": "game_start", "question": lobby.get_question()}))

async def handle_submit_ready(lobby, player_id, data):
    is_submit_ready = data.get("submit_ready", True)
    lobby.set_submit_ready(player_id, is_submit_ready)
    await lobby.broadcast(json.dumps({"type": "player_submit_ready", "player_id": player_id, "submit_ready": is_submit_ready}))
    if lobby.all_players_submit_ready():
        lobby.set_editor_content(data.get("editor_content", ""))
        await lobby.broadcast(json.dumps({"type": "submit_code", "question_id": lobby.get_question()["_id"], "editor_content": lobby.get_editor_content(), "lobby_id": lobby.get_lobby_id()}))
        await lobby.broadcast(json.dumps({"type": "reset_submit_ready"}))
        lobby.reset_submit_ready()

async def handle_next_question_ready(lobby, player_id, data):
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

async def handle_chat(lobby, player_id, data):
    await lobby.broadcast(json.dumps({"type": "message", "content": f"Player {player_id}: {data['content']}"}))

async def handle_disconnect(lobby, player_id, game_logic, lobby_id):
    lobby.disconnect(player_id)
    await lobby.broadcast(json.dumps({"type": "player_left", "player_id": player_id}))
    await lobby.broadcast(json.dumps({"type": "player_count", "count": lobby.get_player_count()}))
    if lobby.get_player_count() == 0:
        game_logic.remove_lobby(lobby_id)