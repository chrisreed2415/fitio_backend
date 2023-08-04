const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const Post = mongoose.model("Post");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt');

//firebase storage
const admin = require('firebase-admin');
const serviceAccount = require('../FirebaseConfig/athletebeta-ed065-firebase-adminsdk-gh0ve-6ee6760eb3.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://athletebeta-ed065.appspot.com/' // Replace with your Firebase Storage bucket URL
  });
  
const bucket = admin.storage().bucket();


router.post('/uploadprofile', (req,res) => {
    const { email, profilepic } = req.body;

    console.log("email: ", email)
    console.log("profilepic: ", profilepic)

    User.findOne({ email: email })
    .then(async savedUser => {
        if (savedUser) {
            savedUser.profilepic = profilepic;
            savedUser.save()
                .then(user => {
                    res.json({ message: "Profile Picture Uploaded!"})
                })
                .catch(err => {
                    return res.status(422).json({ error: "Server Error"})
                })
        }
        else {
            return res.status(422).json({ error: "Invalid Credentials"});
        }
    })
})

router.post('/addpost', (req, res) => {
    const { email, posts, posttags} = req.body;

    const newPost = {
        posts: posts,
        posttags: posttags
    };

    User.findOne({email:email})
    .then((savedUser) => {
        if(!savedUser) {
            return res.status(422).json({error: "Invalid Credentials"})
        }
        savedUser.posts.push(newPost);
        savedUser.save()
            .then(user => {
                res.json({message: 'Post Success'})
            })
            .catch(err => {
                console.error(err);
                res.json({ error: 'Error adding post'})
            })
    })
    .catch(err=>{
        console.log(err);
    })
})


//fetch feed posts
router.get('/communityfeed', async (req, res) => {
  try {
    // Fetch community feed posts from the database, along with user information
    const communityFeedData = await User.find().populate('posts', 'posts posttags');

    if (!communityFeedData) {
      return res.status(200).json([]);
    }

    // Map the data to the desired response format
    const communityFeed = communityFeedData.map(user => {
      return user.posts.map(post => {
        return {
          _id: post._id,
          posts: post.posts,
          posttags: post.posttags,
          user: {
            _id: user._id,
            username: user.username,
            profilepic: user.profilepic,
            email: user.email
          },
        };
      });
    });

    // Flatten the nested array of posts into a single array
    const flattenedCommunityFeed = [].concat(...communityFeed);

    res.status(200).json(flattenedCommunityFeed);
  } catch (error) {
    // Handle database query error or other errors
    console.error('Error while fetching community feed:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});


//delete post
router.post('/deletepost', async (req, res) => {
    const { userId, postId, postURL } = req.body;

    try {
        // Find the post with the given postId in the MongoDB collection
        const user = await User.findById(userId);
    
        if (!user) {
            // User not found
            return res.status(404).json({ error: 'User not found' });
          }
      
          const postIndex = user.posts.findIndex((post) => post._id.toString() === postId);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Remove the post from the user's posts array using findOneAndDelete
    await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { posts: { _id: postId } } },
      { new: true }
    );

    if (postURL) {
        try {
            // Decode the URL to get the correct file path
            const filePath = decodeURIComponent(postURL.split('o/')[1].split('?alt=media')[0]);
            
            const file = bucket.file(filePath);
            console.log(filePath)
            const [exists] = await file.exists();
    
            if (exists) {
              await file.delete();
              console.log('Post image deleted successfully from Firebase Storage.');
            } else {
              console.log('Post image does not exist in Firebase Storage.');
            }
          } catch (error) {
            console.error('Error deleting post image:', error);
          }
        }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router