const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
    fName: { type: String,
        required: true},
    lName: { type: String,
        required: true},
    joined: Date,
    accountDetails: {
        username: String,
        password: String,
        email: String
    },
    age: {type : Number,
        min : [0, 'Please enter a valid age']},
    located: String,
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
    about: String,
    paymentProcessor: [mongoose.Schema.Types.Mixed]
})

module.exports = accountSchema;