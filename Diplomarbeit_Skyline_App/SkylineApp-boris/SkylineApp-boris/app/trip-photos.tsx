import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface TripPhoto {
  id: string;
  uri: string;
  timestamp: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TripPhotos() {
  const { id } = useLocalSearchParams();
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [id]);

  const loadPhotos = async () => {
    try {
      const photosData = await AsyncStorage.getItem(`trip_photos_${id}`);
      if (photosData) {
        setPhotos(JSON.parse(photosData));
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePhotos = (newPhotos: TripPhoto[]) => {
    setPhotos(newPhotos);
    void AsyncStorage.setItem(`trip_photos_${id}`, JSON.stringify(newPhotos)).catch((error) => {
      if (__DEV__) console.error('Error saving photos:', error);
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhoto: TripPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        timestamp: Date.now(),
      };
      savePhotos([...photos, newPhoto]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhoto: TripPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        timestamp: Date.now(),
      };
      savePhotos([...photos, newPhoto]);
    }
  };

  const deletePhoto = (photoId: string) => {
    const newPhotos = photos.filter(photo => photo.id !== photoId);
    savePhotos(newPhotos);
  };

  const renderRightActions = (photoId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deletePhoto(photoId)}
      >
        <MaterialIcons name="delete" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
            if (canGoBack) router.back(); else router.replace('/(tabs)/home');
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Photos</Text>
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => {
            const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
            if (canGoBack) router.back(); else router.replace('/(tabs)/home');
          }}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={takePhoto}>
            <MaterialIcons name="camera-alt" size={24} color="#fff" />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={pickImage}>
            <MaterialIcons name="photo-library" size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="photo" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No photos yet</Text>
            <Text style={styles.emptyStateSubtext}>Add photos to remember your trip</Text>
          </View>
        ) : (
          <GestureHandlerRootView>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.photoScroll}
              contentContainerStyle={styles.photoScrollContent}
            >
              {photos.map((photo) => (
                <Swipeable
                  key={photo.id}
                  renderRightActions={() => renderRightActions(photo.id)}
                  overshootRight={false}
                >
                  <TouchableOpacity
                    style={styles.photoContainer}
                    onPress={() => {
                      setSelectedPhoto(photo);
                      setIsPreviewVisible(true);
                    }}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoDate}>
                        {new Date(photo.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </ScrollView>
          </GestureHandlerRootView>
        )}
      </View>

      <Modal
        visible={isPreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsPreviewVisible(false)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ff1900',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#ff1900',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoScroll: {
    flex: 1,
  },
  photoScrollContent: {
    paddingRight: 16,
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  photoDate: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  deleteAction: {
    backgroundColor: '#ff1900',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 160,
    borderRadius: 12,
    marginRight: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 