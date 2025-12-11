const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    datetime: { type: Date, required: true },
    reason: { type: String },
    place: { type: String },
    status: { type: String, default: 'requested', enum: ['requested', 'approved', 'rejected'] },
    rejectionReason: { type: String },
    attachments: [{
        filename: String,
        originalname: String,
        mimetype: String,
        size: Number,
        url: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
