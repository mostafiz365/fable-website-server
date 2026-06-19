const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const dotenv = require('dotenv');
dotenv.config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.get('/', (req, res) => {
  res.send('Hello World!')
})


const uri = process.env.MONGODB_URI;
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
    await client.connect();

    const db = client.db('fable_ebook_db');
    const bookCollection = db.collection('books');
    const bookmarkCollection = db.collection('bookmarks');


    app.get('/api/books', async (req, res) => {
            const result = await bookCollection.find().toArray();

            res.send(result);
        })

    app.get('/api/my/books', async(req, res) =>{
        const query = {}
        if (req.query.userId) {
                query.userId = req.query.userId;
            }
            const result = await bookCollection.find(query).toArray();

        res.send(result);
    })

    app.get('/api/books/:id', async (req, res) => {
        const id = req.params.id;
        const query = {
            _id: new ObjectId(id)
        }
        const result = await bookCollection.findOne(query);
        res.send(result);
    });

    app.post('/api/books', async (req, res) => {
            const book = req.body;
            const newBook = {
                ...book,
                createdAt: new Date()
            }
            const result = await bookCollection.insertOne(newBook);
            res.send(result);
        })

    // Bookmark related apis

    app.get('/api/my/bookmarks', async(req, res) =>{
        const query = {}
        if (req.query.userId) {
                query.userId = req.query.userId;
            }
            const result = await bookmarkCollection.find(query).toArray();

        res.send(result);
    })

    app.post('/api/bookmarks', async (req, res) => {
        try {
            const bookmark = req.body;
            
            // চেক করা হচ্ছে এই ইউজার অলরেডি এই বইটি বুকমার্ক করেছে কিনা
            const alreadyBookmarked = await bookmarkCollection.findOne({
                bookId: bookmark.bookId,
                userId: bookmark.userId
            });

            if (alreadyBookmarked) {
                return res.status(400).send({ message: "Already bookmarked by this user" });
            }

            const result = await bookmarkCollection.insertOne(bookmark);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: "Server Error", error: error.message });
        }
    });


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})