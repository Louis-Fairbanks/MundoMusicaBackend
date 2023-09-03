require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const accountSchema = require('./account.js');
const projectSchema = require('./project.js');
const musicianSchema = require('./musician.js');
const jsonWebToken = require('jsonwebtoken');
const { expressjwt : jwt} = require('express-jwt');
const bcrypt = require('bcrypt'); 
const cors= require('cors');
const crypto = require('crypto');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const methodOverride = require('method-override');
const path = require('path');
const ObjectId = require('mongoose').Types.ObjectId; 

const app = express();
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
  credentials: true
}))
//connect to db
const accountsDb = mongoose.createConnection("mongodb://127.0.0.1:27017/MundoMusicaAccounts", {
  useNewUrlParser : true,
  useUnifiedTopology: true
});
let gfs;
accountsDb.once('open', () => {
  //init stream
  gfs = new mongoose.mongo.GridFSBucket(accountsDb.db, {
      bucketName: 'uploads'
  });
})
//create storage engine

const storage = new GridFsStorage({
  url: 'mongodb://127.0.0.1:27017/MundoMusicaAccounts',
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

//make models for tables
const user = accountsDb.model("user", accountSchema);
const project = accountsDb.model("project", projectSchema);
const musician = accountsDb.model('musician', musicianSchema);
// dbTest = mongoose.createConnection("mongodb+srv://Louis:guitar1046@samplecluster.2vutl37.mongodb.net/")

// app.use("/protected", jwt({ secret: process.env.ACCESS_TOKEN_SECRET, algorithms : ["HS256"]}));

app.post('/login', async (req, res) => {          //login for users
    const requestedUsername = req.body.username;        //unique username that was inputted
    let isUserAllowed = false;
    const userToUpdate = await user.findOne({"accountDetails.username" : requestedUsername});
    if (!userToUpdate){
        return res.status(400).send({message : 'Cannot find user'})
    }
     try{
         if (await bcrypt.compare(req.body.password, userToUpdate.accountDetails.password)){ //comparing hashed passwords
             isUserAllowed = true;
         }else{
             isUserAllowed = false;
             return res.status(400).send({message : 'Password Incorrect'})
         }
     }catch(error){console.log(error)}

    const accessToken = jsonWebToken.sign({ userToUpdate}, process.env.ACCESS_TOKEN_SECRET);
    res.send({accessToken : accessToken});
})

function authenticateToken(req, res, next){             //authentication middleware
    const authHeader = req.headers['authorization'];        
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
            password : hashedPassword, email : req.body.email}, age : null, located : null, about: null, paymentProcessor : null});
          res.send({message : "User created!"});   //user created with information given at signup page
    }catch(err){
        res.send(err); //res.status(500).send()  send a blank message and set error status
    }
 })
 .delete();

 app.post('/users/:username', authenticateToken, async (req, res) => {   //updates fields that a user requested
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
      if (req.body.located){
        update.located = req.body.located;
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

 app.post('/projects', authenticateToken, async (req, res) => {
    let organizer = req.user.userToUpdate.accountDetails.username
    let filter = {"accountDetails.username" : organizer};
    let loggedInUser = await user.findOne(filter);
    if (!loggedInUser){
      res.status(400).send({message : 'Requested organizer not found'})
    } else{
      let today = new Date();
      let newProject = await project.create({organizer : organizer, name : req.body.projectName, participatingUsers : [organizer], description : req.body.description,
      instruments : req.body.instruments, media: null, created : today, deadline : req.body.deadline, public : req.body.visibility})
      res.status(200).send(newProject)
    }
 })

 app.get('/projects', authenticateToken, async (req, res) => {
  let filter = {"accountDetails.username" : req.user.userToUpdate.accountDetails.username};
  let loggedInUser = await user.findOne(filter);
  if (!loggedInUser){
    res.status(400).send({message : 'Requested user not found'})
  } else{
    let usersProjects = await project.find({organizer : req.user.userToUpdate.accountDetails.username});
    res.status(200).send(usersProjects);
  }
 })

 app.get('/users/:username', authenticateToken, async(req, res) => {    //return information on a user (to fill in account details)
  let filter = {"accountDetails.username" : req.params.username};
  let loggedInUser = await user.findOne(filter);
  if (loggedInUser){
    res.status(200).send(loggedInUser)
  } else res.status(400).send({message: 'User not found'})
 })

 app.get('/people/:username', async(req, res) =>{
  let filter = {"accountDetails.username" : req.params.username};
  let requestedUser = await user.findOne(filter);
  if (requestedUser){
    res.status(200).send(requestedUser)
  } else res.status(400).send({message: 'User not found'})
 })

 app.post('/musicians', authenticateToken, async(req, res) => {
    let newMusician = {username : req.user.userToUpdate.accountDetails.username, instruments : req.body.instruments,
    projects : [], media : []};
    if(req.body.project){
      newMusician.projects.push(req.body.project);
    }
    if(req.body.media){
      newMusician.projects.push(req.body.media);
    }
    if(req.body.pricing){
      newMusician.pricing = req.body.pricing
    }
    let createdMusician = await musician.create(newMusician);
    if(!createdMusician){
      res.status(200).send({message : 'Musician update not performed'})
    }
    res.status(400).send(createdMusician);
})
//upload images/videos
app.post('/upload', upload.single('file'), async (req, res) => {
  const filter = {'accountDetails.username' : req.body.username};
  const update = {photo : req.file.id};
  await user.findOneAndUpdate(filter, update, {new: true});
  res.status(200).json({file : req.file});
})

app.get('/files/:filename', async (req, res) => {
  try{
  const objectId = new ObjectId(req.params.filename)
  const file = await accountsDb.collection('uploads.files').findOne({_id : objectId});
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  const downloadStream = gfs.openDownloadStreamByName(file.filename);
  downloadStream.pipe(res);}
  catch(err){
    res.status(400).json({error: err})
  }
})

//finding photo filename for specific user
app.post('/photo', async(req, res)=>{
  const filter = {'accountDetails.username' : req.body.username};
  const photoUser = await user.findOne(filter);
  if(!photoUser){
    res.status(404).send({message: 'user not found'})
  }
  try{
  res.status(200).send({filename : photoUser.photo});}
  catch(err){
    res.send({err: err})
  }
})

app.delete('/files/:id', async (req, res) => {
  try {
    const objectId = new ObjectId(req.params.id)
    const file = await accountsDb.db.collection('uploads.files').findOne({_id : objectId});
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    await accountsDb.db.collection('uploads.files').deleteOne({ _id : objectId });
    await accountsDb.db.collection('uploads.chunks').deleteMany({ files_id : objectId});
    user.updateOne({'photo.filename' : fileId}, {$unset: {photo: 1}})
    
    res.status(200).send({message : 'files successfully deleted'});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/search', async (req, res) => {
  try{
    const searchTerms = req.body.searchBar.trim();
    const searchArray = searchTerms.split(/\s+/); 
    let filteredUsers = [];
    if (searchTerms === ''){
      filteredUsers = await user.find()
    }
    else{
      await Promise.all(
        searchArray.map(async (element) => {
          let sortedUsername = await user.find({ 'accountDetails.username': { $regex : new RegExp (element, 'i')}});
          filteredUsers = filteredUsers.concat(sortedUsername);
          let sortedfName = await user.find({ fName: {$regex : new RegExp (element, 'i')}});
          filteredUsers = filteredUsers.concat(sortedfName);
          let sortedlName = await user.find({ lName: {$regex : new RegExp (element, 'i')}});
          filteredUsers = filteredUsers.concat(sortedlName);
    })
      );
  }
  const uniqueArray = Array.from(new Set(filteredUsers.map(user => user._id.toString())))
  .map(id => filteredUsers.find(user => user._id.toString() === id));
    res.status(200).send(uniqueArray);
  }catch(err){
    res.status(500).json({error : err.message})
  }
})

app.get('/musicians/:username', async (req, res) =>{
  try{
  const requestedMusician = await musician.findOne({username : req.params.username})
  if(requestedMusician){
    res.status(200).send(requestedMusician)
  } else res.status(404).send({message : 'uer not found'})
}catch(err){
  res.status(500).send({error : err})
}
})
app.post('/musicians/:username', async (req, res) => {
  try{
    const filter = {username : req.body.username}
    const update = ({username : req.body.username,
      instruments : req.body.instrumentArray, pricing: req.body.finalPricing, })
    const updatedMusician = await musician.findOneAndUpdate(filter, update, {new : true})
    if(!updatedMusician){
      const createdMusician = await musician.create(update)
      res.status(200).send(createdMusician)
    }
      res.status(200).send(updatedMusician)
  }catch(err){
    res.status(500).send({error : err})
  }
})


app.listen(9000, () => console.log("Server started on port 9000"));