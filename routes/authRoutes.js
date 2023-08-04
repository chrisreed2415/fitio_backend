const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const jwt = require('jsonwebtoken');
//
require('dotenv').config();
//

const bcrypt = require('bcrypt');
const { request } = require('express');

// nodemailer
"use strict";
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: 'creedpresents@gmail.com',
    pass: 'gpqrvwsojwhdwkqe'
  }
});

// async..await is not allowed in global scope, must use a wrapper
async function mailer(receivermail, code) {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: 'creedpresents@gmail.com', // sender address
    to: `${receivermail}`, // list of receivers
    subject: "Signup Verfication ✔", // Subject line
    text: `Your Verification Code is ${code}`, // plain text body
    html: `<b>Your Verification Code is ${code}</b>`, // html body
  });

  console.log("Message sent: %s", info.messageId);
}
//



router.post('/signup',(req, res) => {
    console.log('sent by client -', req.body);
    const {email, username , password} = req.body;
    if (!email || !username || !password) {
        return res.status(422).send({ error: "Please fill in the fields"});
    }

    User.findOne({ email: email })
        .then(async (savedUser) => {
                if(savedUser){
                    return res.status(422).send({ error: "Invalid Credentials"});
                }
                const user = new User({
                    email,
                    username,
                    password
                })

                try {
                    await user.save();
                    // res.send({ message: "User saved successfully "});
                    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
                    return res.status(200).json({ message: "User Registered Successfully", token });
                }
                catch (err) {
                    console.log(err);
                    return res.status(422).send({ error: err.message });
                }
            }
        )

})


router.post('/signin', async (req, res) => {
    const {username, password} = req.body;
    if (!username || !password ) {
        return res.status(422).json({ error: "Invalid username or password "});
    }
    const savedUser = await User.findOne({ username: username })

    if (!savedUser) {
        return res.status(422).json({ error: "Invalid Credentials"});
    }

    try {
        bcrypt.compare(password, savedUser.password, (err, result) => {
            if(result){
                console.log("Password match");
                const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET);
                const { _id, username, email } = savedUser;
                res.send({ message: "Successfully Signed In",token, user: { _id, username, email } });

            }
            else {
                console.log('Password does not match');
                return res.status(422).json({ error: "Invalid Credentials"});
            }
        })
    }
    catch(err) {
        console.log(err)
    }

})

router.post('/verify', async (req, res) => {
    console.log('sent by client -', req.body);
    const {email} = req.body;
    if (!email) {
        return res.status(422).send({ error: "Please fill in the fields"});
    }
    const savedUser = await User.findOne({ email: email })

    if (!savedUser) {
        return res.status(422).json({ error: "Invalid Credentials"});
    }

    try {
        let VerifyCode = Math.floor(100000 + Math.random() * 900000);
        //bcrypt.compare(email, savedUser.email, (err, result) => {
            if(email == savedUser.email){
                console.log("Email match");
                // const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET);
                // res.send({ token });
                mailer(email, VerifyCode);
                res.send({message: "Verfication Code sent to your Email", udata: savedUser});
            }
            else {
                console.log('No Account?');
                return res.status(422).json({ error: "Invalid Credentials"});
            }
        
    }
    catch(err) {
        console.log(err)
    }
})


router.post('/verifyfp', (req, res) => {
    console.log('sent by client', req.body);
    const { email } = req.body;

    if (!email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }

    User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
            try {
                let VerificationCode = Math.floor(100000 + Math.random() * 900000);
                await mailer(email, VerificationCode);
                console.log("Verification Code", VerificationCode);
                res.send({ message: "Verification Code Sent to your Email", VerificationCode, email });
            }
            catch (err) {
                console.log(err);
            }
        }
        else {
            return res.status(422).json({ error: "Invalid Credentials" });
        }
    }
    )
})



router.post('/resetpassword', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    else {
        User.findOne({ email: email })
            .then(async (savedUser) => {
                if (savedUser) {
                    savedUser.password = password;
                    savedUser.save()
                        .then(user => {
                            res.json({ message: "Password Changed Successfully" });
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }
                else {
                    return res.status(422).json({ error: "Invalid Credentials" });
                }
            })
    }

})

//userdata
router.post('/userdata', (req, res) => {
    const { authorization } = req.headers;
    //    authorization = "Bearer afasgsdgsdgdafas"
    if (!authorization) {
        return res.status(401).json({ error: "You must be logged in, token not given" });
    }
    const token = authorization.replace("Bearer ", "");
    // console.log(token);

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: "You must be logged in, token invalid" });
        }
        const { _id } = payload;
        User.findById(_id).then(userdata => {
            res.status(200).send({
                message: "User Found",
                user: userdata
            });
        })

    })
})

//search user backend
router.post('/searchuser', (req, res) => {
    const {keyword} = req.body;

    if(!keyword) {
        return res.status(422).json({ error: 'Please enter a valid username'})
    }

    User.find({username: {$regex:keyword,$options:'i'}})
    .then(user=> {
        let data = [];
        user.map(item => {
            data.push(
                {
                    _id: item._id,
                    username: item.username,
                    email: item.email,
                    bio: item.bio,
                    profilepic: item.profilepic
                }
            )
        })
        console.log(data);
        if (data.length == 0) {
            return res.status(422).json ({ error: "No User Found"});
        }
        res.status(200).send({ 
            message: 'User Found',
            user: data
         })
    })
    .catch(err => {
        res.status(422).json({ error: 'Server Error'})
    })
})

//view other user info
router.post('/viewuserdata', (req, res) => {
    const { email } = req.body;

    User.findOne({email: email})
    .then(savedUser => {
        if(!savedUser){
        return res.status(422).json({error: "Invalid Credentials"})
    }
    //console.log(savedUser);
    let data = {
        _id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        bio: savedUser.bio,
        profilepic: savedUser.profilepic,
        followers: savedUser.followers,
        following: savedUser.following,
        posts: savedUser.posts
    }

    //console.log(data)

    res.status(200).send({
        user: data,
        message: "User Found"
    })
    
    })
 })



 //feed info
 router.post('/viewfeed', (req, res) => {
    const {keyword} = req.body;

    if(!keyword) {
        User.find({username: {$regex:keyword,$options:'i'}})
        .then(user=> {
            let data = [];
            user.map(item => {
                data.push(
                    {
                        _id: item._id,
                        username: item.username,
                        profilepic: item.profilepic,
                        posts: item.posts
                    }
                )
            })
        //console.log(data)

        res.status(200).send({
            user: data,
            message: "Feed Success"
        })
})

}
 })

 //check following
router.post('/checkf', (req, res) => {
    const {followf, followt} = req.body;
    //followf = user email
    //followt = other email

    if (!followf || !followt) {
        return res.status(422).json({error: "Invalid Credentials"})
    }
    User.findOne({email: followf})
    .then(mainuser => {
        if(!mainuser) {
            return res.status(422).json({error: "Invalid Credentials"})
        }
        else {
            let data = mainuser.following.includes(followt);

            if (data == true) {
                res.status(200).send({
                    message: 'User is following'
                })
            }
            else{
                res.status(200).send({
                    message: 'User is NOT following'
                })
            }
        }

    })
    .catch(er => {
        return res.status(422).json({error: "Server Error"})
    })


})

//following user
router.post('/followuser', (req, res) => {
    const {followf, followt} = req.body;

    //follower profile (add email to follower's followers)
    if (!followf || !followt) {
        return res.status(422).json({error: "Invalid Credentials"});
    }
    User.findOne({ email: followf})
    .then(mainuser => {
        if(!mainuser) {
            return res.status(422).json({error: "Invalid Credentials"});
        }
        else {
            if(mainuser.following.includes(followt)) {
                return res.status(422).json({error: "Already Following"});
            }
            else {
                mainuser.following.push(followt);
                mainuser.save()
            }

            User.findOne({ email: followt})
            .then(otheruser => {
            if(!otheruser) {
                return res.status(422).json({error: "Invalid Credentials"});
            }
            else {
                if(otheruser.followers.includes(followf)) {
                    return res.status(422).json({error: "Already Following"});
                }
                else {
                    otheruser.followers.push(followf);
                    otheruser.save()
                }
                res.status(200).send({
                    message: "User Followed"
                })
        }
    })
    .catch(err => {
        return res.status(422).json({error: "Server Error"});
    })
}
}).catch(err => {
    return res.status(422).json({error: "Not Following"});
})
})


//unfollow user
router.post('/unfollowuser', (req, res) => {
    const {followf, followt} = req.body;

    //follower profile (add email to follower's followers)
    if (!followf || !followt) {
        return res.status(422).json({error: "Invalid Credentials"});
    }
    User.findOne({ email: followf})
    .then(mainuser => {
        if(!mainuser) {
            return res.status(422).json({error: "Invalid Credentials"});
        }
        else {
            if(mainuser.following.includes(followt)) {
                mainuser.following.pull(followt);
                mainuser.save()

                User.findOne({email : followt })
                .then(otheruser => {
                    if(!otheruser) {
                        return res.status(422).json({error: "Invalid Credentials"});
                    }
                    else {
                        if(otheruser.followers.includes(followf)) {
                            otheruser.followers.pull(followf);
                            otheruser.save()
                            return res.status(200).json({message: "User Unfollowed"});
                        }
                        else {
                            return res.status(422).json({error: "Not Following"});
                        }
                    }
                })
            }
            else {
                return res.status(422).json({error: "Not Following"});
            }
        }
    })
})

router.get('/:userId/followers', async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const followEmails = user.followers;
  
      if (!followEmails || followEmails.length === 0) {
        // If you have no follows
        return res.status(200).json({
          message: 'You have no follows'
        });
      }
  
      const followerPromises = followEmails.map(followEmail =>
        User.findOne({ email: followEmail }).select('-password')
      );
  
      Promise.all(followerPromises)
        .then(followerUsers => {
          const followersData = followerUsers.map(followerUser => ({
            _id: followerUser._id,
            username: followerUser.username,
            email: followerUser.email,
            bio: followerUser.bio,
            profilepic: followerUser.profilepic,
          }));
  
          res.status(200).json({
            user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              bio: user.bio,
              profilepic: user.profilepic,
              followers: followersData,
              following: user.following,
            },
            message: 'User Found'
          });
        })
        .catch(error => {
          console.error('Error finding followers:', error);
          res.status(500).json({ error: 'Internal server error' });
        });
    } catch (error) {
      console.error('Error finding user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:userId/following', async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const followingEmails = user.following;
  
      if (!followingEmails || followingEmails.length === 0) {
        // If you are not following anyone
        return res.status(200).json({
          message: 'You are not following anyone'
        });
      }
  
      const followingPromises = followingEmails.map(followingEmail =>
        User.findOne({ email: followingEmail }).select('-password')
      );
  
      Promise.all(followingPromises)
        .then(followingUsers => {
          const followingData = followingUsers.map(followingUser => ({
            _id: followingUser._id,
            username: followingUser.username,
            email: followingUser.email,
            bio: followingUser.bio,
            profilepic: followingUser.profilepic,
          }));
  
          res.status(200).json({
            user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              bio: user.bio,
              profilepic: user.profilepic,
              followers: user.followers,
              following: followingData,
            },
            message: 'User Found'
          });
        })
        .catch(error => {
          console.error('Error finding following:', error);
          res.status(500).json({ error: 'Internal server error' });
        });
    } catch (error) {
      console.error('Error finding user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  
  
  
  



module.exports = router;

//$2b$08$GUjNYH7Pq8zw8SEnKoThEe.i8eClkRvTCkQnfH0d1uzntckzrAtle