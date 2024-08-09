import os
from dotenv import find_dotenv, load_dotenv
import requests

load_dotenv(find_dotenv())

client_id = os.environ.get("JDOODLE_CLIENT_ID")
client_secret = os.environ.get("JDOODLE_CLIENT_SECRET")

factorial_question = "def fuc(n):\n\tif n == 1 or n == 0:\n\t\treturn 1\n\treturn n * fuc(n-1)\n"
factorial_tests = "if __name__ == '__main__':\n\timport math\n\ttests = [i for i in range(0, 10)]\n\tfor t in tests:\n\t\tassert fuc(t) == math.factorial(t)\n"

execution_data = {
    'clientId': client_id,
    'clientSecret': client_secret,
    'script': factorial_question + factorial_tests,
    'language': 'python3',
    'versionIndex': '0'
}

# Make the POST request to execute code
response = requests.post("https://api.jdoodle.com/v1/execute", json=execution_data)

# Output the result
print(response.json())



