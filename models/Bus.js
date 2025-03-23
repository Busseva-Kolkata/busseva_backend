const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    route: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    stops: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    schedule: {
        type: String,
        trim: true
    },
    fare: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const Bus = mongoose.model('Bus', busSchema);
module.exports = Bus; 