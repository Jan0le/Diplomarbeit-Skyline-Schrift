import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DocumentService from '../../services/documentService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { DocumentType, FileType, FlightDocument } from '../../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  flightId: string;
  userId: string;
  onUploadQueued?: (document: FlightDocument) => void;
  onUploadCompleted?: (localId: string, document: FlightDocument) => void;
  onUploadFailed?: (localId: string, message: string) => void;
};

type QueuedUpload = {
  uri: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  documentType?: DocumentType;
};

const inferFileType = (fileName: string, mimeType?: string): FileType => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const type = (mimeType || '').toLowerCase();
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'image';
  return 'other';
};

const inferMimeType = (fileName: string, mimeType?: string): string => {
  if (mimeType && mimeType.trim()) return mimeType;
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'application/octet-stream';
};

const inferDocumentType = (fileName: string, fallback?: DocumentType): DocumentType => {
  if (fallback) return fallback;
  const lower = fileName.toLowerCase();
  if (lower.includes('boarding')) return 'boarding_pass';
  if (lower.includes('booking') || lower.includes('confirmation') || lower.includes('reservation')) return 'booking_confirmation';
  if (lower.includes('receipt') || lower.includes('invoice')) return 'receipt';
  return 'other';
};

export default function DocumentUploadModal({
  visible,
  onClose,
  flightId,
  userId,
  onUploadQueued,
  onUploadCompleted,
  onUploadFailed,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const documentService = DocumentService.getInstance();

  const queueBackgroundUpload = (upload: QueuedUpload) => {
    if (!userId) {
      setUploading(false);
      Alert.alert('Error', 'You must be logged in to upload documents.');
      return;
    }

    const now = new Date();
    const localId = `local-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = upload.fileName || `document_${Date.now()}`;
    const mimeType = inferMimeType(fileName, upload.mimeType);
    const fileType = inferFileType(fileName, mimeType);
    const documentType = inferDocumentType(fileName, upload.documentType);

    const optimisticDocument: FlightDocument = {
      id: localId,
      flightId,
      profileId: userId,
      fileName,
      fileType,
      mimeType,
      fileSize: upload.fileSize || 0,
      storagePath: '',
      storageBucket: 'flight-documents',
      documentType,
      isCached: false,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    onUploadQueued?.(optimisticDocument);
    setUploading(false);
    onClose();

    setTimeout(async () => {
      try {
        const persisted = await documentService.uploadDocument(upload.uri, flightId, userId, {
          fileName,
          documentType,
        });
        onUploadCompleted?.(localId, persisted);
      } catch (error: any) {
        const message = error?.message || 'Failed to upload document';
        onUploadFailed?.(localId, message);
        Alert.alert('Error', message);
      }
    }, 0);
  };

  const handleUploadFromPicker = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      queueBackgroundUpload({
        uri: asset.uri,
        fileName: asset.name || `document_${Date.now()}`,
        mimeType: asset.mimeType || undefined,
        fileSize: typeof asset.size === 'number' ? asset.size : undefined,
      });
    } catch (error: any) {
      if (__DEV__) console.error('Upload error:', error);
      setUploading(false);
      Alert.alert('Error', error.message || 'Failed to upload document');
    }
  };

  const handleUploadFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }

      setUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      queueBackgroundUpload({
        uri: asset.uri,
        fileName: `boarding_pass_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        fileSize: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
        documentType: 'boarding_pass',
      });
    } catch (error: any) {
      if (__DEV__) console.error('Upload error:', error);
      setUploading(false);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    }
  };

  const handleUploadFromGallery = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      queueBackgroundUpload({
        uri: asset.uri,
        fileName: asset.fileName || `document_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        fileSize: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
      });
    } catch (error: any) {
      if (__DEV__) console.error('Upload error:', error);
      setUploading(false);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload Document</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.content}>
            {uploading ? (
              <View style={styles.uploading}>
                <ActivityIndicator size="large" color="#ff1900" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.options}>
                <Pressable
                  style={styles.option}
                  onPress={handleUploadFromPicker}
                >
                  <LinearGradient
                    colors={['rgba(255,25,0,0.15)', 'rgba(255,59,0,0.1)']}
                    style={styles.optionGradient}
                  >
                    <MaterialIcons name="description" size={32} color="#ff1900" />
                    <Text style={styles.optionText}>Choose File</Text>
                    <Text style={styles.optionSubtext}>PDF or Image</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={styles.option}
                  onPress={handleUploadFromGallery}
                >
                  <LinearGradient
                    colors={['rgba(255,25,0,0.15)', 'rgba(255,59,0,0.1)']}
                    style={styles.optionGradient}
                  >
                    <MaterialIcons name="photo-library" size={32} color="#ff1900" />
                    <Text style={styles.optionText}>From Gallery</Text>
                    <Text style={styles.optionSubtext}>Select image</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={styles.option}
                  onPress={handleUploadFromCamera}
                >
                  <LinearGradient
                    colors={['rgba(255,25,0,0.15)', 'rgba(255,59,0,0.1)']}
                    style={styles.optionGradient}
                  >
                    <MaterialIcons name="camera-alt" size={32} color="#ff1900" />
                    <Text style={styles.optionText}>Take Photo</Text>
                    <Text style={styles.optionSubtext}>Camera</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  uploading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  uploadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  options: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  optionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});

