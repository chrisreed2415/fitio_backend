const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const postSchema = new mongoose.Schema({
    posts: String,
    posttags: [String]
  });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilepic: {
        type: String,
        default: '',
    },
    posts: [postSchema],
    followers: {
        type: Array,
        default: []
    },
    following: {
        type: Array,
        default: []
    },
    bio: {
        type: String,
        default: '',
    },
})

userSchema.pre('save', async function (next){
    const user = this;
    console.log("Just before saving before hashing ", user.password);
    if(!user.isModified('password')){
        return next();
    }
    user.password = await bcrypt.hash(user.password, 8);
    console.log("Just before saving & after hashing", user);
    next();
})

mongoose.model("User", userSchema);
mongoose.model("Post", postSchema);