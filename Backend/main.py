import os
from bson import ObjectId
from dotenv import find_dotenv, load_dotenv
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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
client = MongoClient(connection_str, server_api=ServerApi('1'))

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

@app.get("/questions")
def get_question():
    # !!!change DB to questions when actual DB exists!!!
    question = test_db.aggregate([{"$sample": {"size": 1}}]).next()
    question["_id"] = str(question["_id"])
    return question

@app.post("/questions/submit")
def get_results(submission : Submission):
    # from the user POSSIBLE TRANSFORMATION INTO \n\t FORMAT NEEDED
    user_answer = submission.user_answer
    test_db = client.DeveloCoop.test
    # predefined from the excel sheet given a question id
    #tests = "import math\n\ttests = [i for i in range(0, 10)]\n\tfor t in tests:\n\t\tassert fuc(t) == math.factorial(t)\n"
    db_entry = test_db.find_one({"_id" : ObjectId(submission.question_id)})
    tests = db_entry["Question Tests"]
    answer = db_entry["Question Solution"]

    # specific tests for the question id
    #test_hardcoded_str = "wrong_answers = [(test,\tuser_solution(*test),\tsolution(*test))\tfor test in test_cases\tif user_solution(*test) != solution(*test)]\nif not wrong_answers:\n\tprint('Passed all tests!')\nelse:\n\tprint('Failed on the following tests:')\n\tfor test_case,\tyour_answer,\tanswer in wrong_answers:\n\t\tprint(f'On input: {test_case},\tyour result: {your_answer},\texpected answer: {answer}')"

    test_str = f"{tests}\n{test_hardcoded_str}"

    execution_data = {
        'clientId': jdoodle_client_id,
        'clientSecret': jdoodle_client_secret,
        'script': f"{answer}\n{user_answer}\n{test_str}",
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



