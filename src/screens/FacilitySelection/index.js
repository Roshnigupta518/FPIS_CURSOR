/**
 * Facility Selection screen.
 *
 * Pulls facilities from the server (role-filtered there). Block users
 * see CHC/CH/PHC plus a search bar; district/medical users see the
 * preselected card with Continue enabled but still tappable.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import Container from '../../components/Container';
import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import EmptyItem from '../../components/EmptyItem';
import FacilityCard from '../../components/FacilityCard';
import Loader from '../../components/Loader';
import SearchBar from '../../components/SearchBar';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {LOGIN_TYPES} from '../../constants/facilities';
import {ROUTES} from '../../constants/routes';
import {
  fetchFacilities,
  setFacility,
} from '../../redux/slices/facilitySlice';
import {FONT_SIZE, SPACING} from '../../styles/theme';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const FacilitySelectionScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  const loginType = useSelector(s => s.auth.loginType);
  const loginDetails = useSelector(s => s.auth.user);
  const {items, loading, error, selected: selectedFromStore} = useSelector(
    s => s.facility,
  );

  const [selected, setSelected] = useState(selectedFromStore || null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);

  useEffect(() => {
    dispatch(fetchFacilities(loginDetails.id));
  }, [dispatch, loginDetails]);

  // Keep local selection in sync with redux (handles server preselect).
  useEffect(() => {
    if (selectedFromStore && !selected) setSelected(selectedFromStore);
  }, [selectedFromStore, selected]);

  useEffect(() => {
    if (error) showToast({type: 'error', message: error});
  }, [error]);

  const filtered = useMemo(() => {
    if (loginDetails.role !== LOGIN_TYPES.BLOCK) return items;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      f =>
        (f.facility_name || '').toLowerCase().includes(q) 
      // || (f.nameHi || '').toLowerCase().includes(q) 
      || (f.health_facility_type_short || '').toLowerCase().includes(q),
    );
  }, [items, debouncedSearch, loginDetails]);

  const handleContinue = () => {
    if (!selected) return;
    dispatch(setFacility(selected));
    navigation.navigate(ROUTES.SCHEME_SELECTION);
  };

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('SELECT_FACILITY')}
        subtitle={
          isHi
            ? 'जारी रखने के लिए सुविधा चुनें'
            : 'Choose a facility to continue'
        }
        onBack={() => navigation.goBack()}
      />

      <Container scroll={false} padded>
        <Text style={styles.description}>{t('SELECT_FACILITY_DESC')}</Text>

        {loginDetails.role === LOGIN_TYPES.BLOCK ? (
          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('SEARCH_FACILITY')}
            />
          </View>
        ) : null}

        {loading && items.length === 0 ? (
          <Loader text={t('LOADING')} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <FacilityCard
                facility={item}
                selected={selected?.id === item.id}
                onPress={setSelected}
              />
            )}
            ListEmptyComponent={
              <EmptyItem
                icon="📭"
                title={t('NO_DATA')}
                description={
                  isHi
                    ? 'आपकी भूमिका के लिए कोई सुविधा नहीं मिली।'
                    : 'No facilities found for your role.'
                }
              />
            }
            contentContainerStyle={{paddingBottom: 120}}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={styles.footer}>
          <CustomButton
            title={t('CONTINUE')}
            onPress={handleContinue}
            disabled={!selected}
          />
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  description: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.body,
    marginBottom: SPACING.md,
  },
  searchWrap: {marginBottom: SPACING.md},
  footer: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
});

export default FacilitySelectionScreen;
