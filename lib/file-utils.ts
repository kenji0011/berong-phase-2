import fs from 'fs';
import path from 'path';

/**
 * Safely deletes a file from the public/uploads directory based on its URL.
 * 
 * For Base64 data URLs (data:image/...), no deletion is needed since the data
 * is stored directly in the database and will be removed with the record.
 * 
 * For legacy file paths (/uploads/...), attempts to delete from filesystem.
 * 
 * @param fileUrl The URL of the file to delete (e.g., /uploads/image.jpg or data:image/...)
 * @returns boolean indicating if deletion was attempted/needed
 */
export async function deleteUploadedFile(fileUrl: string | null | undefined): Promise<boolean> {
    if (!fileUrl) return false;

    // Base64 data URLs are stored in the database, not the filesystem
    // No deletion needed - the data will be removed when the database record is deleted
    if (fileUrl.startsWith('data:')) {
        return true; // No-op, but return true since "cleanup" is successful
    }

    // Legacy: Handle file paths (for backwards compatibility with existing uploads)
    try {
        const uploadsDir = path.join(process.cwd(), 'public');
        const cleanUrl = fileUrl.split('?')[0];
        const filePath = path.join(uploadsDir, cleanUrl);

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return true;
        } else {
            console.warn(`File not found for deletion: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`Error deleting file ${fileUrl}:`, error);
        return false;
    }
}
