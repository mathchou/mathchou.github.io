const mongoose = require('mongoose');

// Replace with your MongoDB URI
const mongoURI = 'mongodb+srv://mokechoke:14G9hN3CoqvsWbb6@choucoin-posts.32p95.mongodb.net/?retryWrites=true&w=majority&appName=choucoin-posts';

async function testMongoConnection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB successfully!');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}

// Run the test connection
testMongoConnection();
