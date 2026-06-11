/**
 * My Report (मेरी रिपोर्ट) screen.
 *
 *  - Shows the logged-in user a personal summary of beneficiaries they
 *    have added, filtered by period and (optionally) scheme.
 *  - Period chips: today / week / month / all / custom (with a pair of
 *    DatePickerFields when custom is active).
 *  - Scheme dropdown: "All Schemes" + 5 specific schemes loaded via the
 *    existing schemeSlice (NSV, FST, ANT, PPIUCD, FPCS).
 *  - 4 KPI cards (Total / Pending / Submitted / Failed) and a scheme
 *    breakdown table sorted by count desc.
 *  - Pull-to-refresh re-fetches the summary.
 *  - Top-right download button calls the report export endpoint, base64-
 *    encodes the .xlsx payload and hands it to the platform Share sheet
 *    as a data URL.
 *  - Empty state when total === 0; toast + retry on error.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';
import EmptyItem from '../../components/EmptyItem';
import Loader from '../../components/Loader';
import SectionCard from '../../components/SectionCard';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {BENEFICIARY_STATUS} from '../../constants/schemes';
import {fetchFacilities} from '../../redux/slices/facilitySlice';
import {fetchSchemes} from '../../redux/slices/schemeSlice';
import {
  downloadMyReportExcel,
  fetchMyReportSummary,
  setReportFilters,
} from '../../redux/slices/reportSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  HIT_SLOP,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

/* -------------------------------------------------------------------------- */
/*  Local constants                                                            */
/* -------------------------------------------------------------------------- */

const PERIOD_OPTIONS = [
  {key: 'today', labelKey: 'PERIOD_TODAY'},
  {key: 'week', labelKey: 'PERIOD_WEEK'},
  {key: 'month', labelKey: 'PERIOD_MONTH'},
  {key: 'all', labelKey: 'PERIOD_ALL'},
  {key: 'custom', labelKey: 'PERIOD_CUSTOM'},
];

const KPI_DEFS = [
  {
    key: 'total',
    labelKey: 'TOTAL',
    icon: '\uD83D\uDCCA', // 📊
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },
  {
    key: 'pending',
    labelKey: 'PENDING',
    icon: '\u23F3', // ⏳
    color: COLORS.warning,
    bg: COLORS.warningLight,
  },
  {
    key: 'submitted',
    labelKey: 'SUBMITTED',
    icon: '\u2705', // ✅
    color: COLORS.success,
    bg: COLORS.successLight,
  },
  {
    key: 'failed',
    labelKey: 'FAILED',
    icon: '\u26A0\uFE0F', // ⚠️
    color: COLORS.error,
    bg: COLORS.errorLight,
  },
];

/* -------------------------------------------------------------------------- */
/*  Static helpers                                                             */
/* -------------------------------------------------------------------------- */

// Hoisted so React doesn't remount the FlatList separator on every render.
const ModalDivider = () => <View style={styles.modalDivider} />;

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

const MyReportScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  const user = useSelector(s => s.auth.user);
  const selectedFacility = useSelector(s => s.facility.selected);
  const facilityItems = useSelector(s => s.facility.items);

  const {summary, filters, loading, refreshing, error, downloading} =
    useSelector(s => s.report);

  const schemes = useSelector(s => s.scheme.items);
  const schemesLoading = useSelector(s => s.scheme.loading);

  const [schemeModalOpen, setSchemeModalOpen] = useState(false);

  /* --------------------------- facility type id ---------------------------- */
  // The existing scheme API expects a facility type id. We pick it up from
  // (1) a previously-selected facility, (2) the user's facility list (auto-
  // loaded if needed), or (3) the user object stamped at login. The first
  // source that yields a value wins.
  const facilityTypeId = useMemo(() => {
    const preselected = (facilityItems || []).find(f => f?.preselected);
    return (
      selectedFacility?.health_facility_type_id ??
      preselected?.health_facility_type_id ??
      facilityItems?.[0]?.health_facility_type_id ??
      user?.facility?.health_facility_type_id ??
      user?.facility?.facility_type_id ??
      user?.facility?.facilityTypeId ??
      null
    );
  }, [selectedFacility, facilityItems, user]);

  /* ------------------------------ load schemes ----------------------------- */

  useEffect(() => {
    if (schemes && schemes.length > 0) {
      return;
    }
    if (schemesLoading) {
      return;
    }
    if (facilityTypeId) {
      // Re-use the existing schemeSlice so we don't introduce a parallel
      // source of truth for the scheme list.
      dispatch(fetchSchemes(facilityTypeId));
    } else if (user?.id && (!facilityItems || facilityItems.length === 0)) {
      // No type id anywhere yet — bootstrap by fetching the user's
      // facilities first; the memoized `facilityTypeId` will then resolve
      // and re-trigger this effect.
      dispatch(fetchFacilities(user.id));
    }
  }, [dispatch, schemes, schemesLoading, facilityTypeId, facilityItems, user]);

  /* ------------------------------ load summary ----------------------------- */

  useEffect(() => {
    // Custom mode is meaningless until both endpoints of the date range
    // are picked, so wait for the user to fill them in.
    if (filters.period === 'custom' && (!filters.from || !filters.to)) {
      return;
    }
    dispatch(fetchMyReportSummary({reset: false}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.period, filters.from, filters.to, filters.schemeId]);

  useEffect(() => {
    if (error) {
      showToast({type: 'error', message: error});
    }
  }, [error]);

  /* ------------------------------- handlers -------------------------------- */

  const handleSelectPeriod = useCallback(
    next => {
      // Always start with empty dates — when switching to "custom" the
      // user should pick fresh from/to values rather than seeing today's
      // date as a default. Switching away from custom also clears the
      // range so it doesn't linger as a stale filter.
      dispatch(setReportFilters({period: next, from: null, to: null}));
    },
    [dispatch],
  );

  const handleFromChange = useCallback(
    d => {
      const to = filters.to ? new Date(filters.to) : null;
      if (to && d > to) {
        showToast({type: 'warning', message: t('INVALID_DATE_RANGE')});
        return;
      }
      dispatch(setReportFilters({from: d}));
    },
    [dispatch, filters.to, t],
  );

  const handleToChange = useCallback(
    d => {
      const from = filters.from ? new Date(filters.from) : null;
      if (from && d < from) {
        showToast({type: 'warning', message: t('INVALID_DATE_RANGE')});
        return;
      }
      dispatch(setReportFilters({to: d}));
    },
    [dispatch, filters.from, t],
  );

  const handleSelectScheme = useCallback(
    scheme => {
      setSchemeModalOpen(false);
      dispatch(setReportFilters({schemeId: scheme ? scheme.id : null}));
    },
    [dispatch],
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchMyReportSummary({reset: true}));
  }, [dispatch]);

  const handleRetry = useCallback(() => {
    dispatch(fetchMyReportSummary({reset: false}));
  }, [dispatch]);

  const handleDownload = useCallback(async () => {
    if (downloading) {
      return;
    }
    try {
      const action = await dispatch(downloadMyReportExcel());
      if (downloadMyReportExcel.fulfilled.match(action)) {
        const {base64, fileName, mimeType} = action.payload;
        await Share.share(
          {
            // iOS picks up `url` for the share sheet; Android falls back
            // to message/title.
            url: `data:${mimeType};base64,${base64}`,
            title: fileName,
            message:
              Platform.OS === 'android'
                ? `${t('DOWNLOAD_SUCCESS')}: ${fileName}`
                : undefined,
          },
          {
            dialogTitle: fileName,
            subject: fileName,
          },
        );
        showToast({type: 'success', message: t('DOWNLOAD_SUCCESS')});
      } else {
        const message =
          (action.payload && String(action.payload)) || t('DOWNLOAD_FAILED');
        showToast({type: 'error', message});
      }
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('DOWNLOAD_FAILED'),
      });
    }
  }, [dispatch, downloading, t]);

  /* -------------------------------- derived -------------------------------- */

  const total = summary?.total || 0;

  const kpis = useMemo(() => {
    const byStatus = summary?.byStatus || {};
    return {
      total: total,
      pending: byStatus[BENEFICIARY_STATUS.PENDING_AUTH] || 0,
      submitted: byStatus[BENEFICIARY_STATUS.SUBMITTED] || 0,
      failed: byStatus[BENEFICIARY_STATUS.AUTH_FAILED] || 0,
    };
  }, [summary, total]);

  const sortedScheme = useMemo(() => {
    const list = summary?.byScheme || [];
    return [...list].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [summary]);

  const selectedSchemeLabel = useMemo(() => {
    if (filters.schemeId == null) {
      return t('ALL_SCHEMES');
    }
    const match = (schemes || []).find(
      s => Number(s.id) === Number(filters.schemeId),
    );
    if (!match) {
      return t('ALL_SCHEMES');
    }
    // schemeSlice currently passes through the raw API row, which uses
    // scheme_name / scheme_name_e. mapScheme wraps it with name/nameHi —
    // handle both shapes defensively.
    return isHi
      ? match.nameHi || match.scheme_name || match.name
      : match.name || match.scheme_name_e || match.scheme_name;
  }, [filters.schemeId, schemes, isHi, t]);

  /* --------------------------------- render -------------------------------- */

  const renderRightHeader = (
    <TouchableOpacity
      onPress={handleDownload}
      disabled={downloading || !summary || total === 0}
      hitSlop={HIT_SLOP}
      style={[
        styles.headerBtn,
        (downloading || !summary || total === 0) && styles.headerBtnDisabled,
      ]}>
      <Text style={styles.headerBtnIcon}>{'\u2B07\uFE0E'}</Text>
    </TouchableOpacity>
  );

  const showEmpty = !loading && summary && total === 0;
  const showFirstLoad = loading && !summary;

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('MY_REPORT')}
        subtitle={user?.name}
        onBack={() => navigation.goBack()}
        rightComponent={renderRightHeader}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }>
        {/* --------- Period chips --------- */}
        <View style={styles.chipsRow}>
          {PERIOD_OPTIONS.map(opt => {
            const active = filters.period === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.85}
                onPress={() => handleSelectPeriod(opt.key)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --------- Custom date range --------- */}
        {filters.period === 'custom' ? (
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <DatePickerField
                label={t('FROM_DATE')}
                value={filters.from ? new Date(filters.from) : null}
                onChange={handleFromChange}
                maximumDate={filters.to ? new Date(filters.to) : new Date()}
              />
            </View>
            <View style={styles.dateCol}>
              <DatePickerField
                label={t('TO_DATE')}
                value={filters.to ? new Date(filters.to) : null}
                onChange={handleToChange}
                minimumDate={filters.from ? new Date(filters.from) : undefined}
                maximumDate={new Date()}
              />
            </View>
          </View>
        ) : null}

        {/* --------- Scheme dropdown --------- */}
        <Text style={styles.fieldLabel}>{t('SCHEME_FILTER')}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSchemeModalOpen(true)}
          style={styles.dropdown}>
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedSchemeLabel}
          </Text>
          <Text style={styles.dropdownIcon}>{'\u25BE'}</Text>
        </TouchableOpacity>

        {/* --------- Body --------- */}
        {showFirstLoad ? (
          <Loader text={t('LOADING')} />
        ) : showEmpty ? (
          <View style={styles.emptyWrap}>
            <EmptyItem
              icon="📭"
              title={t('NO_REPORT_FOUND')}
              description={t('NO_REPORT_DESC')}
            />
          </View>
        ) : error && !summary ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title={t('RETRY')}
              onPress={handleRetry}
              variant="outline"
              fullWidth={false}
            />
          </View>
        ) : summary ? (
          <>
            {/* KPI grid */}
            <View style={styles.kpiGrid}>
              {KPI_DEFS.map(def => (
                <View key={def.key} style={[styles.kpiCard, SHADOWS.card]}>
                  <View style={[styles.kpiIcon, {backgroundColor: def.bg}]}>
                    <Text style={styles.kpiIconText}>{def.icon}</Text>
                  </View>
                  <Text style={[styles.kpiValue, {color: def.color}]}>
                    {kpis[def.key]}
                  </Text>
                  <Text style={styles.kpiLabel}>{t(def.labelKey)}</Text>
                </View>
              ))}
            </View>

            {/* Scheme breakdown */}
            <SectionCard
              title={t('SCHEME_BREAKDOWN')}
              icon={'\uD83D\uDCC8' /* 📈 */}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.flex1]}>
                  {t('SCHEME')}
                </Text>
                <Text style={[styles.tableHeaderText, styles.tableCountCol]}>
                  {t('COUNT')}
                </Text>
              </View>
              {sortedScheme.length === 0 ? (
                <Text style={styles.tableEmpty}>{t('NO_DATA')}</Text>
              ) : (
                sortedScheme.map((row, idx) => (
                  <View
                    key={`${row.id}-${row.code}`}
                    style={[
                      styles.tableRow,
                      idx === sortedScheme.length - 1 && styles.tableRowLast,
                    ]}>
                    <View style={styles.flex1}>
                      <Text style={styles.tableName} numberOfLines={2}>
                        {row.name}
                      </Text>
                      <Text style={styles.tableCode}>{row.code}</Text>
                    </View>
                    <View style={styles.tableCountCol}>
                      <Text style={styles.tableCount}>{row.count}</Text>
                    </View>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>

      {downloading ? <Loader overlay text={t('LOADING')} /> : null}

      {/* --------------------- Scheme picker modal --------------------- */}
      <Modal
        transparent
        animationType="fade"
        visible={schemeModalOpen}
        onRequestClose={() => setSchemeModalOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSchemeModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('SCHEME_FILTER')}</Text>
            <FlatList
              data={[{__all__: true}, ...(schemes || [])]}
              keyExtractor={(item, idx) =>
                item.__all__ ? 'all' : String(item.id ?? idx)
              }
              renderItem={({item}) => {
                if (item.__all__) {
                  const active = filters.schemeId == null;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectScheme(null)}
                      style={[
                        styles.modalItem,
                        active && styles.modalItemActive,
                      ]}>
                      <Text
                        style={[
                          styles.modalItemText,
                          active && styles.modalItemTextActive,
                        ]}>
                        {t('ALL_SCHEMES')}
                      </Text>
                      {active ? (
                        <Text style={styles.modalCheck}>{'\u2713'}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                }
                const active = Number(filters.schemeId) === Number(item.id);
                const label = isHi
                  ? item.nameHi || item.scheme_name || item.name
                  : item.name || item.scheme_name_e || item.scheme_name;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectScheme(item)}
                    style={[
                      styles.modalItem,
                      active && styles.modalItemActive,
                    ]}>
                    <Text
                      style={[
                        styles.modalItemText,
                        active && styles.modalItemTextActive,
                      ]}>
                      {label}
                    </Text>
                    {active ? (
                      <Text style={styles.modalCheck}>{'\u2713'}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={ModalDivider}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  flex1: {flex: 1},
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  /* header download button */
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  headerBtnDisabled: {opacity: 0.45},
  headerBtnIcon: {color: '#fff', fontSize: 20, fontWeight: '700'},

  /* section labels */
  fieldLabel: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: 6,
  },

  /* period chips */
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
  },
  chipTextActive: {color: '#fff', fontWeight: FONT_WEIGHT.semibold},

  /* custom date range */
  dateRow: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xs,
  },
  dateCol: {flex: 1, paddingHorizontal: SPACING.xs},

  /* scheme dropdown */
  dropdown: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  dropdownText: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  dropdownIcon: {
    fontSize: 18,
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
  },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    margin: '1%',
    alignItems: 'flex-start',
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  kpiIconText: {fontSize: 20},
  kpiValue: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
  },
  kpiLabel: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* scheme breakdown table */
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tableHeaderText: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableCountCol: {width: 64, alignItems: 'flex-end'},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  tableRowLast: {borderBottomWidth: 0},
  tableName: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  tableCode: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  tableCount: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  tableEmpty: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.body,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  /* empty / error */
  emptyWrap: {marginTop: SPACING.lg},
  errorWrap: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.body,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  /* scheme picker modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalItem: {
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemActive: {},
  modalItemText: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  modalCheck: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
  },
});

export default MyReportScreen;
