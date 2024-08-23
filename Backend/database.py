# database.py

from dotenv import find_dotenv, load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
import os

load_dotenv(find_dotenv())

mongodb_pwd = os.environ.get("MONGODB_PWD")
mongodb_user = os.environ.get("MONGODB_USER")

connection_str = f"mongodb+srv://{mongodb_user}:{mongodb_pwd}@develocoop.vjutg.mongodb.net/?retryWrites=true&w=majority&appName=DeveloCoop"
client = MongoClient(connection_str, server_api=ServerApi("1"))

questions_db = client.DeveloCoop.Questions

# !!!!!!!!!DEBUG DBs!!!!!!!!!!!
mini_db = client.DeveloCoop.MiniDB
mini_db_followups = client.DeveloCoop.MiniDBFollowUps

def get_question():
    question = mini_db.aggregate([{"$sample": {"size": 1}}]).next()
    question["_id"] = str(question["_id"])
    return question

def get_follow_up_questions(question_name):
    follow_ups = list(mini_db_followups.find({"Original Question": question_name}))
    for follow_up in follow_ups:
        follow_up["_id"] = str(follow_up["_id"])
    return follow_ups

def get_question_by_id(question_id):
    return mini_db.find_one({"_id": ObjectId(question_id)}) or mini_db_followups.find_one({"_id": ObjectId(question_id)})