# database.py

from dotenv import find_dotenv, load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
import os

# handle database init and operations

load_dotenv(find_dotenv())

mongodb_pwd = os.environ.get("MONGODB_PWD")
mongodb_user = os.environ.get("MONGODB_USER")

connection_str = f"mongodb+srv://{mongodb_user}:{mongodb_pwd}@develocoop.vjutg.mongodb.net/?retryWrites=true&w=majority&appName=DeveloCoop"
client = MongoClient(connection_str, server_api=ServerApi("1"))

questions_db = client.DeveloCoop.QuestionsDB
followups_db = client.DeveloCoop.FollowUpsDB


def create_buggy_follow_up_description(follow_up: dict) -> str:
    description = f"Now you are given a buggy solution for the {follow_up['Original Question']} question. Can you find the bugs and fix them?\n\nDescription reminder:\n{follow_up['Question Description']}"
    return description


def get_question():
    question = questions_db.aggregate([{"$sample": {"size": 1}}]).next()
    question["_id"] = str(question["_id"])
    return question


def get_follow_up_questions(question_name):
    follow_ups = list(followups_db.find({"Original Question": question_name}))
    for follow_up in follow_ups:
        follow_up["_id"] = str(follow_up["_id"])
        if "Fix the Bugs" in follow_up["Question Name"]:
            follow_up["Question Description"] = create_buggy_follow_up_description(
                follow_up
            )
    return follow_ups


def get_question_by_id(question_id):
    return questions_db.find_one(
        {"_id": ObjectId(question_id)}
    ) or followups_db.find_one({"_id": ObjectId(question_id)})
