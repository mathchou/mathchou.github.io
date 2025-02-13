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

        const weekStart = getTuesdayMidnight(postDate).getTime();
        if (!weeks.has(weekStart)) {
            weeks.set(weekStart, []);
        }
        weeks.get(weekStart).push(post);
    });

    // Convert Map to sorted array (newest weeks first)
    return Array.from(weeks.entries())
        .sort((a, b) => b[0] - a[0])
        .map(entry => entry[1]);
}

// Function to display posts of the current page
function displayPosts(page) {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';

    if (groupedPosts.length === 0 || !groupedPosts[page]) {
        postsContainer.innerHTML = '<p>No posts found.</p>';
        return;
    }

    console.log(`Displaying posts for page ${page}:`, groupedPosts[page]);

    groupedPosts[page].forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post-item');

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
                        <pre class="output-box">Waiting to be verified...</pre>
                    </td>
                    <!-- Column for the message with scrolling enabled -->
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
            prevButton.textContent = 'Previous Week';
            prevButton.onclick = () => {
                currentPage--;
                displayPosts(currentPage);
            };
            paginationContainer.appendChild(prevButton);
        }

        if (currentPage < groupedPosts.length - 1) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next Week';
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
