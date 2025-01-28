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

// SHA-256 implementation (using Web Crypto API in the browser)
async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return hashArray;
}



// Convert a byte array to a BigInt (hex string)
function byteArrayToBigInt(byteArray) {
    return BigInt('0x' + Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join(''));
}

// PKCS#1 v1.5 padding function
function pkcs1v15Padding(hash) {
    const blockType = 0x01;  // Type 1 for private key encryption padding
    const emLength = 64;  // Length of the message block (assuming 512-bit RSA)
    
    // Padding starts with 0x00 0x01 and followed by random padding 0xFF, then the hash
    const padding = new Array(emLength - 3 - hash.length).fill(0xFF);
    const paddedMessage = [0x00, blockType, ...padding, 0x00, ...hash];
    
    return new Uint8Array(paddedMessage);
}

// Helper function to convert a hex string to a byte array
function hexStringToByteArray(hexString) {
    const byteArray = [];
    for (let i = 0; i < hexString.length; i += 2) {
        byteArray.push(parseInt(hexString.substr(i, 2), 16));
    }
    return byteArray;
}

// PKCS#1 v1.5 unpadding function
function pkcs1v15Unpadding(paddedMessage) {
    // Ensure the message starts with 0x00 0x01, followed by padding of 0xFF, and the actual message hash
    if (paddedMessage[0] !== 0x00 || paddedMessage[1] !== 0x01) {
        throw new Error("Invalid padding in the signature.");
    }

    // Find the padding boundary (i.e., the first 0x00 byte after 0x01 0xFF padding)
    let paddingStartIndex = 2;  // Skip 0x00 0x01
    while (paddedMessage[paddingStartIndex] === 0xFF) {
        paddingStartIndex++;
    }

    // The actual message hash starts after the padding and the final 0x00 byte
    if (paddedMessage[paddingStartIndex] !== 0x00) {
        throw new Error("Invalid padding in the signature.");
    }

    // Extract the actual hash (the message hash after padding)
    return paddedMessage.slice(paddingStartIndex + 1);
}

// Function to sign a message using the private key (d, n)
async function signMessage(message, d, N) {

    // Step 1: Hash the message with SHA-256
    const messageHash = await sha256(message);
	console.log("message hash:", messageHash);

    // Step 2: Apply PKCS#1 v1.5 padding
    const paddedMessage = pkcs1v15Padding(messageHash);
	console.log("padded message:", paddedMessage);
	
    // Step 3: Convert padded message to BigInt
    const paddedMessageBigInt = byteArrayToBigInt(paddedMessage);

    // Step 4: Apply RSA signing: s = m^d mod n
    const signature = modPow(paddedMessageBigInt, BigInt(d), BigInt(N));
	console.log("generated signature:", signature);

    return signature;
}

async function verifySignature(message, signature, e, N) {
    // Step 1: Hash and pad the message with SHA-256 similar to how it was done in signMessage()
    const messageHash = await sha256(message);
    const paddedMessage = pkcs1v15Padding(messageHash);
    const paddedMessageBigInt = byteArrayToBigInt(paddedMessage);
	console.log("padded message Hash as big int:", paddedMessageBigInt);

    // Step 2: Check if the signature is valid before converting to BigInt
    if (!signature) {
        console.error("Signature is null or undefined");
        return false;
    }

    console.log("Signature:", signature);

    // Step 3: Apply RSA verification: s^e mod n
    const decryptedMessageHashBigInt = modPow(signature, BigInt(e), BigInt(N));
	console.log("Public verification of signature:", decryptedMessageHashBigInt);

	// Step 4: compare decryptedMessageHashBigInt to the paddedMessageBigInt
	
    return decryptedMessageHashBigInt === paddedMessageBigInt;
}

// Function to generate and display the transaction string when the button is clicked
async function generateTransaction() {
    // Check if N and d are loaded
    if (!N || !d || !userId) {
        alert("Please upload the file with User ID, N, and d before generating the transaction.");
        return;
    }

    // Get values from input fields
    const sender = userId.toString();
	datetime = new Date().toISOString().slice(0, 19);
    const receiver = document.getElementById('receiver').value;
    const amount = document.getElementById('amount').value;
    const comment = document.getElementById('comment').value;

    // Validate inputs
    if (!sender || !receiver || !amount || !comment) {
        alert("All fields are required!");
        return;
    }

    // Concatenate values to create the input string for hashing
    const messageInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;
	console.log(messageInput);


    // Sign the message
    signature = await signMessage(messageInput, d, N);
    console.log("Generated Signature:", signature);

    // Verify the signature
    checkSig = await verifySignature(messageInput, signature, 65537, N);
    console.log("Verification result:", checkSig);  // This should now return true if everything is correct


    // Create the transaction sentence
    const transactionSentence = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}, signed: ${signature}`;

    // Display the result
    document.getElementById('resultText').innerText = transactionSentence;
		
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



