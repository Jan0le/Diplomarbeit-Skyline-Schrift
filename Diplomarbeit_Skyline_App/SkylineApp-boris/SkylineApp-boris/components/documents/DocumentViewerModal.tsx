import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import DocumentService from '../../services/documentService';
import { FlightDocument } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  visible: boolean;
  onClose: () => void;
  document: FlightDocument | null;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DocumentViewerModal({ visible, onClose, document }: Props) {
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const documentService = DocumentService.getInstance();

  useEffect(() => {
    if (visible && document) {
      loadDocument();
    } else {
      // Reset state when modal closes
      setDocumentUrl(null);
      setError(null);
      setImageLoaded(false);
      setLoading(true);
    }
  }, [visible, document]);

  const isPendingUpload = (docId: string) => docId.startsWith('local-doc-');

  const loadDocument = async () => {
    if (!document) return;

    if (isPendingUpload(document.id)) {
      setError('Document is still uploading. Please wait.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, try to get cached document
      const cachedPath = await documentService.getCachedDocumentPath(document.id);
      if (cachedPath) {
        setDocumentUrl(cachedPath);
        setLoading(false);
        setImageLoaded(document.fileType !== 'image');
        return;
      }

      // If not cached, get signed URL and optionally cache it
      const url = await documentService.getDocumentUrl(document.id);
      setDocumentUrl(url);
      setLoading(false);
      setImageLoaded(document.fileType !== 'image');

      // Cache in background (don't block display)
      documentService.cacheDocument(document.id).catch(() => {
        // Caching is optional, ignore failures
      });
    } catch (error: any) {
      if (__DEV__) console.error('Error loading document:', error);
      setError(error.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      Alert.alert(
        'Download',
        'Document will be cached for offline access.',
        [{ text: 'OK' }]
      );
      await documentService.cacheDocument(document.id);
      Alert.alert('Success', 'Document cached for offline access');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to cache document');
    }
  };

  const getDocumentTypeIcon = (doc: FlightDocument) => {
    if (doc.fileType === 'pdf') return 'picture-as-pdf';
    if (doc.fileType === 'image') return 'image';
    return 'description';
  };

  if (!document) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'transparent']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <MaterialIcons 
                  name={getDocumentTypeIcon(document) as any} 
                  size={24} 
                  color="#ff1900" 
                />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {document.fileName}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {document.documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={handleDownload} style={styles.headerBtn}>
                  <MaterialIcons name="download" size={24} color="#fff" />
                </Pressable>
                <Pressable onPress={onClose} style={styles.headerBtn}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff1900" />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#ff1900" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={loadDocument} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && documentUrl && (
            <>
              {document.fileType === 'pdf' ? (
                <View style={styles.pdfContainer}>
                  <MaterialIcons name="picture-as-pdf" size={80} color="#ff1900" />
                  <Text style={styles.pdfTitle}>PDF Document</Text>
                  <Text style={styles.pdfSubtitle}>{document.fileName}</Text>
                  <Pressable
                    style={styles.openPdfBtn}
                    onPress={async () => {
                      try {
                        await WebBrowser.openBrowserAsync(documentUrl, {
                          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                        });
                      } catch (err) {
                        Alert.alert('Error', 'Failed to open PDF');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={['#ff1900', '#ff3b00']}
                      style={styles.openPdfBtnGradient}
                    >
                      <MaterialIcons name="open-in-new" size={20} color="#fff" />
                      <Text style={styles.openPdfBtnText}>Open in Browser</Text>
                    </LinearGradient>
                  </Pressable>
                  <Text style={styles.pdfNote}>
                    PDFs are opened in your browser for the best viewing experience.
                  </Text>
                </View>
              ) : document.fileType === 'image' ? (
                <View style={styles.imageWrapper}>
                  {!imageLoaded && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="large" color="#ff1900" />
                      <Text style={styles.loadingText}>Loading image...</Text>
                    </View>
                  )}
                  <ScrollView
                    contentContainerStyle={styles.imageContainer}
                    maximumZoomScale={5}
                    minimumZoomScale={1}
                  >
                    <Image
                      source={{ uri: documentUrl }}
                      style={styles.image}
                      contentFit="contain"
                      transition={200}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => {
                        setError('Failed to load image');
                        setImageLoaded(true);
                      }}
                    />
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="description" size={48} color="#ff1900" />
                  <Text style={styles.errorText}>Unsupported file type</Text>
                  <Text style={styles.errorSubtext}>
                    This file type cannot be previewed. Use the download button to view it.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ff1900',
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  pdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  pdfTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  pdfSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  pdfNote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  openPdfBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  openPdfBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  openPdfBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
});

