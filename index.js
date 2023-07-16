require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t99wqyy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("book-catalog");
    const bookCollection = db.collection("books");
    const userCollection = db.collection("users");

    app.get("/recent-books", async (req, res) => {
      const cursor = bookCollection
        .find({})
        .sort({ publicationDate: -1 })
        .limit(10);
      const book = await cursor.toArray();

      res.send({ status: true, data: book });
    });

    app.get("/books", async (req, res) => {
      const queries = req.query;

      const modifiedQueries = {};
      Object.entries(queries).forEach((query) => {
        modifiedQueries[query[0]] = query[1];
      });

      const { searchTerm, genre, publicationYear } = modifiedQueries;

      let andCondition = [];

      if (searchTerm) {
        andCondition.push({
          $or: [
            {
              title: {
                $regex: searchTerm,
                $options: "i",
              },
            },
            {
              author: {
                $regex: searchTerm,
                $options: "i",
              },
            },
            {
              genre: {
                $regex: searchTerm,
                $options: "i",
              },
            },
          ],
        });
      }

      if (genre) {
        andCondition.push({
          $and: [{ genre: { $regex: genre, $options: "i" } }],
        });
      }

      if (publicationYear) {
        andCondition.push({
          $and: [
            { publicationDate: { $regex: publicationYear, $options: "i" } },
          ],
        });
      }

      const query = andCondition.length > 0 ? { $and: andCondition } : {};

      const result = await bookCollection.find(query).toArray();

      res.send({ status: true, data: result });
    });

    app.post("/book", async (req, res) => {
      const book = req.body;

      const result = await bookCollection.insertOne(book);

      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;

      const result = await bookCollection.findOne({ _id: ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBook = req.body;

      const result = await bookCollection.updateOne(
        { _id: ObjectId(id) },
        { $set: updatedBook }
      );

      res.send(result);
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;

      const result = await bookCollection.deleteOne({ _id: ObjectId(id) });

      res.send(result);
    });

    app.post("/review/:id", async (req, res) => {
      const bookId = req.params.id;
      const review = req.body.review;

      console.log(bookId);
      console.log(review);

      const result = await bookCollection.updateOne(
        { _id: ObjectId(bookId) },
        { $push: { reviews: review } }
      );

      console.log(result);

      if (result.modifiedCount !== 1) {
        console.error("book not found or book not added");
        res.json({ error: "book not found or book not added" });
        return;
      }

      console.log("book added successfully");
      res.json({ message: "book added successfully" });
    });

    app.get("/review/:id", async (req, res) => {
      const bookId = req.params.id;

      const result = await bookCollection.findOne(
        { _id: ObjectId(bookId) },
        { projection: { _id: 0, reviews: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "book not found" });
      }
    });

    app.post("/register-user", async (req, res) => {
      const user = req.body;

      const result = await userCollection.insertOne(user);

      res.send(result);
    });

    app.post("/login-user", async (req, res) => {
      const { email, password } = req.body;

      const result = await userCollection.findOne({ email, password });

      if (result) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
