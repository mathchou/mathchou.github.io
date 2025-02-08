const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';

let N = null
let d = null
let userId = null
let selectedPosts = [];
let selectedHash = null;


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
async function modPow(a, b, c) {
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

// Convert a byte array to a BigInt (hex string)
function byteArrayToBigInt(byteArray) {
    return BigInt('0x' + Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join(''));
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
    const signature = await modPow(paddedMessageBigInt, BigInt(d), BigInt(N));
	console.log("generated signature:", signature);

    return signature;
}



async function fetchSingleUserFromBackend() {
    try {
        const response = await fetch(`${herokuBackendUrl}get-users`);
        if (response.ok) {
            return await response.json(); // Return the user data
        } else {
            console.error('Failed to fetch users:', await response.text());
            return [];
        }
    } catch (err) {
        console.error('Error fetching users:', err);
        return [];
    }
}

async function loadPostsToVerifyIncludeDropdown() {
    try {
        const response = await fetch(`${herokuBackendUrl}get-transactions`);
        if (!response.ok) {
            throw new Error(`Failed to fetch transactions: ${response.status}`);
        }

        const transactions = await response.json();
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = ''; // Clear existing posts

        transactions.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.classList.add('post-item');
            console.log('signature:', post.signedHash);

            // Create the HTML structure for each post
			postDiv.innerHTML = `
				<table style="width: 100%;">
					<tr>
						<!-- Column for the verify button -->
						<td style="border: 1px solid #ddd; padding: 5px; width: 90%; text-align: center; display: flex; align-items: center; gap: 5px;">
							<button 
								class="verify-btn" 
								data-user-id="${post.sender}" 
								data-post-sig="${post.signedHash}" 
								data-user-pubkey="${post.publicKey}"
								data-message="${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime.slice(0,19)}">
								Verify Post
							</button>
							<!-- Block Inclusion Dropdown -->
							<select class="block-dropdown"  data-user-id="${post.sender}" data-post-sig="${post.signedHash}">
								<option value="" disabled selected>Select One</option>
								<option value="include">Include in Block</option>
								<option value="exclude">Do Not Include in Block</option>
							</select>
							<pre id="verification-text" class="output-box">Waiting to be verified...</pre>
						</td>
						<!-- Column for the message with scrolling enabled -->
						<td style="border: 1px solid #ddd; padding: 5px; max-width: 300px; white-space: nowrap; overflow-x: auto;">
							${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}, signed: ${post.signedHash}
						</td>
					</tr>
				</table>
			`;

            // Append the post to the container
            postsContainer.appendChild(postDiv);

            // Add event listener for the verify button
            const verifyButton = postDiv.querySelector('.verify-btn');
            const verificationText = postDiv.querySelector('#verification-text'); // Get the <pre> element

            verifyButton.addEventListener('click', async () => {
				// Prevent page reload (in case it's inside a form)
				event.preventDefault();  // This will prevent the default button behavior (form submission)

                const userId = verifyButton.getAttribute('data-user-id');
                const sigId = verifyButton.getAttribute('data-post-sig');
                const userKey = verifyButton.getAttribute('data-user-pubkey');
				const message = verifyButton.getAttribute('data-message');

				// Verify signature
				const valid = await verifySignature(message, BigInt(sigId), BigInt(65537), BigInt(userKey)); 

                // Compare the decrypted signature with the hash
                if (valid) {
                    // Update the <pre> element with success message
                    verificationText.textContent = `Post verified successfully.`;
                } else {
                    // Update the <pre> element with failure message
                    verificationText.textContent = `Failed to verify the post.`;
                }
            });

            console.log('Verify Button:', verifyButton);
			
			// Add event listener for the block inclusion dropdown
            const blockDropdown = postDiv.querySelector('.block-dropdown');
            blockDropdown.addEventListener('change', () => {
                const action = blockDropdown.value;

                if (action === 'include') {
                    // Add the transaction to the selectedPosts array if not already included
                    if (!selectedPosts.some(p => p._id === post._id)) {
                        selectedPosts.push(post);
                    }
                } else if (action === 'exclude') {
                    // Remove the transaction from the selectedPosts array
                    selectedPosts = selectedPosts.filter(p => p._id !== post._id);
                }

                // Sort selectedPosts by datetime (most recent to least recent)
                selectedPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                console.log('Selected Posts (sorted):', selectedPosts);
            });
        });
    } catch (error) {
        console.error('Error loading posts:', error);
    }
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
    const decryptedMessageHashBigInt = await modPow(signature, BigInt(e), BigInt(N));
	console.log("Public verification of signature:", decryptedMessageHashBigInt);

	// Step 4: compare decryptedMessageHashBigInt to the paddedMessageBigInt
	
    return decryptedMessageHashBigInt === paddedMessageBigInt;
}


async function loadPostsToVerify() {
    try {
        const response = await fetch(`${herokuBackendUrl}get-transactions`);
        if (!response.ok) {
            throw new Error(`Failed to fetch transactions: ${response.status}`);
        }

        const transactions = await response.json();
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = ''; // Clear existing posts

        transactions.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.classList.add('post-item');
            console.log('signature:', post.signedHash);

            // Create the HTML structure for each post
			postDiv.innerHTML = `
				<table style="width: 100%;">
					<tr>
						<!-- Column for the verify button -->
						<td style="border: 1px solid #ddd; padding: 5px; width: 90%; text-align: center; display: flex; align-items: center; gap: 5px;">
							<button 
								class="verify-btn" 
								data-user-id="${post.sender}" 
								data-post-sig="${post.signedHash}" 
								data-user-pubkey="${post.publicKey}"
								data-message="${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime.slice(0,19)}">
								Verify Post
							</button>
							<pre id="verification-text" class="output-box">Waiting to be verified...</pre>
						</td>
						<!-- Column for the message with scrolling enabled -->
						<td style="border: 1px solid #ddd; padding: 5px; max-width: 300px; white-space: nowrap; overflow-x: auto;">
							${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}, signed: ${post.signedHash}
						</td>
					</tr>
				</table>
			`;

            // Append the post to the container
            postsContainer.appendChild(postDiv);

            // Add event listener for the verify button
            const verifyButton = postDiv.querySelector('.verify-btn');
            const verificationText = postDiv.querySelector('#verification-text'); // Get the <pre> element

            verifyButton.addEventListener('click', async () => {
				// Prevent page reload (in case it's inside a form)
				event.preventDefault();  // This will prevent the default button behavior (form submission)

                const userId = verifyButton.getAttribute('data-user-id');
                const sigId = verifyButton.getAttribute('data-post-sig');
                const userKey = verifyButton.getAttribute('data-user-pubkey');
				const message = verifyButton.getAttribute('data-message');

				// Verify signature
				const valid = await verifySignature(message, BigInt(sigId), BigInt(65537), BigInt(userKey)); 

                // Compare the decrypted signature with the hash
                if (valid) {
                    // Update the <pre> element with success message
                    verificationText.textContent = `Post verified successfully.`;
                } else {
                    // Update the <pre> element with failure message
                    verificationText.textContent = `Failed to verify the post.`;
                }
            });

            console.log('Verify Button:', verifyButton);

            console.log('Verify Button:', verifyButton);
            
        });
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

async function fetchUserPublicKey(userID) {
    try {
        const response = await fetch(`${herokuBackendUrl}fetch-block/${userID}`);
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
async function bonusTransaction(userId = userId, d = d, value, type) {
	if (!userId || !d || !value || !type) {
		alert('missing variables detected');
		return null;
	}
		
	const sender = "MINT";
	const receiver = userId;
	const amount = value;
	const comment = `bonus ${type}`;
	const datetime = new Date().toISOString().slice(0,19);
	// Concatenate values to create the input string for hashing
	const messageInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;
	console.log(messageInput);
	// Sign the message
    const signature = (await signMessage(messageInput, d, N)).toString();  // Add 'await'	console.log("Generated Signature:", signature);
	const publicKey = N.toString();
		
    const transactionPayload = {
        sender: sender,
        publicKey: publicKey,
        receiver: receiver,
        amount: parseFloat(amount), // Convert amount to a number
        comment: comment,
        datetime: datetime,
        signedHash: signature,
    };
	return transactionPayload
}

// Function to create json data of block based on selected transactions, uploaded ID, selected previous block hash
async function createBlock(verifiedBy = []) {
	let block = {
        publisherName: userId,
        publisherKey: N.toString(), // Ensure public key is serialized as a string
        transactions: selectedPosts,
        previousBlockHash: selectedHash || "000", // Fallback to 000 string if not provided
        timeOfCreation: new Date().toISOString().slice(0, 19), // Add the creation time
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
	let bonus = await bonusTransaction(userId, d, 2, "block creation");
	selectedPosts.push(bonus);
	block.publisherName = userId;
	block.publisherKey = N.toString();
	block.transactions = selectedPosts;
	block.previousBlockHash = selectedHash || "000"; // need to write html and js to read this from a textbox
	block.blockVerifiers = verifiedBy; // able to include or update who has verified block
	const hashInput = JSON.stringify(block); // hash will contain everything prior to the new signature.
	block.signedBlockHash = (await signMessage(hashInput, d, N)).toString();
	document.getElementById('blockInput').value = JSON.stringify(block)
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
            body: block,
        });

        // Handle the response
        if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
                alert(`Block submitted successfully! Block ID: ${responseData.blockId}`);
            } else {
                alert(`Error: ${responseData.message}`);
            }
		} else {
            const errorData = await response.json();
            alert(`Error submitting block: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error submitting block:', error);
        alert(`An error occurred: ${error.message}`);
    }
}
		
		

document.addEventListener('DOMContentLoaded', () => {
    fetch(`${herokuBackendUrl}api/recent-blocks?limit=5`)
        .then(response => response.json())
        .then(blocks => {
            const tableBody = document.querySelector('#blocksTable tbody');

            blocks.forEach(block => {
                const row = document.createElement('tr');

                // Time Submitted (Formatted)
                const timeSubmitted = new Date(block.timeOfCreation).toLocaleString();
                const timeCell = document.createElement('td');
                timeCell.textContent = timeSubmitted;
                row.appendChild(timeCell);

                // Signed Block Hash (First 10 characters + "..." and click to copy full hash)
                const blockHashCell = document.createElement('td');
                const fullHash = block.signedBlockHash || ''; // Full signed block hash
                const shortHash = fullHash.slice(0, 10); // First 10 characters
                const truncatedHash = `${shortHash}...`; // Add "..." at the end

                const blockHashText = document.createElement('span');
                blockHashText.textContent = truncatedHash;
                blockHashText.style.cursor = 'pointer';  // Make it look clickable
                blockHashText.addEventListener('click', () => {
                    // Copy full hash to clipboard when clicked
                    navigator.clipboard.writeText(fullHash).then(() => {
                        alert('Signed block hash copied to clipboard!');
                    }).catch(err => {
                        console.error('Error copying to clipboard:', err);
                    });
                });

                blockHashCell.appendChild(blockHashText);
				
				const blockVerButton = document.createElement("button");
				blockVerButton.textContent = "Verify Creator";
				let blockNoHashOrVerifiers = block // Making block with these attributes removed to check signature
				blockNoHashOrVerifiers.signedBlockHash = ""
				blockNoHashOrVerifiers.blockVerifiers = []
				let blockHashInput = JSON.stringify(blockNoHashOrVerifiers)
				await checkedHash = signedMessage(blockHashInput, 1, block.publisherKey) // Verify signature by getting Hash of empty block, this is done by signing it with exponent "1"
				const verifyBlockHash = 
				
				blockVerButton.setAttribute(
				
				
                row.appendChild(blockHashCell);

                // Publisher Name
                const publisherCell = document.createElement('td');
                publisherCell.textContent = block.publisherName || 'N/A';
                row.appendChild(publisherCell);

                // Transactions (display only sender, amount, receiver)
                const transactionsCell = document.createElement('td');
                const transactions = block.transactions || [];
                transactionsCell.innerHTML = transactions.map(transaction => {
                    return `${transaction.sender} → ${transaction.receiver}: ${transaction.amount} CC`;
                }).join('<br>');
                row.appendChild(transactionsCell);

                // Previous Block Hash (First 10 characters + "..." and click to copy full hash)
                const prevBlockHashCell = document.createElement('td');
                const prevFullHash = block.previousBlockHash || ''; // Full previous block hash
                const prevShortHash = prevFullHash.slice(0, 10); // First 10 characters
                const prevTruncatedHash = `${prevShortHash}...`; // Add "..." at the end

                const prevBlockHashText = document.createElement('span');
                prevBlockHashText.textContent = prevTruncatedHash;
                prevBlockHashText.style.cursor = 'pointer';  // Make it look clickable
                prevBlockHashText.addEventListener('click', () => {
                    // Copy full previous block hash to clipboard when clicked
                    navigator.clipboard.writeText(prevFullHash).then(() => {
                        alert('Previous block hash copied to clipboard!');
                    }).catch(err => {
                        console.error('Error copying to clipboard:', err);
                    });
                });

                prevBlockHashCell.appendChild(prevBlockHashText);
                row.appendChild(prevBlockHashCell);

                // Verifier's ID
                const verifierCell = document.createElement('td');
                verifierCell.textContent = block.verifierId || 'N/A';
                row.appendChild(verifierCell);

                // Append row to table
                tableBody.appendChild(row);
            });
        })
        .catch(err => {
            console.error('Error fetching blocks:', err);
        });
});








