const express = require('express');
const port = 3000;

const app = express();
const bodyParser = require('body-parser');


//
require('./db');
require('./models/User');
//
const authRoutes = require('./routes/authRoutes');
const uploadMedia = require('./routes/MediaRoutes');
const requireToken = require('./Middlewares/AuthTokenRequired');



//
app.use(bodyParser.json());
app.use(authRoutes);
app.use(uploadMedia);
//




app.get('/',requireToken, (req,res) => {
    console.log(req.user);
    res.send('This is home page');
})
//app.post('/signup', (req, res) => {
    //console.log(req.body);
  //  res.send('This is signup page');
//});

app.listen(port, () =>{
    console.log(`server is running on port ${port}`);
})