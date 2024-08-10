import os
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

dbs = client.list_database_names()

questions = client.DeveloCoop.Questions


@app.get("/questions/")
def get_question():
    print("run get_question")
    question = questions.aggregate([{"$sample": {"size": 1}}]).next()
    return question["Question Name"]

@app.get("/questions/{question_id}")
def get_results(question_id, user_answer : str = Query(...)):
    # from the user POSSIBLE TRANSFORMATION INTO \n\t FORMAT NEEDED
    question = "def fuc(n):\n\tif n == 1 or n == 0:\n\t\treturn 1\n\treturn n * fuc(n-1)\n"
    # predefined from the excel sheet given a question id
    tests = "import math\n\ttests = [i for i in range(0, 10)]\n\tfor t in tests:\n\t\tassert fuc(t) == math.factorial(t)\n"

    # specific tests for the question id
    test = f"if __name == '__main__':\n\t{tests}"

    execution_data = {
        'clientId': jdoodle_client_id,
        'clientSecret': jdoodle_client_secret,
        'script': question + test,
        'language': 'python3',
        'versionIndex': '0'
    }

    # Make the POST request to execute code
    response = requests.post("https://api.jdoodle.com/v1/execute", json=execution_data)


    # !!!handle timeout case!!!
    # Output the result
    print(response.json())

# def get_followup

class Question(BaseModel):
    name: str
    description: str | None = None
    examples: str | None = None
    # declaration: float
    # tests: float | None = None



if __name__ == '__main__':
    uvicorn.run(app)



