// Import required packages
const express = require('express'); // Framework for building web applications
const mongoose = require('mongoose'); // MongoDB object modeling tool
const cors = require('cors'); // Middleware to enable Cross-Origin Resource Sharing
const bodyParser = require('body-parser'); // Middleware to parse incoming request bodies

// Initialize the Express app
const app = express(); // Create an Express application instance
const port = process.env.PORT || 3000; // Define the port (from environment variable or default to 3000)

// Middleware
app.use(cors()); // Enable cross-origin requests to allow frontend and backend communication
app.options('*', cors()); // Explicitly handle preflight OPTIONS requests for all routes
app.use(bodyParser.json()); // Automatically parse incoming JSON request payloads

const db_pword = '0VGX360EWlttD84C'

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://mokechoke:0VGX360EWlttD84C@choucoin-posts.32p95.mongodb.net/?retryWrites=true&w=majority&appName=choucoin-posts";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

const mongoURI = 'mongodb+srv://mokechoke:0VGX360EWlttD84C@choucoin-posts.32p95.mongodb.net/?retryWrites=true&w=majority&appName=choucoin-posts'

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true, // Optional in newer drivers but does no harm
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err.message));

// Define a Mongoose schema for posts (structure for storing data in MongoDB)
const postSchema = new mongoose.Schema({
  content: { type: String, required: true }, // Post content is required and must be a string
  timestamp: { type: Date, default: Date.now }, // Automatically set the timestamp when a post is created
});

// Create a Mongoose model based on the schema
const Post = mongoose.model('Post', postSchema); // This represents the 'posts' collection in the database

// POST route for submitting a new post
app.post('/submit-post', async (req, res) => {
  const { content } = req.body; // Extract 'content' from the request body

  // Validate input (ensure content is provided)
  if (!content) {
    return res.status(400).json({ error: 'Content is required' }); // Respond with an error if validation fails
  }

  try {
    // Create a new post and save it to the database
    const newPost = new Post({ content });
    await newPost.save(); // Save the post in MongoDB
    res.status(201).json({ message: 'Post submitted successfully!', post: newPost }); // Respond with success message
  } catch (err) {
    console.error('Error saving post:', err); // Log an error if saving fails
    res.status(500).json({ error: 'Internal server error' }); // Respond with a server error
  }
});

// GET route to retrieve all posts
app.get('/posts', async (req, res) => {
  try {
    // Fetch all posts from the database, sorted by timestamp in descending order
    const posts = await Post.find().sort({ timestamp: -1 });
    res.json(posts); // Respond with the list of posts
  } catch (err) {
    console.error('Error fetching posts:', err); // Log an error if fetching fails
    res.status(500).json({ error: 'Internal server error' }); // Respond with a server error
  }
});



// Global error handler (optional, but useful for catching unhandled errors)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err); // Log the error details
  res.status(500).json({ error: 'Something went wrong!' }); // Respond with a generic server error
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`); // Log a message when the server starts successfully
});
