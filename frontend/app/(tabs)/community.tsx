import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TopBar } from '../../components/top-bar';
import { api } from '../../services/api';
import { useAuthSession } from '../../state/auth-session';
import type { CommunityAlert, CommunityAlertCategory } from '../../types/api';

export default function CommunityScreen() {
  const { user } = useAuthSession();
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CommunityAlertCategory>('construction');
  
  // Location mode states
  const [locationMode, setLocationMode] = useState<'current' | 'address'>('current');
  const [addressStr, setAddressStr] = useState('');
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Request & fetch device location on mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setDeviceLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        } else {
          // Fallback to UW Center
          setDeviceLocation({ lat: 47.6553, lng: -122.3035 });
        }
      } catch (err) {
        console.error('Failed to get device location:', err);
        setDeviceLocation({ lat: 47.6553, lng: -122.3035 });
      }
    };
    void loadLocation();
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCommunityAlerts();
      // Sort by newest first
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load community alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchAlerts();
    }, [fetchAlerts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchAlerts();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setFormError('Please fill in both title and description.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    let lat = 47.6553;
    let lng = -122.3035;

    try {
      if (locationMode === 'current') {
        if (deviceLocation) {
          lat = deviceLocation.lat;
          lng = deviceLocation.lng;
        } else {
          // Attempt a last-second quick fetch
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } else {
        // Address geocoding mode
        if (!addressStr.trim()) {
          setFormError('Please enter a street address, building, or intersection.');
          setIsSubmitting(false);
          return;
        }

        // Query the searchPlaces API to resolve the address to coordinates
        const suggestions = await api.searchPlaces(addressStr.trim());
        if (suggestions && suggestions.length > 0) {
          lat = suggestions[0].location.lat;
          lng = suggestions[0].location.lng;
        } else {
          setFormError('Could not resolve address. Please make it more specific (e.g. including city or campus name).');
          setIsSubmitting(false);
          return;
        }
      }

      const newAlert: CommunityAlert = {
        id: `c_${Math.random().toString(36).substring(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        category,
        location: { lat, lng },
        created_at: new Date().toISOString(),
        created_by: user?.full_name || user?.email || 'Anonymous Student',
        is_approved: true, // Auto-approved for this version
      };

      await api.createCommunityAlert(newAlert);
      
      // Reset form & close
      setTitle('');
      setDescription('');
      setCategory('construction');
      setAddressStr('');
      setLocationMode('current');
      setModalVisible(false);
      
      // Refresh feed
      void fetchAlerts();
    } catch (err) {
      console.error('Failed to submit community alert:', err);
      setFormError('Failed to submit. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryDetails = (cat: CommunityAlertCategory) => {
    switch (cat) {
      case 'construction':
        return { label: 'Construction', color: '#D97706', bg: '#FEF3C7', icon: 'barrier' };
      case 'danger':
        return { label: 'Danger', color: '#DC2626', bg: '#FEE2E2', icon: 'triangle-exclamation' };
      case 'warning':
        return { label: 'Warning', color: '#EA580C', bg: '#FFEDD5', icon: 'circle-exclamation' };
      default:
        return { label: 'Alert', color: '#4B5563', bg: '#F3F4F6', icon: 'note' };
    }
  };

  const renderAlertCard = ({ item }: { item: CommunityAlert }) => {
    const details = getCategoryDetails(item.category);
    const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: details.bg }]}>
            <Text style={[styles.badgeText, { color: details.color }]}>
              {item.category === 'construction' ? '🚧 ' : item.category === 'danger' ? '🚨 ' : '⚠️ '}
              {details.label}
            </Text>
          </View>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText}>
              {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <FontAwesome name="user-circle" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.created_by || 'Anonymous'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community Alerts</Text>
          <Text style={styles.subtitle}>Student-reported hazards around UW campus</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7B3FF3" />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertCard}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#AEAEB2" />
              <Text style={styles.emptyText}>No community alerts active right now.</Text>
              <Text style={styles.emptySubText}>Be the first to report construction or hazards!</Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={26} color="#FFF" />
        <Text style={styles.fabText}>Report</Text>
      </Pressable>

      {/* Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File Hazard Report</Text>
              <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </Pressable>
            </View>

            {formError ? (
              <View style={styles.formErrorContainer}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                <Pressable
                  style={[
                    styles.categoryBtn,
                    category === 'construction' && styles.categoryBtnActive,
                    category === 'construction' && { borderColor: '#D97706', backgroundColor: '#FEF3C7' },
                  ]}
                  onPress={() => setCategory('construction')}
                >
                  <Text style={[styles.categoryText, category === 'construction' && { color: '#B45309', fontWeight: '700' }]}>
                    🚧 Construction
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.categoryBtn,
                    category === 'warning' && styles.categoryBtnActive,
                    category === 'warning' && { borderColor: '#EA580C', backgroundColor: '#FFEDD5' },
                  ]}
                  onPress={() => setCategory('warning')}
                >
                  <Text style={[styles.categoryText, category === 'warning' && { color: '#C2410C', fontWeight: '700' }]}>
                    ⚠️ Warning
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.categoryBtn,
                    category === 'danger' && styles.categoryBtnActive,
                    category === 'danger' && { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
                  ]}
                  onPress={() => setCategory('danger')}
                >
                  <Text style={[styles.categoryText, category === 'danger' && { color: '#B91C1C', fontWeight: '700' }]}>
                    🚨 Danger
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Kane Hall Entrance Ramp Blocked"
                placeholderTextColor="#C7C7CC"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the hazard, accessibility issues, or construction works in detail..."
                placeholderTextColor="#C7C7CC"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Location</Text>
              <View style={styles.categoryRow}>
                <Pressable
                  style={[
                    styles.categoryBtn,
                    locationMode === 'current' && styles.categoryBtnActive,
                    locationMode === 'current' && { borderColor: '#7B3FF3', backgroundColor: '#F3E8FF' },
                  ]}
                  onPress={() => setLocationMode('current')}
                >
                  <Text style={[styles.categoryText, locationMode === 'current' && { color: '#7B3FF3', fontWeight: '700' }]}>
                    📍 Current Location
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.categoryBtn,
                    locationMode === 'address' && styles.categoryBtnActive,
                    locationMode === 'address' && { borderColor: '#7B3FF3', backgroundColor: '#F3E8FF' },
                  ]}
                  onPress={() => setLocationMode('address')}
                >
                  <Text style={[styles.categoryText, locationMode === 'address' && { color: '#7B3FF3', fontWeight: '700' }]}>
                    🔍 Custom Address
                  </Text>
                </Pressable>
              </View>

              {locationMode === 'current' ? (
                <View style={styles.gpsContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.gpsText}>
                    Using current GPS: {deviceLocation ? `${deviceLocation.lat.toFixed(4)}, ${deviceLocation.lng.toFixed(4)}` : 'Detecting...'}
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.coordSublabel}>Street Address, Building, or Intersection</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Kane Hall, 15th Ave NE & NE 43rd St"
                    placeholderTextColor="#C7C7CC"
                    value={addressStr}
                    onChangeText={setAddressStr}
                  />
                </View>
              )}

              <Pressable
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Note</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 0.37,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Safe space for FAB
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#3A3A3C',
    lineHeight: 20,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '50%',
  },
  metaText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#48484A',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: '80%',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#7B3FF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#7B3FF3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    paddingBottom: 20,
  },
  formErrorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 14,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  categoryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  categoryBtnActive: {
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  coordSublabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
    fontWeight: '600',
  },
  coordInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  gpsText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#7B3FF3',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
