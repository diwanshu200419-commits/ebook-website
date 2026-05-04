const express = require("express");
const router = express.Router();

const Book = require("../models/book");

/*
=================================
TRENDING BOOKS API
GET /api/marketplace/trending
=================================
*/

router.get("/trending", async (req, res) => {

try{

// fetch approved books
const books = await Book.find({ approved: true })

.sort({
sales: -1,     // most sold
views: -1,     // most viewed
rating: -1,    // highest rating
createdAt: -1  // newest boost
})

.limit(12)

.select(
"title price cover creator views sales rating"
);

res.status(200).json({
status: "success",
count: books.length,
books
});

}catch(err){

console.error("Marketplace trending error:", err);

res.status(500).json({
status: "error",
message: "Failed to load trending books"
});

}

});

module.exports = router;