const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Bus = require('../models/Bus');
const auth = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
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
        console.error('Error fetching buses:', error);
        res.status(500).json({ message: 'Error fetching buses' });
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
        console.error('Error fetching bus:', error);
        res.status(500).json({ message: 'Error fetching bus' });
    }
});

// Create new bus (protected)
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, route, stops, schedule, fare, totalStops } = req.body;
        
        // Handle image upload
        let imageUrl = null;
        if (req.file) {
            imageUrl = `https://busseva-backend.onrender.com/uploads/${req.file.filename}`;
        }

        const bus = new Bus({
            name,
            route,
            stops: stops ? stops.split(',').map(stop => stop.trim()) : [],
            imageUrl: imageUrl || 'https://busseva-backend.onrender.com/uploads/default-bus.jpg', // Use default image if none uploaded
            schedule,
            fare,
            totalStops: totalStops || (stops ? stops.split(',').length.toString() : '0')
        });

        await bus.save();
        res.status(201).json(bus);
    } catch (error) {
        console.error('Error creating bus:', error);
        // Delete uploaded file if bus creation fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        res.status(500).json({ message: 'Error creating bus', error: error.message });
    }
});

// Update bus (protected)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, route, stops, schedule, fare } = req.body;
        const updateData = {
            name,
            route,
            stops: stops ? stops.split(',').map(stop => stop.trim()) : [],
            schedule,
            fare
        };

        // Handle image upload
        if (req.file) {
            updateData.imageUrl = `https://busseva-backend.onrender.com/uploads/${req.file.filename}`;
            
            // Delete old image if it exists and is not the default image
            const oldBus = await Bus.findById(req.params.id);
            if (oldBus && oldBus.imageUrl && !oldBus.imageUrl.includes('default-bus.jpg')) {
                const oldImagePath = path.join(uploadsDir, oldBus.imageUrl.split('/').pop());
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
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
        console.error('Error updating bus:', error);
        // Delete uploaded file if update fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        res.status(500).json({ message: 'Error updating bus', error: error.message });
    }
});

// Delete bus (protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Delete associated image if it exists and is not the default image
        if (bus.imageUrl && !bus.imageUrl.includes('default-bus.jpg')) {
            const imagePath = path.join(uploadsDir, bus.imageUrl.split('/').pop());
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }

        await Bus.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bus deleted successfully' });
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).json({ message: 'Error deleting bus', error: error.message });
    }
});

module.exports = router; 
