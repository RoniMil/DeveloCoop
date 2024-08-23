ORIGINS = "http://localhost:3000"
JDOODLE_URL = "https://api.jdoodle.com/v1/execute"
TEST_STR = """wrong_answers = [(test, user_solution(*test), solution(*test)) for test in test_cases if user_solution(*test) != solution(*test)]
if not wrong_answers:
    print('Passed all tests!')
else:
    print('Failed on the following tests:')
    for test_case, your_answer, answer in wrong_answers:
        print("On input: " + str(list(test_case)) + ", your result: " + str(your_answer) + ", expected answer: " + str(answer))"""

