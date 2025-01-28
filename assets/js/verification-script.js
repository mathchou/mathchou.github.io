const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';

let selectedPosts = [];


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
								data-message="${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}">
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
				const valid = verifySignature(message, BigInt(sigId), BigInt(65537), BigInt(userKey)); 

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
    const decryptedMessageHashBigInt = modPow(signature, BigInt(e), BigInt(N));
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
								data-message="${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}">
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
				const valid = verifySignature(message, BigInt(sigId), BigInt(65537), BigInt(userKey)); 

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
