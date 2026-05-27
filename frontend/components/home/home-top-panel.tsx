import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  routeDistanceText: string | null;
  routeArrivalText: string | null;
  walkRouteSummary: string | null;
  hasDirections: boolean;
  isRouting: boolean;
  routeMode: 'walk' | 'bus' | 'bike';
  hasBusOption: boolean;
  busRouteSummary: string | null;
  hasBikeOption: boolean;
  bikeRouteSummary: string | null;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onSelectRouteMode: (mode: 'walk' | 'bus' | 'bike') => void;
  onRequestDirections: () => void;
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
  routeDistanceText,
  routeArrivalText,
  walkRouteSummary,
  hasDirections,
  isRouting,
  routeMode,
  hasBusOption,
  busRouteSummary,
  hasBikeOption,
  bikeRouteSummary,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  onSelectPlace,
  onSelectRouteMode,
  onRequestDirections,
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

      {!hasDirections ? (
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
      ) : null}

      {showSelectedPlaceIntroCard ? (
        <View style={[styles.selectedPlaceCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={styles.selectedPlaceTextWrap}>
              <Text style={styles.selectedPlaceName}>{selectedPlace?.name ?? ''}</Text>
              {hasDirections ? (
                <>
                  {routeArrivalText ? <Text style={styles.selectedPlaceAddress}>{routeArrivalText}</Text> : null}
                  {routeDistanceText ? <Text style={styles.selectedPlaceMeta}>{routeDistanceText}</Text> : null}
                </>
              ) : (
                <>
                  <Text style={styles.selectedPlaceAddress}>{selectedPlace?.address ?? ''}</Text>
                  <Text style={styles.selectedPlaceMeta}>{selectedPlace?.hours_text ?? 'Hours unavailable'}</Text>
                </>
              )}
            </View>
            <View style={styles.selectedPlaceActionStack}>
              <Pressable
                style={styles.selectedPlaceCancelButton}
                onPress={onCancelRoute}
                accessibilityRole="button"
                accessibilityLabel="Cancel route">
                <Text style={styles.selectedPlaceCancelButtonText}>Cancel</Text>
              </Pressable>
              {hasDirections ? (
                <Pressable
                  style={styles.selectedPlaceButton}
                  onPress={onStartNavigation}
                  accessibilityRole="button"
                  accessibilityLabel="Start navigation">
                  <Text style={styles.selectedPlaceButtonText}>Start</Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={isRouting}
                  style={[styles.selectedPlaceButton, isRouting && styles.selectedPlaceButtonDisabled]}
                  onPress={onRequestDirections}
                  accessibilityRole="button"
                  accessibilityLabel="Get directions">
                  <Text style={styles.selectedPlaceButtonText}>{isRouting ? 'Loading' : 'Directions'}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {hasDirections ? (
            <View style={[styles.routeModeRow, { width: '100%', marginTop: 10, justifyContent: 'space-around' }]}>
              <Pressable
                style={[styles.routeModeButton, { flex: 1 }, routeMode === 'walk' && styles.routeModeButtonActive]}
                onPress={() => onSelectRouteMode('walk')}
                accessibilityRole="button"
                accessibilityLabel="Use walking route">
                <FontAwesome5 name="walking" size={24} color="black" />
                {walkRouteSummary ? (
                  <Text style={[styles.routeModeButtonText, routeMode === 'walk' && styles.routeModeButtonTextActive]}>
                    {walkRouteSummary}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                disabled={!hasBusOption}
                style={[
                  styles.routeModeButton,
                  { flex: 1 },
                  !hasBusOption && styles.routeModeButtonDisabled,
                  routeMode === 'bus' && styles.routeModeButtonActive,
                ]}
                onPress={() => onSelectRouteMode('bus')}
                accessibilityRole="button"
                accessibilityLabel={hasBusOption ? 'Use public transport route' : 'No public transport route available'}>
                <FontAwesome6 name="train-subway" size={24} color="black" />
                {busRouteSummary ? (
                  <Text
                    style={[
                      styles.routeModeButtonText,
                      !hasBusOption && styles.routeModeButtonTextDisabled,
                      routeMode === 'bus' && styles.routeModeButtonTextActive,
                    ]}>
                    {busRouteSummary}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                disabled={!hasBikeOption}
                style={[
                  styles.routeModeButton,
                  { flex: 1 },
                  !hasBikeOption && styles.routeModeButtonDisabled,
                  routeMode === 'bike' && styles.routeModeButtonActive,
                ]}
                onPress={() => onSelectRouteMode('bike')}
                accessibilityRole="button"
                accessibilityLabel={hasBikeOption ? 'Use bike route' : 'No bike route available'}>
                <MaterialCommunityIcons name="bicycle" size={24} color="black" />
                {bikeRouteSummary ? (
                  <Text
                    style={[
                      styles.routeModeButtonText,
                      !hasBikeOption && styles.routeModeButtonTextDisabled,
                      routeMode === 'bike' && styles.routeModeButtonTextActive,
                    ]}>
                    {bikeRouteSummary}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
