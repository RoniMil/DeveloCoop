from fastapi import WebSocket
from typing import Dict

import logging
logger = logging.getLogger(__name__)


class Lobby:
    def __init__(self, lobby_id: str):
        self.lobby_id = lobby_id
        self.players: Dict[str, WebSocket] = {}
        self.ready_players: set = set()
        self.submit_ready_players: set = set()
        self.next_question_ready_players: set = set()
        self.show_solution_ready_players: set = set()
        self.is_player_one_taken = False
        self.question = None
        self.follow_up_questions = None
        self.editor_content = None
        self.was_solution_revealed = False
        logger.info(f"Created new lobby with ID {lobby_id}")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        if self.is_player_one_taken:
            player_id = "2"
        else:
            player_id = "1"
            self.is_player_one_taken = True
        self.players[player_id] = websocket
        logger.info(f"Player {player_id} connected to lobby {self.lobby_id}")
        return player_id

    def disconnect(self, player_id: str):
        self.players.pop(player_id, None)
        self.ready_players.discard(player_id)
        if player_id == "1":
            self.is_player_one_taken = False

    async def broadcast(self, message: str):
        logger.debug(f"Broadcasting message to lobby {self.lobby_id}: {message}")
        for player_id, websocket in self.players.items():
            try:
                await websocket.send_text(message)
                logger.debug(f"Message sent to player {player_id}")
            except Exception as e:
                logger.error(f"Error sending message to player {player_id}: {str(e)}", exc_info=True)

    def reset_lobby(self):
        self.ready_players.clear()
        self.submit_ready_players.clear()
        self.next_question_ready_players.clear()
        self.show_solution_ready_players.clear()
        self.question = None
        self.follow_up_questions = None
        self.editor_content = None
        self.was_solution_revealed = False

    def all_players_ready(self):
        return len(self.ready_players) == 2 and len(self.players) == 2

    def all_players_submit_ready(self):
        return len(self.submit_ready_players) == 2 and len(self.players) == 2

    def all_players_next_question_ready(self):
        return len(self.next_question_ready_players) == 2 and len(self.players) == 2

    def all_players_show_solution_ready(self):
        result = len(self.show_solution_ready_players) == 2 and len(self.players) == 2
        logger.debug(f"all_players_show_solution_ready: {result}")
        return result

    def get_player_count(self):
        return len(self.players)

    def get_player_id(self, websocket: WebSocket):
        for player_id, ws in self.players.items():
            if ws == websocket:
                return player_id
        return None

    def get_question(self):
        return self.question

    def get_follow_up_questions(self):
        return self.follow_up_questions

    def get_lobby_id(self):
        return self.lobby_id

    def get_editor_content(self):
        return self.editor_content

    def get_was_solution_revealed(self):
        logger.debug(f"get_was_solution_revealed: {self.was_solution_revealed}")
        return self.was_solution_revealed

    def set_ready(self, player_id: str, is_ready: bool):
        if is_ready:
            self.ready_players.add(player_id)
        else:
            self.ready_players.discard(player_id)

    def set_submit_ready(self, player_id: str, is_submit_ready: bool):
        if is_submit_ready:
            self.submit_ready_players.add(player_id)
        else:
            self.submit_ready_players.discard(player_id)

    def set_next_question_ready(self, player_id: str, is_next_question_ready: bool):
        if is_next_question_ready:
            self.next_question_ready_players.add(player_id)
        else:
            self.next_question_ready_players.discard(player_id)

    def set_show_solution_ready(self, player_id: str, is_show_solution_ready: bool):
        logger.debug(f"Setting show_solution_ready for player {player_id} to {is_show_solution_ready}")
        if is_show_solution_ready:
            self.show_solution_ready_players.add(player_id)
        else:
            self.show_solution_ready_players.discard(player_id)
        logger.debug(f"show_solution_ready_players: {self.show_solution_ready_players}")

    def set_question(self, question):
        self.question = question

    def set_follow_up_questions(self, follow_up_questions):
        self.follow_up_questions = follow_up_questions

    def set_editor_content(self, editor_content):
        self.editor_content = editor_content

    def reset_ready(self):
        self.ready_players.clear()

    def reset_submit_ready(self):
        self.submit_ready_players.clear()

    def reset_next_question_ready(self):
        self.next_question_ready_players.clear()

    def reset_show_solution_ready(self):
        logger.debug("Resetting show_solution_ready state")
        self.show_solution_ready_players.clear()

    def set_was_solution_revealed(self, value: bool):
        logger.debug(f"Setting was_solution_revealed to {value}")
        self.was_solution_revealed = value

    def reset_question_state(self):
        self.show_solution_ready_players.clear()
        self.was_solution_revealed = False

    async def send_to_player(self, player_id: str, message: str):
        if player_id in self.players:
            await self.players[player_id].send_text(message)
