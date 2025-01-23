const N = null;
const d = null;
const userId = null;
const selectedPosts = [];

const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL

// File upload handler: Parse N and d from the uploaded file
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const rows = content.split('\n').map(row => row.trim());  // Split by new line and trim extra spaces
            let parsedVariables = {};

            // Parse the file content to extract N and d
            rows.forEach(row => {
                // Check if row contains an '=' sign
                if (row.includes('=')) {
                    const parts = row.split('=');
                    const variableName = parts[0].trim();
                    const variableValue = BigInt(parts[1].trim()); // Convert value to BigInt

                    // Store N and d values
                    parsedVariables[variableName] = variableValue;
                }
            });

            // Extract N and d from the parsed variables
            N = parsedVariables['N'];
            d = parsedVariables['d'];
			userId = parsedVariables['userId'];

            if (!N || !d || !userId) {
                alert("Please upload a valid file with N, d, and userId.");
                return;
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

// generate bonus transaction of given value and type of bonus
function bonusTransaction(userId = userId, d = d, value, type) {
	if (!userId || !d || !value || !type) {
		alert('missing variables detected');
		} else {
		const sender = 'MINT';
		const receiver = userId;
		const amount = value;
		const comment = `bonus {$type}`;
		const datetime = new DatE().toISOString();
		
		const hashInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;
		const signedHash = await generateHash(hashInput);
		const publicKey = N.toString();
		
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
	
	block.publisherName = userID;
	block.publisherKey = N;
	block.transactions = selectedPosts;
	block.previousBlockHash = selectedHash; // need to write html and js to read this from a textbox
	block.blockVerifiers = verifiedBy; // able to include or update who has verified block
	const hashInput = JSON.stringify(block); // hash will contain everything prior to the new signature.
	block.signedBlockHash = generateHash(hashInput);
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
	const input = document.getElementById('blockInput').value;
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