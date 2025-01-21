const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';

let selectedPosts = [];

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

async function verifySignature(transactionText, senderPublicKeyN, senderPublicKeyE) {
    const transactionData = parseTransaction(transactionText);

    // Generate the hash of the input
    const hashInput = `${transactionData.sender} sends ${transactionData.amount} Choucoin to ${transactionData.receiver} for ${transactionData.comment} on ${transactionData.datetime}`;
    const hash = await generateHash(hashInput);

    // Convert the hash to a BigInt for modular exponentiation
    const hashBigInt = BigInt('0x' + hash);

    // Decrypt the signature (verify the signature) using the sender's public key (N, e)
    const decryptedSignature = modPow(transactionData.signature, senderPublicKeyE, senderPublicKeyN);

    // Check if the decrypted signature matches the hash
    if (decryptedSignature === hashBigInt) {
        console.log("Signature is valid.");
        return true;
    } else {
        console.log("Signature is invalid.");
        return false;
    }
}


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

// Function to fetch the user's public key based on their userID
async function fetchUserPublicKey(userID) {
    try {
        const response = await fetch(`${url}save-user-data/:${userID}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch public key: ${response.status}`);
        }

        const data = await response.json();
        
        // Assuming the response contains the public key in 'N' field
        const publicKey = data.N;

        if (publicKey) {
            console.log('User Public Key:', N);
            return N;
        } else {
            console.error('No public key found for the user');
        }

    } catch (error) {
        console.error('Error fetching user public key:', error);
    }
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



// Function to load and display posts with verification and block inclusion
async function loadPostsToVerify() {
	try {
		const response = await fetch(`${url}posts`);
		if (!response.ok) {
			throw new Error(`Failed to fetch posts: ${response.status}`);
		}

		const posts = await response.json();
		const postsContainer = document.getElementById('postsContainer');
		postsContainer.innerHTML = ''; // Clear existing posts

		posts.forEach(post => {
			const postDiv = document.createElement('div');
			const post_info = parseTransaction(post.content);
			postDiv.classList.add('post-item');

			// Create the HTML structure for each post
			postDiv.innerHTML = `
				<p>${post.content}</p>
				<small>Posted on ${new Date(post.timestamp).toLocaleString()}</small>
				
				<div class="actions">
					<!-- Verify Button -->
					<button class="verify-btn" data-user-id="${post_info.sender}" data-post-sig="${post_info.signature}">
						Verify Post
					</button>
					
					<!-- Block Inclusion Dropdown -->
					<select class="block-dropdown"  data-user-id="${post_info.sender}" data-post-sig="${post_info.signature}">
						<option value="include">Include in Block</option>
						<option value="exclude">Do Not Include in Block</option>
					</select>
				</div>
			`;

			// Append the post to the container
			postsContainer.appendChild(postDiv);

			// Add event listener for the verify button
			const verifyButton = postDiv.querySelector('.verify-btn');
			verifyButton.addEventListener('click', async () => {
				const userId = verifyButton.getAttribute('data-user-id');
				const sigId = verifyButton.getAttribute('data-post-sig');
				const userKey = fetchUserPublicKey(userId)
				
				// unsign hash from user
				const undoHash = modPow(sigID, 65537, userKey)
				
				// redo hash of transaction
				const hashInput = `${post_info.sender} sends ${post_info.amount} Choucoin to ${post_info.receiver} for ${post_info.comment} on ${post_info.datetime}`;
				const hash = await generateHash(hashInput);

				if (undoHash == hash) {
					alert('Post verified successfully');
				} else {
					alert('Failed to verify the post');
				}
			});
			
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