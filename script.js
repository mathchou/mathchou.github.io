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
