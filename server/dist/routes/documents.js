import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { getGridFsBucket } from '../db/gridfs';
import { ObjectId } from 'mongodb';
import { requireAuth, requireOwnRestaurant } from '../middleware/auth';
export const documentsRouter = express.Router();
// File validation for documents
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (_req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
        }
        // Sanitize filename
        file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100);
        cb(null, true);
    },
});
// GET /documents/:restaurantId - Get all documents with version history
documentsRouter.get('/:restaurantId', requireAuth, requireOwnRestaurant, async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId).lean();
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        const documents = restaurant.mediaRefs || [];
        // Group documents by category and menuType
        const grouped = {
            license: documents.filter(doc => doc.category === 'license'),
            menus: {},
            other: documents.filter(doc => doc.category === 'other'),
        };
        // Group menus by menuType
        documents
            .filter(doc => doc.category === 'menu')
            .forEach(doc => {
            const menuType = doc.menuType || 'general';
            if (!grouped.menus[menuType]) {
                grouped.menus[menuType] = [];
            }
            grouped.menus[menuType].push(doc);
        });
        res.json({ documents: grouped, all: documents });
    }
    catch (err) {
        next(err);
    }
});
// GET /documents/:restaurantId/current - Get only current active documents
documentsRouter.get('/:restaurantId/current', requireAuth, requireOwnRestaurant, async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId).lean();
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        const activeDocuments = (restaurant.mediaRefs || []).filter(doc => doc.isActive);
        res.json({ documents: activeDocuments });
    }
    catch (err) {
        next(err);
    }
});
// Upload schema validation
const uploadSchema = z.object({
    category: z.enum(['license', 'menu', 'other']),
    menuType: z.string().optional(),
});
// POST /documents/:restaurantId/upload - Upload new document
documentsRouter.post('/:restaurantId/upload', requireAuth, requireOwnRestaurant, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }
        const { category, menuType } = uploadSchema.parse(req.body);
        // Validate menuType is provided for menu category
        if (category === 'menu' && !menuType) {
            return res.status(400).json({ error: 'menuType is required for menu documents' });
        }
        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        restaurant.mediaRefs = restaurant.mediaRefs || [];
        // Determine version number and deactivate old documents
        let version = 1;
        if (category === 'license') {
            // For licenses, deactivate all previous licenses
            const licenseVersions = restaurant.mediaRefs.filter(doc => doc.category === 'license');
            if (licenseVersions.length > 0) {
                version = Math.max(...licenseVersions.map(doc => doc.version)) + 1;
                licenseVersions.forEach(doc => {
                    doc.isActive = false;
                });
            }
        }
        else if (category === 'menu' && menuType) {
            // For menus, deactivate previous menus of the same menuType
            const menuVersions = restaurant.mediaRefs.filter(doc => doc.category === 'menu' && doc.menuType === menuType);
            if (menuVersions.length > 0) {
                version = Math.max(...menuVersions.map(doc => doc.version)) + 1;
                menuVersions.forEach(doc => {
                    doc.isActive = false;
                });
            }
        }
        // Upload to GridFS
        const type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
        const bucket = getGridFsBucket();
        const stream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: {
                restaurantId: restaurant._id.toString(),
                type,
                category,
                menuType: menuType || null,
                version,
            },
        });
        stream.end(req.file.buffer);
        stream.on('finish', async () => {
            // Add new document reference
            restaurant.mediaRefs.push({
                fileId: stream.id,
                type: type,
                filename: stream.filename || req.file.originalname,
                contentType: req.file.mimetype,
                category: category,
                menuType: menuType || undefined,
                version,
                uploadedAt: new Date(),
                isActive: true,
            });
            await restaurant.save();
            res.json({
                success: true,
                document: {
                    id: stream.id,
                    filename: stream.filename || req.file.originalname,
                    contentType: req.file.mimetype,
                    type,
                    category,
                    menuType,
                    version,
                    uploadedAt: new Date(),
                    isActive: true,
                },
            });
        });
        stream.on('error', (err) => next(err));
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: err.errors });
        }
        next(err);
    }
});
// DELETE /documents/:restaurantId/:fileId - Delete a specific document version
documentsRouter.delete('/:restaurantId/:fileId', requireAuth, requireOwnRestaurant, async (req, res, next) => {
    try {
        const { restaurantId, fileId } = req.params;
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        // Find the document
        const docIndex = restaurant.mediaRefs?.findIndex(doc => doc.fileId.toString() === fileId);
        if (docIndex === undefined || docIndex === -1) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const document = restaurant.mediaRefs[docIndex];
        const wasActive = document.isActive;
        const documentCategory = document.category;
        const documentMenuType = document.menuType;
        // Delete from GridFS
        const bucket = getGridFsBucket();
        try {
            await bucket.delete(new ObjectId(fileId));
        }
        catch (gridFsErr) {
            console.error('Error deleting from GridFS:', gridFsErr);
            // Continue even if GridFS deletion fails
        }
        // Remove from restaurant's mediaRefs
        restaurant.mediaRefs.splice(docIndex, 1);
        // If this was the active document, promote the next most recent version
        if (wasActive && restaurant.mediaRefs) {
            // Find documents of the same category/menuType
            const sameTypeDocuments = restaurant.mediaRefs.filter(doc => {
                if (documentCategory === 'license') {
                    return doc.category === 'license';
                }
                else if (documentCategory === 'menu' && documentMenuType) {
                    return doc.category === 'menu' && doc.menuType === documentMenuType;
                }
                return false;
            });
            // If there are remaining documents, activate the one with the highest version
            if (sameTypeDocuments.length > 0) {
                const latestDoc = sameTypeDocuments.reduce((prev, current) => current.version > prev.version ? current : prev);
                latestDoc.isActive = true;
            }
        }
        await restaurant.save();
        res.json({
            success: true,
            message: 'Document deleted successfully',
            deleted: {
                fileId,
                filename: document.filename,
                category: document.category,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// PUT /documents/:restaurantId/menu/:fileId/type - Update menu type for a specific menu
documentsRouter.put('/:restaurantId/menu/:fileId/type', requireAuth, requireOwnRestaurant, async (req, res, next) => {
    try {
        const { restaurantId, fileId } = req.params;
        const { menuType } = req.body;
        if (!menuType || !menuType.trim()) {
            return res.status(400).json({ error: 'Menu type is required' });
        }
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        // Find the document
        const document = restaurant.mediaRefs?.find(doc => doc.fileId.toString() === fileId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Verify it's a menu document
        if (document.category !== 'menu') {
            return res.status(400).json({ error: 'Can only update menu type for menu documents' });
        }
        // Update the menu type
        document.menuType = menuType.trim().toLowerCase();
        await restaurant.save();
        res.json({
            success: true,
            message: 'Menu type updated successfully',
            document: {
                fileId: document.fileId.toString(),
                filename: document.filename,
                menuType: document.menuType,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
