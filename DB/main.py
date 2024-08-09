import os
from dotenv import find_dotenv, load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import unquote_plus
load_dotenv(find_dotenv())

password = os.environ.get("MONGODB_PWD")

connection_str = f"mongodb+srv://MONGODB_USER:{password}@develocoop.vjutg.mongodb.net/?retryWrites=true&w=majority&appName=DeveloCoop"
client = MongoClient(connection_str, server_api=ServerApi('1'))

dbs = client.list_database_names()
print(dbs)