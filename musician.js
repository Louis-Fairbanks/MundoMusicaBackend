const mongoose = require("mongoose");

const musicianSchema = new mongoose.Schema({
    instruments: [mongoose.Schema.Types.Mixed],
    reviews:[mongoose.Schema.Types.Mixed],
    projects: [mongoose.Schema.Types.Mixed],
})

module.exports = musicianSchema;