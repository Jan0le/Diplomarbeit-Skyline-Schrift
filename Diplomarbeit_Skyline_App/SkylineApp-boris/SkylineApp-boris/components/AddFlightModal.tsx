import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddFlightModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddFlightModal: React.FC<AddFlightModalProps> = ({ visible, onClose }) => {
  const router = useRouter();

  const handleManualEntry = () => {
    onClose();
    router.push('/add-flight-manual');
  };

  const handleImportFlight = () => {
    onClose();
    router.push('/add-flight-import');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Flight</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Manual Entry Card */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleManualEntry}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#ff1900', '#cc1400']}
                style={styles.optionGradient}
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name="edit" size={32} color="#fff" />
                </View>
                <Text style={styles.optionTitle}>Enter Manually</Text>
                <Text style={styles.optionDescription}>
                  Fill in flight details step-by-step
                </Text>
                <View style={styles.optionArrow}>
                  <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Import Card */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleImportFlight}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.optionGradient}
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name="upload-file" size={32} color="#ff1900" />
                </View>
                <Text style={styles.optionTitle}>Import Flight</Text>
                <Text style={styles.optionDescription}>
                  Upload boarding pass or confirmation
                </Text>
                <View style={styles.optionArrow}>
                  <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.3)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    backgroundColor: '#000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    padding: 20,
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  optionGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionArrow: {
    alignSelf: 'flex-end',
  },
});

export default AddFlightModal;


