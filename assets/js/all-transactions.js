const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';

let N = null
let d = null
let userId = null
let selectedPosts = [];
let selectedHash = null;



// Helper verification functions


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















// Functions to display paginated transactions by week


let weekRanges = []; // Array to store the week ranges
let allPosts = [];
let groupedPosts = [];
let currentPage = 0;

async function loadPostsToVerify() {
    try {
        const response = await fetch(`${herokuBackendUrl}get-transactions`);
        if (!response.ok) {
            throw new Error(`Failed to fetch transactions: ${response.status}`);
        }

        allPosts = await response.json();
        console.log("Fetched Posts:", allPosts);

        // Sort posts by date (newest first)
        allPosts.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        console.log("Sorted Posts:", allPosts);

        // Group posts by week (starting Tuesday 12 AM)
        groupedPosts = groupPostsByWeek(allPosts);
        console.log("Grouped Posts:", groupedPosts);

        // Display the first page (most recent week)
        displayPosts(currentPage);
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}


// Helper function to get the start of the week (Tuesday)
function getStartOfWeek(date) {
    const dayOfWeek = date.getDay();
    const diffToTuesday = (dayOfWeek >= 2 ? dayOfWeek - 2 : 7 - (2 - dayOfWeek));
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - diffToTuesday);
    weekStart.setHours(0, 0, 0, 0); // Set to 12:00 AM
    return weekStart;
}

// Function to get the Tuesday 12 AM of a given date
function getTuesdayMidnight(date) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysSinceTuesday = (dayOfWeek + 6) % 7; // Distance from Tuesday
    const tuesdayMidnight = new Date(date);
    tuesdayMidnight.setDate(date.getDate() - daysSinceTuesday);
    tuesdayMidnight.setHours(0, 0, 0, 0);
    return tuesdayMidnight;
}

// Function to group posts by the week they belong to
function groupPostsByWeek(posts) {
    const weeks = new Map();

    posts.forEach(post => {
        const postDate = new Date(post.datetime);
        if (isNaN(postDate)) {
            console.error("Invalid Date Found:", post);
            return;
        }
		
        const weekStart = getStartOfWeek(postDate);
        const weekStart_alt = getTuesdayMidnight(postDate).getTime();
        if (!weeks.has(weekStart_alt)) {
            weeks.set(weekStart_alt, []);
            weekRanges.push({ start: weekStart, end: weekStart.getDate() + 6 }); // Add the range			
        }
        weeks.get(weekStart_alt).push(post);
    });

    // Convert Map to sorted array (newest weeks first)
    return Array.from(weeks.entries())
        .sort((a, b) => b[0] - a[0])
        .map(entry => entry[1]);
}


function displayPosts(page) {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';

    if (groupedPosts.length === 0 || !groupedPosts[page]) {
        postsContainer.innerHTML = '<p>No posts found.</p>';
        return;
    }

    // Get start and end dates for the current week
    const weekStart = new Date(weekRanges[page]['start']);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of the week

    // Format dates as readable strings (e.g., "Feb 6, 2024")
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const weekStartStr = weekStart.toLocaleDateString(weekRanges[page]['start'], options);
    const weekEndStr = weekEnd.toLocaleDateString(weekRanges[page]['end'], options);

    // Add a header displaying the date range
    const header = document.createElement('h3');
    header.textContent = `Showing posts from week of ${weekStartStr} - ${weekEndStr}`;
    postsContainer.appendChild(header);

    console.log(`Displaying posts for page ${page} (${weekStartStr} - ${weekEndStr}):`, groupedPosts[page]);

    groupedPosts[page].forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post-item');

        postDiv.innerHTML = `
            <table style="width: 100%;">
                <tr>
                    <td style="border: 1px solid #ddd; padding: 5px; width: 90%; text-align: center; display: flex; align-items: center; gap: 5px;">
                        <button 
                            class="verify-btn" 
                            data-user-id="${post.sender}" 
                            data-post-sig="${post.signedHash}" 
                            data-user-pubkey="${post.publicKey}"
                            data-message="${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime.slice(0,19)}">
                            Verify Post
                        </button>
                        <pre class="output-box">Waiting to be verified...</pre>
                    </td>
                    <td style="border: 1px solid #ddd; padding: 5px; max-width: 300px; white-space: nowrap; overflow-x: auto;">
                        ${post.sender} sends ${post.amount} Choucoin to ${post.receiver} for ${post.comment} on ${post.datetime}, signed: ${post.signedHash}
                    </td>
                </tr>
            </table>
        `;

        postsContainer.appendChild(postDiv);

        // Add event listener for the verify button
        const verifyButton = postDiv.querySelector('.verify-btn');
        const verificationText = postDiv.querySelector('.output-box');

        verifyButton.addEventListener('click', async (event) => {
            event.preventDefault();

            const userId = verifyButton.getAttribute('data-user-id');
            const sigId = verifyButton.getAttribute('data-post-sig');
            const userKey = verifyButton.getAttribute('data-user-pubkey');
            const message = verifyButton.getAttribute('data-message');

            // Verify signature
            const valid = await verifySignature(message, BigInt(sigId), BigInt(65537), BigInt(userKey));

            if (valid) {
                verificationText.textContent = `Post verified successfully.`;
            } else {
                verificationText.textContent = `Failed to verify the post.`;
            }
        });
    });

    displayPaginationControls();
}

// Function to create pagination controls
function displayPaginationControls() {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = '';

    console.log("Pagination State:", { currentPage, totalPages: groupedPosts.length });

    if (groupedPosts.length > 1) {
        if (currentPage > 0) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Next Week';
            prevButton.onclick = () => {
                currentPage--;
                displayPosts(currentPage);
            };
            paginationContainer.appendChild(prevButton);
        }

        if (currentPage < groupedPosts.length - 1) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Previous Week';
            nextButton.onclick = () => {
                currentPage++;
                displayPosts(currentPage);
            };
            paginationContainer.appendChild(nextButton);
        }
    }
}

// Call function to fetch and display posts after the DOM is loaded
document.addEventListener('DOMContentLoaded', loadPostsToVerify);
