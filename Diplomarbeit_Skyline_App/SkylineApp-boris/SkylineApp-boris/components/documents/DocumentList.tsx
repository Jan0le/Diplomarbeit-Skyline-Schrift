import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DocumentService from '../../services/documentService';
import { FlightDocument, DocumentType } from '../../types';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentViewerModal from './DocumentViewerModal';
import DocumentRenameModal from './DocumentRenameModal';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  flightId: string;
  hideFab?: boolean;
};

export default function DocumentList({ flightId, hideFab }: Props) {
  const { user } = useAuth();
  const documentService = DocumentService.getInstance();
  const [documents, setDocuments] = useState<FlightDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<FlightDocument | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<FlightDocument | null>(null);
  const [filter, setFilter] = useState<'all' | DocumentType>('all');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!flightId) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // Defer loading until after UI interactions + short delay for iOS wake (fixes loading when device was sleeping)
    const handle = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!cancelled && isMountedRef.current) void loadDocuments();
      }, 100);
    });
    return () => {
      cancelled = true;
      handle.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [flightId]);

  const loadDocuments = async () => {
    if (!flightId) {
      setLoading(false);
      setDocuments([]);
      return;
    }

    setLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout to prevent endless spinner
      timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setLoading(false);
          setDocuments([]);
        }
      }, 10000); // 10 second timeout

      const docs = await documentService.getDocumentsForFlight(flightId);
      
      // Clear timeout if request completed in time
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (isMountedRef.current) {
        setDocuments(docs || []);
      }
    } catch (error: any) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (__DEV__) console.error('[DocumentList] Error loading documents:', error);
      if (isMountedRef.current) {
        setDocuments([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDelete = (doc: FlightDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const previousDocuments = [...documents];
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

            setTimeout(async () => {
              try {
                await documentService.deleteDocument(doc.id);
              } catch {
                setDocuments(previousDocuments);
                Alert.alert('Error', 'Failed to delete document');
              }
            }, 0);
          },
        },
      ]
    );
  };

  const handleView = (doc: FlightDocument) => {
    setSelectedDocument(doc);
    setViewerModalOpen(true);
  };

  const handleRename = (doc: FlightDocument) => {
    setDocumentToRename(doc);
    setRenameModalOpen(true);
  };

  const handleRenameConfirm = (newFileName: string) => {
    if (!documentToRename) return;
    const targetDocument = documentToRename;
    const previousDocuments = [...documents];

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === targetDocument.id
          ? { ...d, fileName: newFileName, updatedAt: new Date() }
          : d
      )
    );
    setRenameModalOpen(false);
    setDocumentToRename(null);

    setTimeout(async () => {
      try {
        const persisted = await documentService.renameDocument(targetDocument.id, newFileName);
        setDocuments((prev) => prev.map((d) => (d.id === targetDocument.id ? persisted : d)));
      } catch {
        setDocuments(previousDocuments);
        Alert.alert('Error', 'Failed to rename document');
      }
    }, 0);
  };

  const isPendingUpload = (docId: string) => docId.startsWith('local-doc-');

  const getDocumentIcon = (docType: DocumentType, fileType: string) => {
    if (docType === 'boarding_pass') return 'confirmation-number';
    if (docType === 'booking_confirmation') return 'receipt';
    if (docType === 'receipt') return 'receipt-long';
    if (fileType === 'pdf') return 'picture-as-pdf';
    if (fileType === 'image') return 'image';
    return 'description';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.documentType === filter);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff1900" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable 
          onPress={() => setFilter('all')} 
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilter('boarding_pass')} 
          style={[styles.filterBtn, filter === 'boarding_pass' && styles.filterBtnActive]}
        >
          <Text style={[styles.filterText, filter === 'boarding_pass' && styles.filterTextActive]}>Boarding</Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilter('booking_confirmation')} 
          style={[styles.filterBtn, filter === 'booking_confirmation' && styles.filterBtnActive]}
        >
          <Text style={[styles.filterText, filter === 'booking_confirmation' && styles.filterTextActive]}>Booking</Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilter('receipt')} 
          style={[styles.filterBtn, filter === 'receipt' && styles.filterBtnActive]}
        >
          <Text style={[styles.filterText, filter === 'receipt' && styles.filterTextActive]}>Receipt</Text>
        </Pressable>
      </View>

      <View style={styles.scrollContainer}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.list} 
          showsVerticalScrollIndicator={false}
        >
          {filteredDocuments.map((doc, idx) => {
            const pending = isPendingUpload(doc.id);
            return (
            <Animated.View 
              key={doc.id} 
              entering={FadeInDown.delay(100 + idx * 80).springify()} 
              style={styles.card}
            >
              <LinearGradient 
                colors={["rgba(30,30,30,0.98)", "rgba(20,20,20,0.95)"]} 
                style={styles.cardGradient}
              >
                <Pressable 
                  onPress={() => !pending && handleView(doc)} 
                  style={[styles.cardContent, pending && styles.cardContentDisabled]}
                  disabled={pending}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleWrap}>
                      <MaterialIcons 
                        name={getDocumentIcon(doc.documentType, doc.fileType) as any} 
                        size={24} 
                        color={pending ? "rgba(255,255,255,0.4)" : "#ff1900"} 
                      />
                      <View style={styles.cardTitleContainer}>
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {doc.fileName}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {pending ? 'Uploading...' : `${formatFileSize(doc.fileSize)} • ${doc.fileType.toUpperCase()}${doc.isCached ? ' • Cached' : ''}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {doc.isCached && !pending && (
                        <MaterialIcons name="offline-pin" size={18} color="#4CAF50" />
                      )}
                      {!pending && (
                        <>
                          <Pressable onPress={() => handleRename(doc)} style={styles.iconBtn}>
                            <MaterialIcons name="edit" size={18} color="#2196F3" />
                          </Pressable>
                          <Pressable onPress={() => handleDelete(doc)} style={styles.iconBtn}>
                            <MaterialIcons name="delete" size={18} color="#ff1900" />
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                </Pressable>
              </LinearGradient>
            </Animated.View>
            );
          })}

          {filteredDocuments.length === 0 && (
            <View style={styles.empty}> 
              <MaterialIcons name="description" size={32} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>
                {documents.length === 0 ? 'No documents yet' : 'No documents in this category'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* FAB - Fixed at bottom right of container, always visible when user is logged in */}
        {user && (
          <Pressable 
            style={styles.fab} 
            onPress={() => setUploadModalOpen(true)}
          >
            <LinearGradient colors={["#ff1900", "#ff3b00"]} style={styles.fabGradient}>
              <MaterialIcons name="add" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <DocumentUploadModal
        visible={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
        }}
        flightId={flightId}
        userId={user?.id || ''}
        onUploadQueued={(pendingDoc) => {
          setDocuments((prev) => {
            const cleaned = prev.filter((d) => d.id !== pendingDoc.id);
            return [pendingDoc, ...cleaned];
          });
        }}
        onUploadCompleted={(localId, persistedDoc) => {
          setDocuments((prev) => {
            const cleaned = prev.filter((d) => d.id !== localId && d.id !== persistedDoc.id);
            return [persistedDoc, ...cleaned];
          });
        }}
        onUploadFailed={(localId, message) => {
          setDocuments((prev) => prev.filter((d) => d.id !== localId));
          if (!message) {
            Alert.alert('Error', 'Failed to upload document');
          }
        }}
      />

      <DocumentViewerModal
        visible={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        document={selectedDocument}
      />

      <DocumentRenameModal
        visible={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setDocumentToRename(null);
        }}
        document={documentToRename}
        onConfirm={handleRenameConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255,25,0,0.18)'
  },
  filterText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#fff'
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  cardContent: {
    width: '100%',
  },
  cardContentDisabled: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 1000,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Ensure it's not affected by parent transforms
    pointerEvents: 'box-none',
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

