import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { destinations } from '../data/destinations';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const ALL_TAGS = Array.from(new Set(destinations.flatMap(d => d.tags))).sort();

export default function DestinationsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredDestinations = useMemo(() => {
    return destinations.filter(destination => {
      const matchesSearch = searchQuery === '' || 
        destination.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        destination.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        destination.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => destination.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
            if (canGoBack) router.back(); else router.replace('/(tabs)/home');
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#ff1900" />
        </Pressable>
        <Text style={styles.title}>Top Destinations</Text>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#666" />
            </Pressable>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {ALL_TAGS.map(tag => (
            <Pressable
              key={tag}
              style={[
                styles.tag,
                selectedTags.includes(tag) && styles.tagSelected
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.tagTextSelected
              ]}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredDestinations.map((destination, index) => (
          <Animated.View
            key={destination.id}
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.card}
          >
            <Image
              source={{ uri: destination.image }}
              style={styles.image}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradient}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.name}>{destination.name}</Text>
                  <Text style={styles.country}>{destination.country}</Text>
                </View>
                <View style={styles.tags}>
                  {destination.tags.map((tag, idx) => (
                    <View key={idx} style={styles.cardTag}>
                      <Text style={styles.cardTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ))}
      </ScrollView>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,25,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  filterSection: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,25,0,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  tagsContainer: {
    maxHeight: 40,
  },
  tagsContent: {
    gap: 8,
    paddingRight: 16,
  },
  tag: {
    backgroundColor: 'rgba(255,25,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
  },
  tagSelected: {
    backgroundColor: '#ff1900',
    borderColor: '#ff1900',
  },
  tagText: {
    color: '#ff1900',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagTextSelected: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.1)',
    shadowColor: '#ff1900',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    height: '60%',
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  country: {
    color: '#ff1900',
    fontSize: 14,
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTag: {
    backgroundColor: 'rgba(255,25,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
  },
  cardTagText: {
    color: '#ff1900',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
}); 