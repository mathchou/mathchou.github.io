let N = null;
let d = null;
let userId = null;
let signature = null;
let transactionTime = null;

const form = document.getElementById('postForm');

const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL



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

// Function to parse the transaction string
function parseTransaction(transactionText) {
    const regex = /^(\w+) sends (\d+) Choucoin to (\w+) for ([^ on]+) on (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}), signed: (\d+)$/;
    const match = transactionText.match(regex);
    
    if (!match) {
        throw new Error("Transaction format is invalid.");
    }

    return {
        sender: match[1],
        amount: match[2],
        receiver: match[3],
        comment: match[4],
        datetime: match[5],
        signature: BigInt(match[6]),
    };
}


// 