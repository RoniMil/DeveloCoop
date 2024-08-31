import json
from fastapi import WebSocket, WebSocketDisconnect
import random
from game_logic import fetch_and_set_question

import logging

logger = logging.getLogger(__name__)


# manages and handles incoming websocket connections, clients communication, client messages to the server


async def handle_websocket(
    websocket: WebSocket,
    lobby_id: str,
    game_logic,
    get_question,
    get_follow_up_questions,
):
    lobby = game_logic.get_lobby(lobby_id)

    logger.info(f"New WebSocket connection for lobby {lobby_id}")

    if not lobby:

        logger.warning(f"Lobby {lobby_id} not found, closing connection")

        await websocket.close(code=4000)
        return

    player_id = await lobby.connect(websocket)

    logger.info(f"Player {player_id} connected to lobby {lobby_id}")

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
            try:
                data = await websocket.receive_json()

                logger.debug(f"Received message from player {player_id}: {data}")

                if data["type"] == "reset_lobby":
                    await handle_reset_lobby(
                        lobby, get_question, get_follow_up_questions
                    )
                elif data["type"] == "ready":
                    await handle_ready(
                        lobby, player_id, data, get_question, get_follow_up_questions
                    )
                elif data["type"] == "submit_ready":
                    await handle_submit_ready(lobby, player_id, data)
                elif data["type"] == "next_question_ready":
                    await handle_next_question_ready(lobby, player_id, data)
                elif data["type"] == "chat":
                    await handle_chat(lobby, player_id, data)
                elif data["type"] == "show_solution_ready":
                    await handle_show_solution_ready(lobby, player_id, data)

            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                break

    except WebSocketDisconnect:

        logger.info(
            f"WebSocket disconnected for player {player_id} in lobby {lobby_id}"
        )

    finally:

        logger.info(
            f"Cleaning up connection for player {player_id} in lobby {lobby_id}"
        )

        await handle_disconnect(lobby, player_id, game_logic, lobby_id)


async def handle_reset_lobby(lobby, get_question, get_follow_up_questions):
    lobby.reset_lobby()
    fetch_and_set_question(lobby, get_question, get_follow_up_questions)
    await lobby.broadcast(json.dumps({"type": "lobby_reset"}))


async def handle_ready(lobby, player_id, data, get_question, get_follow_up_questions):
    is_ready = data.get("ready", True)
    lobby.set_ready(player_id, is_ready)
    await lobby.broadcast(
        json.dumps({"type": "player_ready", "player_id": player_id, "ready": is_ready})
    )
    if lobby.all_players_ready():
        lobby.set_in_session(True)
        if not lobby.get_question():
            fetch_and_set_question(lobby, get_question, get_follow_up_questions)
        question = lobby.get_question()
        await lobby.broadcast(
            json.dumps(
                {
                    "type": "game_start",
                    "question": {
                        "Question Declaration": question["Question Declaration"],
                        "Question Description": question["Question Description"],
                        "Question Name": question["Question Name"],
                        "_id": question["_id"],
                        "Question Solution": question.get("Question Solution", ""),
                    },
                }
            )
        )


async def handle_show_solution_ready(lobby, player_id, data):
    logger.info(f"Handling show_solution_ready for player {player_id}")
    is_show_solution_ready = data.get("show_solution_ready", True)
    logger.debug(f"Player {player_id} show_solution_ready: {is_show_solution_ready}")
    was_revealed = lobby.get_was_solution_revealed()

    if not was_revealed:
        lobby.set_show_solution_ready(player_id, is_show_solution_ready)
        logger.debug(f"All players ready: {lobby.all_players_show_solution_ready()}")
        if lobby.all_players_show_solution_ready():
            logger.info("All players are show_solution_ready, broadcasting solution")
            lobby.set_was_solution_revealed(True)
            try:
                await lobby.broadcast(
                    json.dumps(
                        {"type": "show_solution", "was_revealed": False, "count": len(lobby.show_solution_ready_players)}
                    )
                )
                logger.info("Show solution broadcast complete")
            except Exception as e:
                logger.error(
                    f"Error broadcasting show solution: {str(e)}", exc_info=True
                )
            finally:
                lobby.reset_show_solution_ready()
        else:
            await lobby.broadcast(
                json.dumps({"type": "update_show_solution_count", "count": len(lobby.show_solution_ready_players)})
            )
    else:
        # If solution was already revealed, just send it to the requesting player
        try:
            await lobby.send_to_player(
                player_id, json.dumps({"type": "show_solution", "was_revealed": True})
            )
            logger.info(f"Sent solution to player {player_id}")
        except Exception as e:
            logger.error(
                f"Error sending solution to player {player_id}: {str(e)}", exc_info=True
            )


async def handle_submit_ready(lobby, player_id, data):
    is_submit_ready = data.get("submit_ready", True)
    lobby.set_submit_ready(player_id, is_submit_ready)
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
        await lobby.broadcast(
            json.dumps(
                {
                    "type": "submit_code",
                    "question_id": lobby.get_question()["_id"],
                    "editor_content": lobby.get_editor_content(),
                    "lobby_id": lobby.get_lobby_id(),
                }
            )
        )
        await lobby.broadcast(json.dumps({"type": "reset_submit_ready"}))
        lobby.reset_submit_ready()


async def handle_next_question_ready(lobby, player_id, data):
    is_next_question_ready = data.get("next_question_ready", True)
    lobby.set_next_question_ready(player_id, is_next_question_ready)
    await lobby.broadcast(
        json.dumps(
            {
                "type": "player_next_question_ready",
                "player_id": player_id,
                "next_question_ready": is_next_question_ready,
            }
        )
    )
    if lobby.all_players_next_question_ready():
        follow_up_questions = lobby.get_follow_up_questions()
        if not follow_up_questions:
            await lobby.broadcast(
                json.dumps(
                    {
                        "type": "session_end",
                        "message": "No more follow-up questions available.",
                    }
                )
            )
        else:
            next_question = follow_up_questions.pop(
                random.randrange(len(follow_up_questions))
            )
            lobby.set_question(next_question)
            lobby.reset_question_state()
            await lobby.broadcast(
                json.dumps({"type": "move_to_next_question", "question": next_question})
            )
        lobby.reset_next_question_ready()


async def handle_chat(lobby, player_id, data):
    await lobby.broadcast(
        json.dumps(
            {"type": "message", "content": f"Player {player_id}: {data['content']}"}
        )
    )


async def handle_disconnect(lobby, player_id, game_logic, lobby_id):
    lobby.disconnect(player_id)
    await lobby.broadcast(json.dumps({"type": "player_left", "player_id": player_id, "in_session": lobby.get_in_session()}))
    await lobby.broadcast(
        json.dumps({"type": "player_count", "count": lobby.get_player_count()})
    )
    if lobby.get_player_count() == 0:
        game_logic.remove_lobby(lobby_id)
