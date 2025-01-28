let N = null;
let d = null;
let userId = null;
let signature = null;
let datetime = null;

const form = document.getElementById('postForm');


// Modular exponentiation (a^b % c) using BigInt
function modPow(a, b, c) {
    let result = 1n;
    a = a % c;
    while (b > 0n) {
        if (b % 2n === 1n) result = (result * a) % c;
        b = b / 2n;
        a = (a * a) % c;
    }
    return result;
}

// File upload handler: Parse userId, N, and d from the uploaded file
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            const rows = content.split('\n').map(row => row.trim()); // Split by new line and trim extra spaces
            const parsedVariables = {};

            // Parse the file content to extract variables
            rows.forEach(row => {
                if (row.includes('=')) {
                    const [key, value] = row.split('=').map(part => part.trim());
                    if (key && value) {
                        // Use BigInt only for N and d
                        parsedVariables[key] = (key === 'N' || key === 'd') ? BigInt(value) : value;
                    }
                }
            });

            // Validate and assign N, d, and userId
            if (parsedVariables['N'] && parsedVariables['d'] && parsedVariables['userId']) {
                N = parsedVariables['N'];
                d = parsedVariables['d'];
                userId = parsedVariables['userId'];
                alert("User ID, N, and d successfully loaded.");
            } else {
                alert("The uploaded file is invalid. Please ensure it contains 'N', 'd', and 'userId' in the correct format.");
            }
        };

        reader.readAsText(file);
    } else {
        alert('Please upload a valid .txt file.');
    }
});


// Function to generate and display the transaction string when the button is clicked
async function generateTransaction() {
    // Check if N and d are loaded
    if (!N || !d || !userId) {
        alert("Please upload the file with User ID, N, and d before generating the transaction.");
        return;
    }

    // Get values from input fields
    const sender = userId.toString();
	datetime = new Date().toISOString();
    const receiver = document.getElementById('receiver').value;
    const amount = document.getElementById('amount').value;
    const comment = document.getElementById('comment').value;

    // Validate inputs
    if (!sender || !receiver || !amount || !comment) {
        alert("All fields are required!");
        return;
    }

    // Concatenate values to create the input string for hashing
    const hashInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;

    // Generate a hash of the concatenated values (using SHA-256)
    const hash = await generateHash(hashInput);

    // Convert the hash to a BigInt (needed for RSA signing)
    const hashBigInt = BigInt('0x' + hash);

    // Sign the hash using RSA private key (modular exponentiation)
    signature = modPow(hashBigInt, BigInt(d), BigInt(N));
	console.log(signature);
	checkSig = modPow(signature, BigInt(65537), BigInt(N));
	console.log(checkSig);
	console.log(checkSig === hashBigInt);

    // Create the transaction sentence
    const transactionSentence = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}, signed: ${signature}`;

    // Display the result
    document.getElementById('resultText').innerText = transactionSentence;
	
	// troubleshooting:
	console.log(`N: ${N}`);
	console.log(`d: ${d}`);
	console.log(`hashBigInt: 0x${hashBigInt.toString(16)}`);
	console.log(`Signature: ${signature}`);
	console.log(`CheckSig: ${checkSig}`);
	console.log(`Hash Hex: ${hash}`);
	console.log(`CheckSig Hex: 0x${checkSig.toString(16)}`);
	
	
}

// Function to generate a SHA-256 hash of a string
async function generateHash(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // Use the Web Cryptography API to generate a SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the ArrayBuffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

// Function to copy the transaction text to clipboard
function copyToClipboard() {
    const resultText = document.getElementById('resultText').innerText;
    const textArea = document.createElement('textarea');
    textArea.value = resultText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // Optionally, you can show an alert to notify the user that the text was copied
    alert("Transaction text copied to clipboard!");
}




const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL

// Function to submit a new transaction
async function submitTransaction() {
    // Get values from the input fields
    const sender = userId.toString();
    const receiver = document.getElementById('receiver').value.trim();
    const amount = document.getElementById('amount').value.trim();
    const comment = document.getElementById('comment').value.trim();
    const time = datetime; // Get time of transaction
    const signedHash = signature.toString();
    const publicKey = N.toString();

    // Validate the inputs
    if (!sender || !receiver || !amount || !comment || !signedHash || !publicKey) {
        alert("All fields are required!");
        return;
    }

    // Create the transaction payload
    const transactionPayload = {
        sender,
        receiver,
        amount: parseFloat(amount), // Convert amount to a number
        comment,
        time,
        signedHash,
        publicKey
    };

    try {
        // Send POST request to the backend
        const response = await fetch(`${herokuBackendUrl}add-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionPayload),
        });

        // Handle the response
        if (response.ok) {
            const responseData = await response.json();
            alert(`Transaction submitted successfully! Transaction ID: ${responseData.transaction._id}`);
        } else {
            const errorData = await response.json();
            alert(`Error submitting transaction: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error submitting transaction:', error);
        alert(`An error occurred: ${error.message}`);
    }
}

// Event listener for the "Submit Transaction" button
// Add an event listener to the "Submit Transaction" button
document.getElementById('submitTransactionButton').addEventListener('click', submitTransaction);


// Function to fetch and display all transactions
async function fetchAndDisplayTransactions() {
    try {
        // Fetch all transactions from the backend
        const response = await fetch(`${herokuBackendUrl}get-transactions`);

        // Check if the response is okay
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error fetching transactions: ${errorData.error}`);
        }

        // Parse the response JSON
        const transactions = await response.json();


        // Check if transactions exist
        if (!transactions || transactions.length === 0) {
            document.getElementById('transactionsContainer').innerHTML = '<p>No transactions found.</p>';
            return;
        }

        // Parse and format transactions
        const transactionSentences = transactions.map(tx => {
            return `${tx.sender} sends ${tx.amount} Choucoin to ${tx.receiver} for ${tx.comment} on ${tx.datetime}`;
        });

        // Display the transactions in a container
        const transactionsContainer = document.getElementById('transactionsContainer');
        transactionsContainer.innerHTML = ''; // Clear the container
        transactionSentences.forEach(sentence => {
            const p = document.createElement('p');
            p.textContent = sentence;
            transactionsContainer.appendChild(p);
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        document.getElementById('transactionsContainer').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Call the function on page load
fetchAndDisplayTransactions();



