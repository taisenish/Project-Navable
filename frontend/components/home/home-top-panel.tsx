import AntDesign from '@expo/vector-icons/AntDesign';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { homeStyles as styles } from '../../styles/home.styles';
import type { PlaceSuggestion } from '../../types/api';

type HomeTopPanelProps = {
  searchQuery: string;
  isSearching: boolean;
  hasSearchResults: boolean;
  searchResults: PlaceSuggestion[];
  showSelectedPlaceIntroCard: boolean;
  selectedPlace: PlaceSuggestion | null;
  routeSummary: string | null;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onStartNavigation: () => void;
  onCancelRoute: () => void;
};

export function HomeTopPanel({
  searchQuery,
  isSearching,
  hasSearchResults,
  searchResults,
  showSelectedPlaceIntroCard,
  selectedPlace,
  routeSummary,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  onSelectPlace,
  onStartNavigation,
  onCancelRoute,
}: HomeTopPanelProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <View style={styles.logoBubble}>
          <Image source={require('../../assets/images/navable_logo.png')} style={styles.logo} />
        </View>
        <View>
          <Text style={styles.brandTitle}>NavAble</Text>
          <Text style={styles.brandSubtitle}>Accessible Campus Navigation</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search address or place..."
          placeholderTextColor="#E9D8FF"
          accessibilityLabel="Search buildings and facilities"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
        />

        {searchQuery.trim().length > 0 ? (
          <Pressable
            style={styles.searchClearButton}
            onPress={onClearSearch}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <AntDesign name="close-circle" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {isSearching ? <ActivityIndicator style={styles.searchLoader} color="#FFFFFF" /> : null}

        {hasSearchResults ? (
          <View style={styles.searchResults}>
            <ScrollView
              style={styles.searchResultsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator>
              {searchResults.map((item) => (
                <Pressable key={item.place_id} style={styles.searchResultItem} onPress={() => onSelectPlace(item)}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultAddress}>{item.address}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {showSelectedPlaceIntroCard ? (
        <View style={styles.selectedPlaceCard}>
          <View style={styles.selectedPlaceTextWrap}>
            <Text style={styles.selectedPlaceName}>{selectedPlace?.name ?? ''}</Text>
            <Text style={styles.selectedPlaceAddress}>{selectedPlace?.address ?? ''}</Text>
            {routeSummary ? <Text style={styles.selectedPlaceMeta}>{routeSummary}</Text> : null}
          </View>
          <View style={styles.selectedPlaceActionStack}>
            <Pressable
              style={styles.selectedPlaceCancelButton}
              onPress={onCancelRoute}
              accessibilityRole="button"
              accessibilityLabel="Cancel route">
              <Text style={styles.selectedPlaceCancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.selectedPlaceButton}
              onPress={onStartNavigation}
              accessibilityRole="button"
              accessibilityLabel="Start navigation">
              <Text style={styles.selectedPlaceButtonText}>Start</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
