import { Router } from 'express';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { serverDirectory } from '../server-directory.js';

const router = Router();

const galleryPath = path.join(serverDirectory, 'public', '图库');
const landscapePath = path.join(galleryPath, '横屏');
const portraitPath = path.join(galleryPath, '竖屏');

async function getImages(directoryPath) {
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
        const landscapeImages = await getImages(landscapePath);
        const portraitImages = await getImages(portraitPath);

        res.json({
            landscape: landscapeImages,
            portrait: portraitImages,
        });
    } catch (error) {
        console.error('Failed to get background images:', error);
        res.status(500).json({ error: 'Failed to retrieve background images.' });
    }
});

export { router };
