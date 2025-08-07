
const express = require('express');
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const path = require('path');

const app = express();
const port = 8000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection URI and Database Name
// const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const uri = process.env.MONGO_URI;
const dbName = "projectsDB";


// MongoDB Connection
let projectsCollection; // Define a global variable for the collection
let issuesCollection; // Define a global variable for the issues collection

MongoClient.connect(uri, { useUnifiedTopology: true })
  .then((client) => {
    console.log("Connected to MongoDB");


    const db = client.db(dbName);
     projectsCollection = db.collection("projects");
     issuesCollection = db.collection("issues"); // Initialize the issues collection
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });


app.get("/", async (req, res) => {
    try {
      const projects = await projectsCollection.find({}).toArray();
      console.log("Fetched projects:", projects); // Debug log
      res.render("home", { projects });
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).send("Error loading projects");
    }
  });
  
  app.get('/create', (req, res) => {
    res.render('create'); // Render a "create.ejs" form page
  });
  
  // schema for post create
  app.post('/create', async (req, res) => {
    const { name, description, author } = req.body;
  
    try {
      const result = await projectsCollection.insertOne({
        name,
        description,
        author,
        createdAt: new Date(),
      });
      res.redirect('/'); // Redirect to the homepage after creating a project
    } catch (error) {
      console.error("Error inserting document:", error);
      res.status(500).send("Failed to create project");
    }
  });





app.post('/issues/create', async (req, res) => {
  const { projectId, title, description, labels, author } = req.body;

  try {
    // Parse labels into an array
    const labelsArray = labels.split(',').map(label => label.trim());

    // Convert projectId into ObjectId for MongoDB
    const ObjectId = require('mongodb').ObjectId;
    const newIssue = {
      projectId: new ObjectId(projectId), // Ensure it's stored as an ObjectId
      title,
      description,
      labels: labelsArray,
      author,
      createdAt: new Date(),
    };

    // Save the issue to the database
    await issuesCollection.insertOne(newIssue);

    // Redirect back to the project details page
    res.redirect(`/project/${projectId}`);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).send('Failed to create issue');
  }
});








app.get("/issues", async (req, res) => {
  try {
    const issues = await issuesCollection.find({}).toArray();
    console.log("Fetched issues:", issues); // Debug log
    res.render("project-details", { issues }); // Render a list of issues
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).send("Error loading issues");
  }
});




app.get('/project/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const ObjectId = require('mongodb').ObjectId;

    // Fetch the specific project
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).send('Project not found');
    }

    // Fetch issues related to the project
   


    

    // Retrieve filters from query parameters
    const { title, description, author, labels } = req.query;
    let filter = { projectId: new ObjectId(projectId) };

    if (title) {
      filter.title = { $regex: title, $options: 'i' }; // Case-insensitive search
    }

    if (description) {
      filter.description = { $regex: description, $options: 'i' };
    }

    if (author) {
      filter.author = { $regex: author, $options: 'i' };
    }

    if (labels) {
      const labelArray = Array.isArray(labels) ? labels : labels.split(',');
      filter.labels = { $in: labelArray }; // Check if any label exists in the issue
    }

    // Fetch filtered issues
    const issues = await issuesCollection.find(filter).toArray();


    // Fetch all distinct labels from the database
    const allLabels = await issuesCollection.distinct("labels");


    // Render the page with the filtered results
    res.render('project-details', { project, issues, allLabels, title, description, author, labels: labels || [] });

  } catch (error) {
    console.error('Error fetching project or issues:', error);
    res.status(500).send('Internal Server Error');
  }
});








// Start the server




app.listen(port, function (err) {
    if (err) {
        console.log('Error in running the server:', err);
    }
    console.log('Yup! My express server is running on port:', port);
});





