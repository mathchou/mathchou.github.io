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
        const a = await generateRandomBigInt(128); // Random number for the test (128-bit)
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
async function generateRandomBigInt(bits = 128) {
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

// Generate a random 128-bit prime
async function generateLargePrime(bits = 128) {
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

// Generate two 128-bit primes, modulus N, and RSA keys (e and d)
async function generatePrimesAndRSA() {
    const p = await generateLargePrime(128); // Generate 128-bit prime
    const q = await generateLargePrime(128); // Generate another 128-bit prime

    // Compute modulus N
    const N = p * q;

    // Choose a public exponent e (commonly 65537)
    const e = 65537n;

    // Compute Euler's Totient function: φ(N) = (p - 1)(q - 1)
    const phiN = (p - 1n) * (q - 1n);

    // Compute the modular inverse of e to get the private exponent d
    const d = modInverse(e, phiN);

    // Display the primes, modulus N, e, and d on the page
    document.getElementById('NValue').innerText = N.toString();
    document.getElementById('eValue').innerText = e.toString();
    document.getElementById('pValue').innerText = p.toString();
    document.getElementById('qValue').innerText = q.toString();
    document.getElementById('dValue').innerText = d.toString();

    // Enable the download link
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.style.display = 'block';
    downloadLink.setAttribute('href', createDownloadFile(p, q, N, e, d));
}

// Create a downloadable text file with RSA key data
function createDownloadFile(p, q, N, e, d) {
    const keyData = `
p = ${p}
q = ${q}
N = ${N}
e = ${e}
d = ${d}
    `.trim();

    const blob = new Blob([keyData], { type: 'text/plain' });
    return URL.createObjectURL(blob);
}

let N = null;
let d = null;

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

            if (!N || !d) {
                alert("Please upload a valid file with N and d.");
                return;
            }

            // Notify user that the keys are loaded
            alert("Private keys (N and d) have been successfully loaded.");
        };
        reader.readAsText(file);
    } else {
        alert('Please upload a valid .txt file.');
    }
});

// Function to generate and display the transaction string when the button is clicked
async function generateTransaction() {
    // Check if N and d are loaded
    if (!N || !d) {
        alert("Please upload the file with N and d before generating the transaction.");
        return;
    }

    // Get values from input fields
    const sender = document.getElementById('sender').value;
    const receiver = document.getElementById('receiver').value;
    const amount = document.getElementById('amount').value;
    const comment = document.getElementById('comment').value;

    // Validate inputs
    if (!sender || !receiver || !amount || !comment) {
        alert("All fields are required!");
        return;
    }

    // Get the current date and time
    const datetime = new Date().toISOString().slice(0, 19);

    // Concatenate values to create the input string for hashing
    const hashInput = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}`;

    // Generate a hash of the concatenated values (using SHA-256)
    const hash = await generateHash(hashInput);

    // Convert the hash to a BigInt (needed for RSA signing)
    const hashBigInt = BigInt('0x' + hash);

    // Sign the hash using RSA private key (modular exponentiation)
    const signature = modPow(hashBigInt, d, N);

    // Create the transaction sentence
    const transactionSentence = `${sender} sends ${amount} Choucoin to ${receiver} for ${comment} on ${datetime}, signed: ${signature}`;

    // Display the result
    document.getElementById('resultText').innerText = transactionSentence;
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

// Function to copy the transaction text to clipboard
function copyToClipboard() {
    const resultText = document.getElementById('resultText').innerText;
    const textArea = document.createElement('textarea');
    textArea.value = resultText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // Optionally, you can show an alert to notify the user that the text was copied
    alert("Transaction text copied to clipboard!");
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


const herokuBackendUrl = 'https://choucoin-posts-4f7c7496eb49.herokuapp.com/';  // Replace with your actual Heroku app URL

// Example of submitting a new post (POST request)
document.getElementById('postForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const content = document.getElementById('content').value;
    if (!content) return;

    // Send POST request to backend (Heroku)
    const response = await fetch(`${herokuBackendUrl}/submit-post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });

    const data = await response.json();
    if (response.ok) {
        alert('Post submitted successfully!');
        document.getElementById('content').value = '';  // Clear the form
        loadPosts();  // Reload the posts list
    } else {
        alert('Error: ' + data.error);
    }
});

// Example of loading posts (GET request)
async function loadPosts() {
    const response = await fetch(`${herokuBackendUrl}/posts`);
    const posts = await response.json();
    
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';  // Clear existing posts

    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.innerHTML = `
            <p>${post.content}</p>
            <small>Posted on ${new Date(post.timestamp).toLocaleString()}</small>
            <hr>
        `;
        postsContainer.appendChild(postDiv);
    });
}









