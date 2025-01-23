
const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL

// Miller-Rabin primality test using BigInt in JavaScript
async function millerRabin(n, k = 5) {
    if (n === 2n || n === 3n) return true;
    if (n < 2n || n % 2n === 0n) return false;

    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r += 1n;
        d /= 2n;
    }

    // Perform k iterations of the test
    for (let i = 0; i < k; i++) {
        const a = await generateRandomBigInt(256); // Random number for the test (256-bit)
        let x = modPow(a, d, n);
        if (x === 1n || x === n - 1n) continue;

        let continueLoop = false;
        for (let j = 0n; j < r - 1n; j++) {
            x = modPow(x, 2n, n);
            if (x === n - 1n) {
                continueLoop = true;
                break;
            }
        }
        if (!continueLoop) return false;
    }
    return true;
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

// Generate a secure random BigInt within a given bit length
async function generateRandomBigInt(bits = 256) {
    const byteLength = Math.ceil(bits / 8); // Convert bits to byte length
    const array = new Uint8Array(byteLength);

    // Use crypto.getRandomValues for secure random byte generation
    window.crypto.getRandomValues(array);

    // Convert byte array to BigInt
    let value = BigInt(0);
    for (let i = 0; i < array.length; i++) {
        value = (value << 8n) + BigInt(array[i]);
    }

    return value;
}

// Generate a random 256-bit prime
async function generateLargePrime(bits = 256) {
    let primeCandidate;
    const max = (1n << BigInt(bits)) - 1n;
    const min = 1n << BigInt(bits - 1);

    while (true) {
        // Generate a random candidate and ensure it's odd
        primeCandidate = await generateRandomBigInt(bits);
        primeCandidate |= 1n; // Ensure it's odd

        // Ensure it's within the desired range
        if (primeCandidate >= min && primeCandidate <= max && await millerRabin(primeCandidate)) {
            return primeCandidate;
        }
    }
}

// Extended Euclidean Algorithm to find the modular inverse
function modInverse(a, m) {
    let m0 = m, t, q;
    let x0 = 0n, x1 = 1n;
    if (m === 1n) return 0n;

    while (a > 1n) {
        // q is quotient
        q = a / m;
        t = m;

        // m is remainder now
        m = a % m;
        a = t;
        t = x0;

        // Update x0 and x1
        x0 = x1 - q * x0;
        x1 = t;
    }

    if (x1 < 0n) x1 += m0;
    return x1;
}


// Function to validate userId
function isValidUserId(userId) {
  const minLength = 3; // Minimum length
  const maxLength = 20; // Maximum length
  const regex = /^[a-zA-Z0-9_]+$/; // Only alphanumeric characters and underscores

  // Check length and pattern
  if (userId.length < minLength || userId.length > maxLength) {
    return false;
  }
  if (!regex.test(userId)) {
    return false;
  }

  return true;
}


// Generate two 256-bit primes, modulus N, and RSA keys (e and d)
async function generatePrimesAndRSA() {
    const p = await generateLargePrime(256); // Generate 256-bit prime
    const q = await generateLargePrime(256); // Generate another 256-bit prime

    // Compute modulus N
    const N = p * q;

    // Choose a public exponent e (commonly 65537)
    const e = 65537n;

    // Compute Euler's Totient function: φ(N) = (p - 1)(q - 1)
    const phiN = (p - 1n) * (q - 1n);

    // Compute the modular inverse of e to get the private exponent d
    const d = modInverse(e, phiN);
	
	const userId = document.getElementById('user_id').value.trim();

    // Display the primes, modulus N, e, and d on the page
    document.getElementById('NValue').innerText = N.toString();
    document.getElementById('eValue').innerText = e.toString();
    document.getElementById('pValue').innerText = p.toString();
    document.getElementById('qValue').innerText = q.toString();
    document.getElementById('dValue').innerText = d.toString();

	
	if (isValidUserId(userId)) {
		// Create and show the download link
		const downloadLink = document.getElementById('downloadLink');
		const fileURL = createDownloadFile(userId, p, q, N, e, d);

		downloadLink.style.display = 'block';
		downloadLink.setAttribute('href', fileURL);
		downloadLink.setAttribute('download', `${userId}_rsa_keys.txt`);
	} else {
		console.error("Please enter valid User ID:", userId);
	}
}

// Create a downloadable text file with RSA key data
function createDownloadFile(userId, p, q, N, e, d) {
    const keyData = `
userId = ${userId}
p = ${p}
q = ${q}
N = ${N}
e = ${e}
d = ${d}
    `.trim();

    const blob = new Blob([keyData], { type: 'text/plain' });
    return URL.createObjectURL(blob);
}

// Select elements
const usersTableBody = document.querySelector('#users-table tbody');

// Add an event listener for form submission
const form = document.getElementById('register-form'); // Ensure the form has the correct ID
const responseElement = document.getElementById('response-message'); // Element to display response messages

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the form from reloading the page

  // Extract input values
  const user_id = document.getElementById('user_id').value.trim();
  const N = document.getElementById('N').value.trim(); // Ensure N is trimmed too

  // Validate user_id (allow only alphanumeric characters, underscores, and dashes)
  const userIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!userIdRegex.test(user_id)) {
    responseElement.textContent = 'Error: User ID can only contain letters, numbers, underscores, and dashes.';
    responseElement.style.color = 'red'; // Indicate an error
    return;
  }

  // Ensure N is provided and valid (optional: add specific validation for N if needed)
  if (!N) {
    responseElement.textContent = 'Error: N cannot be empty.';
    responseElement.style.color = 'red'; // Indicate an error
    return;
  }

  try {
    // Make the POST request
    const response = await fetch(`${herokuBackendUrl}save-user-data`, { // Ensure URL has the correct structure
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, N }), // Send the data as JSON
    });

    // Handle the response
    if (response.ok) {
      const data = await response.json();
      responseElement.textContent = `Success: ${data.message}`;
      responseElement.style.color = 'green'; // Indicate success
    } else {
      const error = await response.json();
      responseElement.textContent = `Error: ${error.error}`;
      responseElement.style.color = 'red'; // Indicate an error
    }
  } catch (err) {
    console.error('Request failed:', err);
    responseElement.textContent = 'An error occurred. Please try again.';
    responseElement.style.color = 'red'; // Indicate an error
  }
  
  fetchUsers();
});

  
  
  
  
// Function to fetch all registered users from the backend
async function fetchUsersFromBackend() {
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

// Function to populate the user list in the table
function populateUserList(users) {
    // Clear the table body
    usersTableBody.innerHTML = '';

    // Check if there are no users
    if (users.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="3" style="text-align: center;">No users available</td>
        `;
        usersTableBody.appendChild(emptyRow);
        return;
    }

    // Populate the table with user data
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>
                ${user.N}
                <button class="copy-button" data-n-value="${user.N}">Copy</button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });

    // Add event listeners to copy buttons
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', event => {
            const nValue = event.target.getAttribute('data-n-value');
            copyToClipboard(nValue);
        });
    });
}

// Function to copy text to the clipboard
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Copied to clipboard: ' + text);
}

// Main function to fetch and display users
async function fetchUsers() {
    const users = await fetchUsersFromBackend();
    populateUserList(users);
}

//populate users on page load
fetchUsers();