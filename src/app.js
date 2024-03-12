const express = require("express");
const path = require("path");
const hbs = require("hbs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
let  interest1 ; 
let interest2 ; 
let interest3 ;
const app = express();
const session = require("express-session");
const bcrypt = require('bcrypt');

// Set up GoogleGenerativeAI
const api_key = "AIzaSyCSx1UbyW73TVEc_-XR9JGuKchXT69idBE"; // Replace with your API key
const genAI = new GoogleGenerativeAI(api_key);
const generationConfig = { temperature: 0.9, topP: 1, topK: 1, maxOutputTokens: 4096 };

// Get Generative Model
const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig });

// Express setup
app.set("views", path.join(__dirname, "/../templates/views"));
app.set("view engine", "hbs");
hbs.registerPartials(path.join(__dirname, "/../templates/views/partials"));
app.use(express.static(path.join(__dirname, "/../public")));
app.use(
    session({
      secret: "your-secret-key", // Replace with a strong and secure key
      resave: true,
      saveUninitialized: true,
    })
);
const InterestSchema = new mongoose.Schema({
  interest1: String,
  interest2: String,
  interest3: String
});

// Define a model
const Interest = mongoose.model('Interest', InterestSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Catharsis" });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/interest", (req, res) => {
  res.render("interest");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});
// Handle user responses to predefined questions
app.post('/handle-interest', async (req, res) => {
  const { interest1, interest2, interest3 } = req.body;

  try {
    // Create a new document and save it to MongoDB
    const interest = new Interest({ interest1, interest2, interest3 });
    await interest.save();
    res.status(200).send('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send('Error saving data');
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.render("register", { error: "User already exists" });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Registration failed" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.render("login", { error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render("login", { error: "Invalid username or password" });
    }

    req.session.user = user.username;
    console.log("login successfully");
    res.redirect("/interest");
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Login failed" });
  }
});

app.get('/ask', async (req, res) => {
  // Retrieve interests from the query parameters
  const { interest1, interest2, interest3 } = req.query;

  if (!interest1 || !interest2 || !interest3) {
      return res.status(400).send('Interests not found in query parameters');
  }

  // Generate career guidance based on the stored interests
  const response = await model.generateContent(`Tell me about ${interest1}, What skills are important for ${interest2}, What are the opportunities in ${interest3} `);


  const guidance = response.response.text();

  // Render the "ask" template and pass the guidance as a variable
  res.render('ask', { guidance });
});

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const result = await model.generateContent(question);
    const response = await result.response;
    console.log(response.text());
    res.json({ response: response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Content generation failed" });
  }
});

app.post('/process-form', (req, res) => {
  // Retrieve form data from the request body
  const { interest1, interest2, interest3 } = req.body;

  // Redirect the user to the /ask route with the interests in the query parameters
  res.redirect(`/ask?interest1=${interest1}&interest2=${interest2}&interest3=${interest3}`);
});
// Database connection
const uri = "mongodb+srv://nepalsss008:hacknova@cluster0.u2cqpgp.mongodb.net/";
// Replace with your MongoDB Atlas URI

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connect();

const port = process.env.PORT || 4000; 
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
