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
    const purchaseBookCollection = db.collection('purchaseBooks');
    const userCollection = db.collection('user');

    app.get('/api/users', async(req, res) =>{
        const result = await userCollection.find().toArray();
        res.send(result);
    })

//     app.patch('/api/users/role/:id', async (req, res) => {
//     try {
//         const id = req.params.id;
//         const { role } = req.body; // ক্লায়েন্ট থেকে পাঠানো নতুন রোল
        
//         const filter = { _id: new ObjectId(id) };
//         const updateDoc = {
//             $set: {
//                 role: role,
//                 updatedAt: new Date()
//             },
//         };

//         const result = await userCollection.updateOne(filter, updateDoc);
        
//         // মেটাডেটা সরাসরি না পাঠিয়ে একটি সাকসেস রেসপন্স নিশ্চিত করা
//         if (result.modifiedCount > 0 || result.matchedCount > 0) {
//             res.send({ success: true, updatedRole: role });
//         } else {
//             res.status(400).send({ success: false, message: "No changes made" });
//         }
//     } catch (error) {
//         res.status(500).send({ success: false, error: error.message });
//     }
// });

//     app.patch('/api/users/role/:id', async (req, res) => {
//         console.log(req.body);
//         const id = req.params.id;
//         const { role } = req.body; // ক্লায়েন্ট থেকে পাঠানো নতুন রোল ('reader', 'writer', 'admin')
        
//         const filter = { _id: new ObjectId(id) };
//         const updateDoc = {
//             $set: {
//                 role: role,
//                 updatedAt: new Date() // আপডেট টাইম ট্র্যাকিংয়ের জন্য
//             },
//         };
//         const result = await userCollection.updateOne(filter, updateDoc);
//         res.send(result);
// });

    app.delete('/api/users/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
});

    app.get('/api/all-books', async (req, res) => {
            const result = await bookCollection.find().toArray();

            res.send(result);
        })

    app.get('/api/books', async (req, res) => {
    try {
        // লজিক: status ফিল্ড "published" হতে হবে অথবা status ফিল্ডটি ডেটাবেজে থাকাই যাবে না (পুরনো ডেটার জন্য)
        // কিন্তু status: "unpublished" হলে সেটি ফিল্টারে আসবে না।
        const query = {
            $or: [
                { status: "published" }
            ]
        };

        const result = await bookCollection.find(query).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch books", error: error.message });
    }
});

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


    
    // ১. বইয়ের সাধারণ তথ্য এডিট করার এপিআই
app.patch('/api/ebooks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        
        // আইডি ভ্যালিডেশন
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                title: updatedData.title,
                description: updatedData.description,
                price: parseFloat(updatedData.price),
                genre: updatedData.genre,
                coverImage: updatedData.coverImage
            }
        };

        const result = await bookCollection.updateOne(query, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error updating ebook info", error: error.message });
    }
});

// ২. বইয়ের লাইভ স্ট্যাটাস (published / unpublished) টগল করার এপিআই
app.patch('/api/ebooks/status/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body; // "published" অথবা "unpublished"

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: { status: status }
        };

        const result = await bookCollection.updateOne(query, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error updating status", error: error.message });
    }
});

// ৩. বই ডিলিট করার এপিআই
app.delete('/api/ebooks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        
        const result = await bookCollection.deleteOne(query);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error deleting ebook", error: error.message });
    }
});


    // purchaseBook related apis

    app.post('/api/purchase', async(req, res) =>{
        const purchaseBook = req.body;
            const newPurchaseBook = {
                ...purchaseBook,
                createdAt: new Date()
            }
            const result = await purchaseBookCollection.insertOne(newPurchaseBook);

        if (purchaseBook.bookId && purchaseBook.userId) {
            
            let query = {};
            try {
                // মঙ্গোডিবির নিয়ম অনুযায়ী _id ফিল্টার অবজেক্ট এবং ObjectId কনভার্সন
                query = { _id: new ObjectId(purchaseBook.bookId) };
            } catch (e) {
                // যদি আপনার বইয়ের কালেকশনে আইডি সাধারণ স্ট্রিং ফরম্যাটে থাকে
                query = { _id: purchaseBook.bookId };
            }

            // বইয়ের কালেকশনে purchasedUsers অ্যারে আপডেট করা হচ্ছে
            await bookCollection.updateOne(
                query, // 👈 মঙ্গোডিবির সঠিক ফিল্টার অবজেক্ট
                { 
                    // $addToSet একই ইউজারের আইডি ডুপ্লিকেট হতে দেবে না
                    $addToSet: { purchasedUsers: String(purchaseBook.userId) } 
                }
            );
        }
            res.send(result);
    })

    app.get('/api/purchase', async (req, res) => {
        const result = await purchaseBookCollection.find().toArray();
        res.send(result);
});

    app.get('/api/purchase/writer/:writerId', async (req, res) => {
        const writerId = req.params.writerId;
        // আপনার ডাটাবেজের ইমেজ অনুযায়ী ফিল্ডের নাম 'writerId'
        const query = { writerId: writerId }; 
        const result = await purchaseBookCollection.find(query).toArray();
        res.send(result);
});

    app.get('/api/purchase/user/:userId', async (req, res) => {
        const userId = req.params.userId;
        // আপনার ডাটাবেজের ইমেজ অনুযায়ী ফিল্ডের নাম 'userId'
        const query = { userId: userId };
        const result = await purchaseBookCollection.find(query).toArray();
        res.send(result);
});


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