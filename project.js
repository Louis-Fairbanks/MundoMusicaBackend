const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    organizer : { type: String,
    required : true},
    name : {type: String,
    required : true},
    participatingUsers : [[String]],
    description : String,
    instruments: [[String]],
    media : [mongoose.Schema.Types.Mixed],
    created : Date,
    deadline : String,
    public : {
        type: Boolean,
        required : true
    }
})

module.exports = projectSchema;