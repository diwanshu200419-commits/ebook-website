const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Book = require("../models/book");

/* ===================================
GET CREATOR PROFILE
Creator Public Page API
=================================== */

router.get("/:username", async (req,res)=>{

try{

const username = req.params.username;

/* FIND CREATOR */

const creator = await User.findOne({ username });

if(!creator){

return res.status(404).json({
status:"error",
message:"Creator not found"
});

}

/* FIND CREATOR BOOKS */

const books = await Book.find({
author:creator._id,
status:"Approved"
}).sort({createdAt:-1});


/* CALCULATE STATS */

const booksCount = books.length;

const totalSales = books.reduce((sum,b)=> sum + (b.salesCount || 0),0);

const totalViews = books.reduce((sum,b)=> sum + (b.downloads || 0),0);

const totalEarnings = books.reduce((sum,b)=> sum + (b.earnings || 0),0);


/* RETURN DATA */

res.json({

status:"success",

creator:{
id:creator._id,
name:creator.name,
username:creator.username,
bio:creator.bio || "Digital creator on E-Book Market",
avatar:creator.profileImage || "/assets/default-avatar.png",
verified:creator.verified || false,

stats:{
books:booksCount,
sales:totalSales,
views:totalViews,
earnings:totalEarnings
}

},

books

});

}catch(err){

console.error("Creator API error:",err);

res.status(500).json({
status:"error",
message:"Internal server error"
});

}

});

module.exports = router;