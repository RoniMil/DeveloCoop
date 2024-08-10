import os
from bson import ObjectId
from dotenv import find_dotenv, load_dotenv
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import requests
from fastapi import FastAPI, Query
import uvicorn

load_dotenv(find_dotenv())

app = FastAPI()

mongodb_pwd = os.environ.get("MONGODB_PWD")
mongodb_user = os.environ.get("MONGODB_USER")
jdoodle_client_id = os.environ.get("JDOODLE_CLIENT_ID")
jdoodle_client_secret = os.environ.get("JDOODLE_CLIENT_SECRET")

connection_str = f"mongodb+srv://{mongodb_user}:{mongodb_pwd}@develocoop.vjutg.mongodb.net/?retryWrites=true&w=majority&appName=DeveloCoop"
client = MongoClient(connection_str, server_api=ServerApi('1'))

questions = client.DeveloCoop.Questions


# class for submit answer post request framework
class Submission(BaseModel):
    question_id: str
    user_answer: str

@app.get("/questions/")
def get_question():
    print("run get_question")
    question = questions.aggregate([{"$sample": {"size": 1}}]).next()
    return question["Question Name"]

@app.post("/questions/submit")
def get_results(submission : Submission):
    test = client.DeveloCoop.test
    # from the user POSSIBLE TRANSFORMATION INTO \n\t FORMAT NEEDED
    user_answer = submission.user_answer
    # question = "def fuc(n):\n\tif n == 1 or n == 0:\n\t\treturn 1\n\treturn n * fuc(n-1)\n"
    # predefined from the excel sheet given a question id
    #tests = "import math\n\ttests = [i for i in range(0, 10)]\n\tfor t in tests:\n\t\tassert fuc(t) == math.factorial(t)\n"
    tests = test.find_one({"_id" : ObjectId(submission.question_id)})["Tests"]
    # specific tests for the question id
    test = f"\nif __name__ == '__main__':\n\t{tests}"

    execution_data = {
        'clientId': jdoodle_client_id,
        'clientSecret': jdoodle_client_secret,
        'script': user_answer + test,
        'language': 'python3',
        'versionIndex': '0'
    }

    # Make the POST request to execute code
    response = requests.post("https://api.jdoodle.com/v1/execute", json=execution_data)


    # !!!handle timeout case!!!
    # Output the result
    return response.json()

# def get_followup



if __name__ == '__main__':
    uvicorn.run(app)



