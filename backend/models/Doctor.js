const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    availability: [{
        datetime: { type: Date, required: true }, // Using Date object for easier queries
        place: { type: String },
        booked: { type: Boolean, default: false }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
