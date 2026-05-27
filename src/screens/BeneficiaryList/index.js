/**
 * Beneficiary List screen.
 *
 *  - Server-side pagination via FlatList onEndReached.
 *  - Pull-to-refresh resets to page 1.
 *  - Debounced search box (re-fetches on change).
 *  - Status filter row (PENDING / SUCCESS / FAILED / SUBMITTED + ALL).
 *  - FAB to start a new beneficiary flow.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import BeneficiaryCard from '../../components/BeneficiaryCard';
import CustomHeader from '../../components/CustomHeader';
import EmptyItem from '../../components/EmptyItem';
import Loader from '../../components/Loader';
import SearchBar from '../../components/SearchBar';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {BENEFICIARY_STATUS} from '../../constants/schemes';
import {
  fetchBeneficiaries,
  fetchMoreBeneficiaries,
  setFilters,
} from '../../redux/slices/beneficiarySlice';
import {clearFacility} from '../../redux/slices/facilitySlice';
import {clearScheme} from '../../redux/slices/schemeSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SIZES,
  SPACING,
} from '../../styles/theme';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const STATUS_TABS = [
  {key: null, labelKey: 'all', label: 'All'},
  {key: BENEFICIARY_STATUS.PENDING_AUTH, label: 'Pending'},
  {key: BENEFICIARY_STATUS.AUTH_SUCCESS, label: 'Auth ✓'},
  {key: BENEFICIARY_STATUS.AUTH_FAILED, label: 'Auth ✗'},
  {key: BENEFICIARY_STATUS.SUBMITTED, label: 'Submitted'},
];

const BeneficiaryListScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t} = useTranslation();

  const {
    items,
    total,
    hasMore,
    loading,
    refreshing,
    loadingMore,
    filters,
  } = useSelector(s => s.beneficiary);

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  /* ------------ initial load + search re-fetch ----------- */
  useEffect(() => {
    dispatch(
      fetchBeneficiaries({
        reset: true,
        filters: {...filters, search: debouncedSearch},
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /* ------------ initial mount ----------- */
  useEffect(() => {
    dispatch(fetchBeneficiaries({reset: true}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch(fetchBeneficiaries({reset: true}));
  }, [dispatch]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      dispatch(fetchMoreBeneficiaries());
    }
  }, [dispatch, hasMore, loadingMore]);

  const handleStatusTab = useCallback(
    statusKey => {
      const next = {...filters, status: statusKey};
      dispatch(setFilters({status: statusKey}));
      dispatch(fetchBeneficiaries({reset: true, filters: next}));
    },
    [dispatch, filters],
  );

  const handleAdd = useCallback(() => {
    dispatch(clearFacility());
    dispatch(clearScheme());
    navigation.navigate(ROUTES.FACILITY_SELECTION);
  }, [dispatch, navigation]);

  const renderItem = useCallback(
    ({item}) => (
      <BeneficiaryCard
        item={item}
        onPress={b => navigation.navigate(ROUTES.BENEFICIARY_DETAILS, {id: b.id})}
      />
    ),
    [navigation],
  );

  const ListFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }
    if (!hasMore && items.length > 0) {
      return <Text style={styles.endText}>— end of list —</Text>;
    }
    return null;
  }, [hasMore, items.length, loadingMore]);

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('BENEFICIARY_LIST')}
        subtitle={`${total} ${total === 1 ? 'record' : 'records'}`}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('SEARCH_BENEFICIARY')}
        />
      </View>

      {/* Status filter tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          data={STATUS_TABS}
          keyExtractor={tab => String(tab.key)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          renderItem={({item: tab}) => {
            const active = filters.status === tab.key;
            return (
              <TouchableOpacity
                onPress={() => handleStatusTab(tab.key)}
                activeOpacity={0.85}
                style={[styles.tab, active && styles.tabActive]}>
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                  numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading && items.length === 0 ? (
        <Loader text={t('LOADING')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            !loading && (
              <EmptyItem
                icon="\uD83D\uDC65"
                title={t('NO_BENEFICIARIES')}
                description={t('NO_BENEFICIARIES_DESC')}
                actionLabel={t('ADD_BENEFICIARY')}
                onActionPress={handleAdd}
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleAdd}
        style={[styles.fab, SHADOWS.fab]}>
        <Text style={styles.fabIcon}>{'+'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  searchWrap: {paddingHorizontal: SPACING.lg, paddingTop: SPACING.md},
  tabsWrap: {marginTop: SPACING.sm, paddingBottom: SPACING.sm},
  tabsContent: {paddingHorizontal: SPACING.lg},
  tab: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  tabActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  tabText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.small,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabTextActive: {color: '#fff', fontWeight: FONT_WEIGHT.semibold},

  list: {padding: SPACING.lg, paddingBottom: 120},
  footerLoader: {paddingVertical: SPACING.lg, alignItems: 'center'},
  endText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },

  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: SIZES.fab,
    height: SIZES.fab,
    borderRadius: SIZES.fab / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: -2,
  },
});

export default BeneficiaryListScreen;
