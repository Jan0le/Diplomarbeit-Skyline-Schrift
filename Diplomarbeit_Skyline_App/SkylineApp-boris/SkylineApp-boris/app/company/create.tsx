import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { createCompanyForCurrentUser } from '../../services/companyService';

export default function CompanyCreateScreen() {
  const router = useRouter();
  const { user, isLoading, refreshMemberships } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isLoading, user]);

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Please enter a company name');
      return;
    }
    try {
      setSubmitting(true);
      await createCompanyForCurrentUser(trimmed);
      await refreshMemberships();
      Alert.alert('Success', 'Company created');
      router.replace('/company');
    } catch (e: any) {
      Alert.alert('Failed to create company', e?.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Create a Company</ThemedText>
      <View style={{ height: 12 }} />
      <ThemedText>Company name</ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Skyline GmbH"
        autoCapitalize="words"
        autoCorrect={false}
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#333',
          borderRadius: 8,
          marginTop: 8,
        }}
      />
      <View style={{ height: 12 }} />
      <Button title={submitting ? 'Creating…' : 'Create Company'} disabled={submitting} onPress={onCreate} />
      <View style={{ height: 12 }} />
      <Text style={{ opacity: 0.7 }}>You will become the owner of this company.</Text>
    </ThemedView>
  );
}



