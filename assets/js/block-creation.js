let N = null;
let d = null;
let userId = null;
let signature = null;

const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL

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

// generate bonus transaction of given value and type of bonus
function bonusTransaction(userId = userId, d = d, value, type) {
	if (!userId || !d || !value || !type) {
		alert('missing variables detected');
		} else {
		const sender = 'MINT';
		const receiver = userId;
		const amount = value;
		const comment = `bonus {$type}`;
		const datetime = new Date().toISOString().slice(0,19);
		// Concatenate values to create the input string for hashing
		const messageInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;
		console.log(messageInput);
		// Sign the message
		signature = signMessage(messageInput, d, N);
		console.log("Generated Signature:", signature);
		const publicKey = N.toString();
		}
		
    const transactionPayload = {
        sender,
        receiver,
        amount: parseFloat(amount), // Convert amount to a number
        comment,
        datetime,
        signedHash,
        publicKey
    };
	return transactionPayload
}

// Function to create json data of block based on selected transactions, uploaded ID, selected previous block hash
function createBlock(verifieredBy = []) {
	let block = {
		  publisherName: "",
		  publisherKey: "",
		  transactions: [],
		  previousBlockHash: "",
		  timeOfCreation: "",
		  signedBlockHash: "",
		  blockVerifiers: [
			{
			  verifierId: "",
			  verifierKey: "",
			  verifierSignature: ""
			}
		  ]
		};
		
	// add bonus transaction value 2
	selectedPosts.push(bonusTransaction(userId, d, 2, 'block publishing'));
	block.publisherName = userId;
	block.publisherKey = N;
	block.transactions = selectedPosts;
	block.previousBlockHash = selectedHash; // need to write html and js to read this from a textbox
	block.blockVerifiers = verifiedBy; // able to include or update who has verified block
	const hashInput = JSON.stringify(block); // hash will contain everything prior to the new signature.
	block.signedBlockHash = generateHash(hashInput);
	return block
}

async function submitBlock(block) {
    try {
        // Send POST request to the backend
        const response = await fetch(`${herokuBackendUrl}submit-block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(block),
        });

        // Handle the response
        if (response.ok) {
            const responseData = await response.json();
            alert(`Block submitted successfully! Block ID: ${responseData.message._id}`);
        } else {
            const errorData = await response.json();
            alert(`Error submitting block: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error submitting block:', error);
        alert(`An error occurred: ${error.message}`);
    }
}
		
		

function addBlockToTable() {
	const input = createBlock();
	try {
		const block = JSON.parse(input);

		const row = document.createElement('tr');

		// Time Submitted
		const timeCell = document.createElement('td');
		timeCell.textContent = block.timeOfCreation;
		row.appendChild(timeCell);

		// Signed Block Hash
		const hashCell = document.createElement('td');
		hashCell.textContent = block.signedBlockHash;
		row.appendChild(hashCell);

		// Publisher Name
		const publisherCell = document.createElement('td');
		publisherCell.textContent = block.publisherName;
		row.appendChild(publisherCell);

		// Transactions (hover-over link)
		const transactionsCell = document.createElement('td');
		const tooltip = document.createElement('div');
		tooltip.className = 'tooltip';
		tooltip.textContent = 'View Transactions';
		const tooltipText = document.createElement('div');
		tooltipText.className = 'tooltiptext';
		tooltipText.textContent = block.transactions.join(', ');
		tooltip.appendChild(tooltipText);
		transactionsCell.appendChild(tooltip);
		row.appendChild(transactionsCell);

		// Previous Block Hash
		const previousHashCell = document.createElement('td');
		previousHashCell.textContent = block.previousBlockHash;
		row.appendChild(previousHashCell);

		// Verifier IDs
		const verifiersCell = document.createElement('td');
		verifiersCell.textContent = block.blockVerifiers.map(v => v.verifierId).join(', ');
		row.appendChild(verifiersCell);

		document.querySelector('#transactionsTable tbody').appendChild(row);
	} catch (error) {
		alert('Invalid JSON input. Please try again.');
	}
}























































// get public key based on userID
async function fetchUserPublicKey(userId) {
    try {
        const response = await fetch(`${herokuBackendUrl}fetch-block/${userId}`);
		console.log("Fetching public key from URL:", url);  // Debug the URL
        
        if (!response.ok) {
            throw new Error(`Failed to fetch public key: ${response.status}`);
        }

        const data = await response.json();
        
        // Assuming the response contains the public key in 'N' field (as a string or BigInt)
        const publicKey = data.N;

        if (publicKey) {
            console.log('User Public Key:', publicKey);
            return BigInt(publicKey); // Ensure it's returned as BigInt for modulus operation
        } else {
            console.error('No public key found for the user');
        }
    } catch (error) {
        console.error('Error fetching user public key:', error);
    }
}
