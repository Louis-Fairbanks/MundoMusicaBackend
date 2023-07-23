require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const accountSchema = require('./account.js');
const musicianSchema = require('./musician.js');
const jsonWebToken = require('jsonwebtoken');
const { expressjwt : jwt} = require('express-jwt');
const bcrypt = require('bcrypt'); 
const cors= require('cors');

const app = express();
app.use(bodyParser.json());
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
  credentials: true
}))

// app.use("/protected", jwt({ secret: process.env.ACCESS_TOKEN_SECRET, algorithms : ["HS256"]}));

// app.get('/protected', (req, res) => {
//     res.send(`Hello ${req.user.username}!`);
// })

app.post('/login', async (req, res) => {          //login for users
    const requestedUsername = req.body.username;        //unique username that was inputted
    let isUserAllowed = false;
    const requestedUser = await user.findOne({"accountDetails.username" : requestedUsername});
    if (!requestedUser){
        return res.status(400).send({message : 'Cannot find user'})
    }
     try{
         if (await bcrypt.compare(req.body.password, requestedUser.accountDetails.password)){
             isUserAllowed = true;
         }else{
             isUserAllowed = false;
         }
     }catch(error){console.log(error)}

    const accessToken = jsonWebToken.sign({ requestedUser}, process.env.ACCESS_TOKEN_SECRET);
    res.send({accessToken : accessToken});
})

function authenticateToken(req, res, next){             //app.get('/protected', authenticateToken, (req, res) =>{...})
    const authHeader = req.headers['authorization'];        //Authorization : Bearer AccessToken   send this as header
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null){
        return res.sendStatus(401)
    }jsonWebToken.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, userToSerialize) => {
        if (err){
            return res.sendStatus(403);
        }
        req.user = userToSerialize;
        next()
    })
}



const accountsDb = mongoose.createConnection("mongodb://127.0.0.1:27017/MundoMusicaAccounts", function(err){
    if (err){
        console.log('Error connecting to database:', err);
    } else{
        console.log('Successfully connected to database');
    }
});

const user = accountsDb.model("user", accountSchema);
// dbTest = mongoose.createConnection("mongodb+srv://Louis:guitar1046@samplecluster.2vutl37.mongodb.net/")


 app.route("/users").get(async function (req, res){   //retrieving all users
      let allUsers = await user.find();
    res.send(allUsers);
 })
 .post(async function(req, res) {       //creating a user
    let currentDate = new Date();
    try{
        let usernameExists = await user.findOne({"accountDetails.username" : req.body.username});
        if (usernameExists){
            res.send({message :"Username already in use. Choose another."});
            return;
        } 
        const hashedPassword = await bcrypt.hash(req.body.password, 10);     //encrypting password with 10 salt rounds 
        await user.create({fName : req.body.firstName, lName : req.body.lastName, joined : currentDate, accountDetails : { username : req.body.username, 
            password : hashedPassword, email : req.body.email}, age : null, located : null, about: null, photo : null, paymentProcessor : null});
          res.send({message : "User created!"});
    }catch(err){
        res.send(err); //res.status(500).send()  send a blank message and set error status
    }
 })
 .delete();

 app.post('/users/:username', authenticateToken, async (req, res) => {
      let filter = {"accountDetails.username" : req.params.username};
      let update = {}
      if (req.body.fName){
        update.fName = req.body.fName;
      }
      if (req.body.lName){
        update.lName = req.body.lName;
      }
      if (req.body.age){
        let stringifiedAge = parseInt(req.body.age);
        update.age = stringifiedAge;
      }
      if (req.body.location){
        update.located = req.body.location;
      }
      if(req.body.about){
        update.about = req.body.about;
      }
      let userToUpdate = await user.findOneAndUpdate(filter, update, {new : true});
      if (userToUpdate){
      const accessToken = jsonWebToken.sign({ userToUpdate}, process.env.ACCESS_TOKEN_SECRET);
      res.send({accessToken : accessToken});
      }else   {res.status(200).send({message : 'User updated!'});}
 })

 app.get('/users/:username', authenticateToken, async(req, res) => {
  let filter = {"accountDetails.username" : req.params.username};
  let loggedInUser = await user.findOne(filter);
  if (loggedInUser){
    res.status(200).send(loggedInUser)
  } else res.status(400).send({message: 'User not found'})
 })

app.listen(9000, () => console.log("Server started on port 9000"));