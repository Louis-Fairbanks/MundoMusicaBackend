const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
    id: Number,
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
    photo: [mongoose.Schema.Types.Mixed],
    about: String,
    paymentProcessor: [mongoose.Schema.Types.Mixed]
})

module.exports = accountSchema;