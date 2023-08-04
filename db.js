const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.mongo_URL).then(
    () => {
        console.log('Database Connection Successful')
    }
)
    .catch((err)=> {
        console.log(`Could not connect to database ` + err);
    })