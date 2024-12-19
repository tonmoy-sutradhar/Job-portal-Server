// require('crypto').randomBytes(64).toString('hex')  --> use for token create

require("dotenv").config();
var jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-portal-e5e9d.web.app",
      "https://job-portal-e5e9d.firebaseapp.com/",
    ],
    credentials: true,
  })
);

// lOGGER
const logger = (req, res, next) => {
  console.log("Inside the logger.");
  next();
};

// Verify Token
const verifyToken = (req, res, next) => {
  console.log("Inside verify token Middleware");
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorize access." });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_JWT_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorize access" });
    }
    req.user = decode;
    next();
  });
};

// Mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.cjt8m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const jobCollection = client.db("job-portal").collection("job");

    const jobApplicationCollection = client
      .db("job-portal")
      .collection("jobApplication");

    // Auth related API's
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          // secure: false, // http://localhost:500/signIn
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { httpOnly: true, secure: false })
        .send({ Logout_success: true });
    });

    app.get("/jobs", logger, async (req, res) => {
      console.log("Now inside the other API callback");
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // Jobs Applications data post
    // get all data , get some data, get one data [0,1,many]
    // http://localhost:5000/job-applications?email=tonmoysutradhar@gmail.com (search like this)
    app.get("/job-applications", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      // Handle forbidden access.--->
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden access." });
      }
      // console.log(req.cookies);
      const result = await jobApplicationCollection.find(query).toArray();

      // fokira way to aggregate data
      for (const application of result) {
        // console.log(application.job_id);
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobCollection.findOne(query1);

        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.location = job.location;
        }
      }

      res.send(result);
    });

    // app.get('/job-applications/:id') ==> get a job application by id

    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      // Not the best way (use aggregate)
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      // console.log(job);

      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }

      // now update the job info
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          application: newCount,
        },
      };
      const updateResult = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // for status update  ==> like: pending , hired
    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Connect to the localhost
app.get("/", async (req, res) => {
  res.send("JOB PORTAL IS RUNNING...!");
});

app.listen(port, () => {
  console.log("Job portal server is running on port", port);
});
