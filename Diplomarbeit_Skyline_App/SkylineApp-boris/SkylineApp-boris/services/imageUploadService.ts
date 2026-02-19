/**
 * 📸 IMAGE UPLOAD SERVICE
 * Handles image uploads to Supabase Storage
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './db';

class ImageUploadService {
  private static instance: ImageUploadService;
  private bucketName = 'profile-images';

  private constructor() {
    this.initializeBucket();
  }

  public static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  private async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      // Bucket check completed
    } catch (error) {
      // Error handled silently
    }
  }

  /**
   * Upload a profile image to Supabase Storage
   * @param imageUri - Local image URI from ImagePicker
   * @param userId - User ID for the filename
   * @returns Public URL of the uploaded image
   */
  async uploadProfileImage(imageUri: string, userId: string): Promise<string> {
    try {
      // Generate unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, bytes, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting
          contentType: `image/${fileExt}`,
        });

      if (error) {
        if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
          throw new Error(
            'Storage bucket not found. Please create the "profile-images" bucket in Supabase Storage dashboard.\n\n' +
            'Steps:\n' +
            '1. Go to Supabase Dashboard > Storage\n' +
            '2. Click "New bucket"\n' +
            '3. Name it "profile-images"\n' +
            '4. Make it Public\n' +
            '5. Set file size limit to 5MB\n' +
            '6. Run the storage policies SQL (see setup-storage.sql)'
          );
        } else if (error.message.includes('row-level security') || error.message.includes('access denied') || error.message.includes('new row violates')) {
          throw new Error(
            'Storage access denied. Storage policies need to be configured.\n\n' +
            'Please run the storage policies SQL in your Supabase SQL editor:\n\n' +
            'See the file: setup-storage-policies.sql\n\n' +
            'Or manually create policies in Supabase Dashboard:\n' +
            '1. Go to Storage > profile-images > Policies\n' +
            '2. Create policy: "Users can upload own images"\n' +
            '3. Policy: INSERT with check (bucket_id = \'profile-images\' AND auth.uid()::text = (storage.foldername(name))[1])\n' +
            '4. Create policy: "Users can delete own images"\n' +
            '5. Policy: DELETE with using (auth.uid()::text = (storage.foldername(name))[1])'
          );
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;

    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Delete a profile image from Supabase Storage
   * @param imageUrl - Public URL of the image to delete
   */
  async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const fileName = imageUrl.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid image URL');
      }

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        // Don't throw here as it's not critical if deletion fails
      }
    } catch (error) {
      // Error handled silently
    }
  }

  /**
   * Update profile image - upload new and delete old
   * @param newImageUri - New image URI from ImagePicker
   * @param oldImageUrl - Current image URL (optional)
   * @param userId - User ID
   * @returns New public URL
   */
  async updateProfileImage(
    newImageUri: string, 
    userId: string, 
    oldImageUrl?: string
  ): Promise<string> {
    try {
      // Upload new image
      const newImageUrl = await this.uploadProfileImage(newImageUri, userId);

      // Delete old image if it exists
      if (oldImageUrl && oldImageUrl.includes('supabase')) {
        await this.deleteProfileImage(oldImageUrl);
      }

      return newImageUrl;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if image URL is from Supabase Storage
   */
  isSupabaseImageUrl(url: string): boolean {
    return url.includes('supabase') && url.includes('storage');
  }

  /**
   * Get image upload progress (placeholder for future implementation)
   */
  async getUploadProgress(): Promise<number> {
    // This could be implemented with a progress callback in the future
    return 100;
  }
}

export default ImageUploadService;
