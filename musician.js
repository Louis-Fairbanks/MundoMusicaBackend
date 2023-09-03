const mongoose = require('mongoose');

const musicianSchema = new mongoose.Schema({
    username : String,
    instruments : [String],
    participatingProjects : [String],
    media : [{
        associatedProject : String,
        file : [mongoose.Schema.Types.Mixed]
    }],
    pricing : String
})

module.exports = musicianSchema;