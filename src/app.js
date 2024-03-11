const express = require("express");
const path = require("path");
const hbs = require("hbs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const session = require("express-session");

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

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
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
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Login failed" });
  }
});

app.get('/ask', async (req, res) => {
  res.render("ask");
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

// Database connection
const uri = "mongodb+srv://nepalsss008:hacknova@cluster0.u2cqpgp.mongodb.net/"; // Replace with your MongoDB Atlas URI

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
