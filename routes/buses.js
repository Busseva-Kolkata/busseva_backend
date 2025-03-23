const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Bus = require('../models/Bus');
const auth = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Get all buses
router.get('/', async (req, res) => {
    try {
        const buses = await Bus.find().sort({ createdAt: -1 });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single bus
router.get('/:id', async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new bus (protected route)
router.post('/', auth, upload.single('busImage'), async (req, res) => {
    try {
        const { name, route, stops, status, schedule, fare } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a bus image' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        const stopsArray = stops.split(',').map(stop => stop.trim());

        const bus = new Bus({
            name,
            route,
            imageUrl,
            stops: stopsArray,
            status,
            schedule,
            fare
        });

        await bus.save();
        res.status(201).json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update bus (protected route)
router.put('/:id', auth, upload.single('busImage'), async (req, res) => {
    try {
        const { name, route, stops, status, schedule, fare } = req.body;
        const updateData = { name, route, stops, status, schedule, fare };

        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }

        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete bus (protected route)
router.delete('/:id', auth, async (req, res) => {
    try {
        const bus = await Bus.findByIdAndDelete(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json({ message: 'Bus deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 