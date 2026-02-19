/**
 * 📄 DOCUMENT SERVICE
 * Handles flight document uploads, downloads, and management
 * Part of FA-02: Dokumentenablage implementation
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './db';
import { FlightDocument, DocumentType, FileType } from '../types';

class DocumentService {
  private static instance: DocumentService;
  private bucketName = 'flight-documents';
  private signedUrlExpirationSeconds = 3600; // 1 hour

  private constructor() {
    this.initializeBucket();
  }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  private async initializeBucket() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      // Bucket check completed
    } catch (error) {
      // Error handled silently
    }
  }

  /**
   * Determine file type from MIME type
   */
  private getFileTypeFromMime(mimeType: string): FileType {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'other';
  }

  /**
   * Determine document type from file name
   */
  private detectDocumentType(fileName: string): DocumentType {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('boarding') || lowerName.includes('boarding-pass')) {
      return 'boarding_pass';
    }
    if (lowerName.includes('booking') || lowerName.includes('confirmation') || lowerName.includes('reservation')) {
      return 'booking_confirmation';
    }
    if (lowerName.includes('receipt') || lowerName.includes('invoice')) {
      return 'receipt';
    }
    return 'other';
  }

  /**
   * Generate storage path: {userId}/{flightId}/{documentId}.{ext}
   */
  private generateStoragePath(userId: string, flightId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${flightId}/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Upload a document to Supabase Storage and save metadata to database
   */
  async uploadDocument(
    fileUri: string,
    flightId: string,
    userId: string,
    options?: {
      fileName?: string;
      documentType?: DocumentType;
    }
  ): Promise<FlightDocument> {
    try {
      // Get file info (using legacy API)
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Determine MIME type from file extension
      const fileExt = fileUri.split('.').pop()?.toLowerCase() || '';
      const mimeType = this.getMimeTypeFromExtension(fileExt);
      const fileType = this.getFileTypeFromMime(mimeType);

      // Generate file name if not provided
      const fileName = options?.fileName || `document_${Date.now()}.${fileExt}`;
      const documentType = options?.documentType || this.detectDocumentType(fileName);

      // Generate storage path
      const storagePath = this.generateStoragePath(userId, flightId, fileName);

      // Read file
      let fileData: Uint8Array;
      if (fileType === 'image') {
        // For images, read as base64 and convert
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binaryString = atob(base64);
        fileData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          fileData[i] = binaryString.charCodeAt(i);
        }
      } else {
        // For PDFs and other files, read as base64
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binaryString = atob(base64);
        fileData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          fileData[i] = binaryString.charCodeAt(i);
        }
      }

      const fileSize = fileInfo.size || fileData.length;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(storagePath, fileData, {
          cacheControl: '3600',
          contentType: mimeType,
          upsert: false, // Don't overwrite existing files
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(
            'Storage bucket not found. Please create the "flight-documents" bucket in Supabase Storage dashboard.\n\n' +
            'See: scripts/migration_add_flight_documents.sql for setup instructions'
          );
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get signed URL (for private buckets)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.signedUrlExpirationSeconds);

      const { data: signedUrlData } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, this.signedUrlExpirationSeconds);

      // Save metadata to database
      const { data: docData, error: dbError } = await supabase
        .from('flight_documents')
        .insert({
          flight_id: flightId,
          profile_id: userId,
          file_name: fileName,
          file_type: fileType,
          mime_type: mimeType,
          file_size: fileSize,
          storage_path: storagePath,
          storage_bucket: this.bucketName,
          signed_url: signedUrlData?.signedUrl || null,
          signed_url_expires_at: signedUrlData?.signedUrl ? expiresAt.toISOString() : null,
          document_type: documentType,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup: delete uploaded file if DB insert fails
        await supabase.storage.from(this.bucketName).remove([storagePath]);
        throw new Error(`Failed to save document metadata: ${dbError.message}`);
      }

      return this.mapDbRowToFlightDocument(docData);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Upload document from file picker
   */
  async uploadFromPicker(flightId: string, userId: string): Promise<FlightDocument> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Document picker was canceled');
      }

      const asset = result.assets[0];
      return await this.uploadDocument(asset.uri, flightId, userId, {
        fileName: asset.name,
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Upload document from image picker (for photos of boarding passes, etc.)
   */
  async uploadFromImagePicker(flightId: string, userId: string): Promise<FlightDocument> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Image picker was canceled');
      }

      const asset = result.assets[0];
      return await this.uploadDocument(asset.uri, flightId, userId, {
        fileName: `boarding_pass_${Date.now()}.jpg`,
        documentType: 'boarding_pass',
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get all documents for a flight
   */
  async getDocumentsForFlight(flightId: string): Promise<FlightDocument[]> {
    try {
      if (!flightId) {
        return [];
      }

      // Fetch documents for this flight
      // Note: RLS policy should allow access if:
      // 1. User owns the document (auth.uid() = profile_id)
      // 2. User is member of company (if flight has company_id)
      const { data, error } = await supabase
        .from('flight_documents')
        .select('*')
        .eq('flight_id', flightId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (__DEV__) console.error('[DocumentService] Error fetching documents:', error.message);
        return [];
      }

      return (data || []).map(row => this.mapDbRowToFlightDocument(row));
    } catch (error: any) {
      if (__DEV__) console.error('[DocumentService] Exception in getDocumentsForFlight:', error);
      return [];
    }
  }

  /**
   * Get a signed URL for a document (refreshes if expired)
   */
  async getDocumentUrl(documentId: string): Promise<string> {
    try {
      // Reject local/pending document IDs (not in DB yet)
      if (documentId.startsWith('local-doc-')) {
        throw new Error('Document is still uploading. Please wait.');
      }

      // First, get document from DB
      const { data: doc, error: fetchError } = await supabase
        .from('flight_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !doc) {
        const hint = fetchError?.code === 'PGRST116' ? ' (may have been deleted)' : '';
        throw new Error('Document not found' + hint);
      }

      // Check if signed URL is still valid
      if (doc.signed_url && doc.signed_url_expires_at) {
        const expiresAt = new Date(doc.signed_url_expires_at);
        const now = new Date();
        if (expiresAt > now) {
          // Still valid, return existing URL
          return doc.signed_url;
        }
      }

      // Generate new signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(doc.storage_path, this.signedUrlExpirationSeconds);

      if (urlError || !signedUrlData?.signedUrl) {
        throw new Error('Failed to generate signed URL');
      }

      // Update database with new URL
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.signedUrlExpirationSeconds);

      await supabase
        .from('flight_documents')
        .update({
          signed_url: signedUrlData.signedUrl,
          signed_url_expires_at: expiresAt.toISOString(),
        })
        .eq('id', documentId);

      return signedUrlData.signedUrl;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Download and cache document for offline access
   */
  async cacheDocument(documentId: string): Promise<string> {
    try {
      const url = await this.getDocumentUrl(documentId);

      // Get document metadata
      const { data: doc } = await supabase
        .from('flight_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!doc) {
        throw new Error('Document not found');
      }

      // Create cache directory if it doesn't exist
      const cacheDir = `${FileSystem.cacheDirectory}documents/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }
      } catch (error) {
        // Directory might already exist, ignore
      }

      // Download file
      const fileName = doc.file_name;
      const cachePath = `${cacheDir}${documentId}_${fileName}`;

      const { uri } = await FileSystem.downloadAsync(url, cachePath);

      // Update database with cache info
      await supabase
        .from('flight_documents')
        .update({
          is_cached: true,
          cache_path: uri,
        })
        .eq('id', documentId);

      return uri;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document to get storage path
      const { data: doc, error: fetchError } = await supabase
        .from('flight_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !doc) {
        throw new Error('Document not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.bucketName)
        .remove([doc.storage_path]);

      if (storageError) {
        // Continue to delete from DB even if storage delete fails
      }

      // Delete cached file if exists
      if (doc.cache_path) {
        try {
          await FileSystem.deleteAsync(doc.cache_path, { idempotent: true });
        } catch (cacheError) {
          // Error handled silently
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('flight_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw new Error(`Failed to delete document: ${dbError.message}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Rename a document
   */
  async renameDocument(documentId: string, newFileName: string): Promise<FlightDocument> {
    try {
      const { data, error } = await supabase
        .from('flight_documents')
        .update({ 
          file_name: newFileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to rename document: ${error.message}`);
      }

      return this.mapDbRowToFlightDocument(data);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get cached document path (for offline access)
   */
  async getCachedDocumentPath(documentId: string): Promise<string | null> {
    try {
      const { data: doc } = await supabase
        .from('flight_documents')
        .select('cache_path, is_cached')
        .eq('id', documentId)
        .single();

      if (!doc || !doc.is_cached || !doc.cache_path) {
        return null;
      }

      // Check if cached file still exists
      const fileInfo = await FileSystem.getInfoAsync(doc.cache_path);
      if (!fileInfo.exists) {
        // Update DB to reflect that cache is gone
        await supabase
          .from('flight_documents')
          .update({ is_cached: false, cache_path: null })
          .eq('id', documentId);
        return null;
      }

      return doc.cache_path;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Map database row to FlightDocument
   */
  private mapDbRowToFlightDocument(row: any): FlightDocument {
    return {
      id: row.id,
      flightId: row.flight_id,
      profileId: row.profile_id,
      fileName: row.file_name,
      fileType: row.file_type,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      storageBucket: row.storage_bucket,
      publicUrl: row.public_url || undefined,
      signedUrl: row.signed_url || undefined,
      signedUrlExpiresAt: row.signed_url_expires_at ? new Date(row.signed_url_expires_at) : undefined,
      documentType: row.document_type,
      isCached: row.is_cached || false,
      cachePath: row.cache_path || undefined,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Helper: Get MIME type from file extension
   */
  private getMimeTypeFromExtension(ext: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}

export default DocumentService;

