const TEST_QUESTIONS = {1: ["Create a function that given an integer n, calculates factorial. Use recursion.", "def factorial(n):\n"],
                        2: ["Here's the other player's solution to the following question: \"Create a function that given an integer n, calculates factorial\". Modify the solution so that it answers the problem without using recursion.", 
                        `def factorial(n)\:                        if n == 0 or n == 1:
                        return 1
                    else:
                        return n * factorial(n - 1)`]}
                        

                        

const codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
    lineNumbers: true,
    mode: 'python',
    theme: "base16-dark"
});

document.getElementById('twoPlayerSection').style.display = 'none';


document.getElementById('twoPlayers').addEventListener('click', function() {
    document.getElementById('twoPlayerSection').style.display = 'block';
    document.getElementById('session').style.display = 'none';
});

document.getElementById('startSession').addEventListener('click', function() {
    //document.getElementById('startSession').style.display = 'none'; 
    document.getElementById('session').style.display = 'block';
    // fetch('/fetch_problem')
    //     .then(response => response.json())
    //     .then(data => {
    //         document.getElementById('problem').innerText = data.problem;

    //     });
    document.getElementById('problem').innerText = TEST_QUESTIONS[1][0]
    codeMirrorEditor.setValue(TEST_QUESTIONS[1][1])
});

document.getElementById('submitCode').addEventListener('click', function() {
    const submitButton = document.getElementById('submitCode');
    const playerTurn = document.getElementById('playerTurn');
    const result = document.getElementById('result');

    if (submitButton.innerText === 'Submit') {
        submitButton.innerText = 'Next Player';


        // Logic to display compilation status and other details
        const response = {
            "output": "shimi",
            "statusCode": 200,
            "memory": "1024",
            "cpuTime": "0.59",
            "compilationStatus": 0
        };
        
        let compilationStatus = response.compilationStatus == 0 ? "Compiled successfully" : "Failed to compile";
        if (playerTurn.innerText == 'Player 2\'s Turn') {
            result.innerText = `Memory: 874\nCpu Time: 0.42\nCompiled successfully`;
        }else {
        result.innerText = `Memory: ${response.memory}\nCpu Time: ${response.cpuTime}\n${compilationStatus}`;
        }
    } else {
        submitButton.innerText = 'Submit';
        // Clear the result text
        result.innerText = '';
        document.getElementById('problem').innerText = TEST_QUESTIONS[2][0]
        // Toggle player turn
        if (playerTurn.innerText === 'Player 1\'s Turn') {
            playerTurn.innerText = 'Player 2\'s Turn';

        } else {
            playerTurn.innerText = 'Player 1\'s Turn';
        }

    }
    const editor = document.querySelector('.CodeMirror').CodeMirror;
    const code = editor.getValue() + "\n\nprint(factorial(8))";

    const data = {
        clientId: JDOODLE_CLIENT_ID,
        clientSecret: JDOODLE_CLIENT_SECRET,
        script: "print(\"shimi\")",
        stdin: "",
        language: "python3",
        versionIndex: "3",
        compileOnly: false
    };


    // fetch(JDOODLE_API_URL, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Access-Control-Allow-Origin': '*'
    //         },
    //         body: JSON.stringify(data)
    //     })
    // .then(response => response.json())
    //     .then(data => {
    //         console.log('Success:', data);
    //     })

    // const response = {
    //     "output": "shimi",
    //     "statusCode": 200,
    //     "memory": "1024",
    //     "cpuTime": "0.01",
    //     "compilationStatus": 0
    // }

    // let compilationStatus = response.compilationStatus == 0 ? "Compiled successfully" : "Failed to compile"

    // document.getElementById('result').innerText = `Memory: ${response.memory}\nCpu Time: ${response.cpuTime}\n${compilationStatus}`;
    





    // fetch('/submit_code', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ code: code, language: 'python3' })
    // })
    // .then(response => response.json())
    // .then(data => {
    //     document.getElementById('result').innerText = data.output;
    // });
});
