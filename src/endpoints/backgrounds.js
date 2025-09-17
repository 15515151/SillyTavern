import fs from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import express from 'express';
import sanitize from 'sanitize-filename';

import { dimensions, invalidateThumbnail } from './thumbnails.js';
import { getImages as getUserImages } from '../util.js';
import { getFileNameValidationFunction } from '../middleware/validateFileName.js';
import { serverDirectory } from '../server-directory.js';

export const router = express.Router();

// Functions and routes for the login page background gallery
const galleryPath = path.join(serverDirectory, 'public', '图库');
const landscapePath = path.join(galleryPath, '横屏');
const portraitPath = path.join(galleryPath, '竖屏');

async function getGalleryImages(directoryPath) {
    try {
        const files = await readdir(directoryPath);
        // Filter out non-image files if necessary, though for now we assume all are images
        return files.filter(file => !file.startsWith('.')); // Ignore hidden files
    } catch (error) {
        // If the directory doesn't exist, return an empty array
        if (error.code === 'ENOENT') {
            console.warn(`Background directory not found: ${directoryPath}`);
            return [];
        }
        // For other errors, throw them
        throw error;
    }
}

router.get('/', async (req, res) => {
    try {
        const landscapeImages = await getGalleryImages(landscapePath);
        const portraitImages = await getGalleryImages(portraitPath);

        res.json({
            landscape: landscapeImages,
            portrait: portraitImages,
        });
    } catch (error) {
        console.error('Failed to get background images:', error);
        res.status(500).json({ error: 'Failed to retrieve background images.' });
    }
});


// Routes for user-specific background management
router.post('/all', function (request, response) {
    const images = getUserImages(request.user.directories.backgrounds);
    const config = { width: dimensions.bg[0], height: dimensions.bg[1] };
    response.json({ images, config });
});

router.post('/delete', getFileNameValidationFunction('bg'), function (request, response) {
    if (!request.body) return response.sendStatus(400);

    if (request.body.bg !== sanitize(request.body.bg)) {
        console.error('Malicious bg name prevented');
        return response.sendStatus(403);
    }

    const fileName = path.join(request.user.directories.backgrounds, sanitize(request.body.bg));

    if (!fs.existsSync(fileName)) {
        console.error('BG file not found');
        return response.sendStatus(400);
    }

    fs.unlinkSync(fileName);
    invalidateThumbnail(request.user.directories, 'bg', request.body.bg);
    return response.send('ok');
});

router.post('/rename', function (request, response) {
    if (!request.body) return response.sendStatus(400);

    const oldFileName = path.join(request.user.directories.backgrounds, sanitize(request.body.old_bg));
    const newFileName = path.join(request.user.directories.backgrounds, sanitize(request.body.new_bg));

    if (!fs.existsSync(oldFileName)) {
        console.error('BG file not found');
        return response.sendStatus(400);
    }

    if (fs.existsSync(newFileName)) {
        console.error('New BG file already exists');
        return response.sendStatus(400);
    }

    fs.copyFileSync(oldFileName, newFileName);
    fs.unlinkSync(oldFileName);
    invalidateThumbnail(request.user.directories, 'bg', request.body.old_bg);
    return response.send('ok');
});

router.post('/upload', function (request, response) {
    if (!request.body || !request.file) return response.sendStatus(400);

    const img_path = path.join(request.file.destination, request.file.filename);
    const filename = request.file.originalname;

    try {
        fs.copyFileSync(img_path, path.join(request.user.directories.backgrounds, filename));
        fs.unlinkSync(img_path);
        invalidateThumbnail(request.user.directories, 'bg', filename);
        response.send(filename);
    } catch (err) {
        console.error(err);
        response.sendStatus(500);
    }
});
