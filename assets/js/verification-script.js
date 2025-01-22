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
                <p>${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}, signed: ${post.signedHash}</p>
                <div class="actions">
                    <!-- Verify Button -->
                    <button 
                        class="verify-btn" 
                        data-user-id="${post.sender}" 
                        data-post-sig="${post.signedHash}" 
                        data-user-pubkey="${post.publicKey}">
                        Verify Post
                    </button>
                    
                    <!-- Block Inclusion Dropdown -->
                    <select class="block-dropdown"  data-user-id="${post.sender}" data-post-sig="${post.signedHash}">
						<option value="" disabled selected>Select One</option>
                        <option value="include">Include in Block</option>
                        <option value="exclude">Do Not Include in Block</option>
                    </select>
                    <pre id="verification-text" class="output-box">Waiting to be verified...</pre>
                </div>
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

                // Decrypt the signature (verify the signature)
                const decryptedSignature = modPow(BigInt(sigId), BigInt(65537), BigInt(userKey));

                // Redo hash of the transaction to compare with decrypted signature
                const hashInput = `${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}`;
                const hash = await generateHash(hashInput);

                // Convert hash from hex to BigInt
                const hashBigInt = BigInt('0x' + hash);

                // Compare the decrypted signature with the hash
                if (decryptedSignature === hashBigInt) {
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


loadPostsToVerify();