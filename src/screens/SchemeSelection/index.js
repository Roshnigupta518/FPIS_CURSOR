/**
 * Scheme Selection screen.
 *
 * Fetches schemes valid for the previously-selected facility type
 * from GET /schemes/:facilityType. Stores the selection in redux so
 * the next screen (Beneficiary Form) can build its payload.
 */

import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import Container from '../../components/Container';
import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import EmptyItem from '../../components/EmptyItem';
import Loader from '../../components/Loader';
import SchemeCard from '../../components/SchemeCard';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {
  fetchSchemes,
  setScheme,
} from '../../redux/slices/schemeSlice';
import {FONT_SIZE, SPACING} from '../../styles/theme';

const SchemeSelectionScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  const facility = useSelector(s => s.facility.selected);
  const {items, loading, error, lastFacilityType, selected: prev} = useSelector(
    s => s.scheme,
  );

  const [selected, setSelected] = useState(prev || null);

  // console.log({facility, lastFacilityType})
  // useEffect(() => {
  //   if (!facility?.type) return;
  //   // Cache: skip refetch when we already loaded for this type.
  //   if (lastFacilityType !== facility.type.toLowerCase()) {
  //     dispatch(fetchSchemes(facility.type));
  //   }
  // }, [dispatch, facility?.type, lastFacilityType]);

  useEffect(()=>{
    dispatch(fetchSchemes(facility.health_facility_type_id));
  },[dispatch, facility])

  useEffect(() => {
    if (error) showToast({type: 'error', message: error});
  }, [error]);

  const handleContinue = () => {
    if (!selected) return;
    dispatch(setScheme(selected));
    navigation.navigate(ROUTES.BENEFICIARY_FORM);
  };

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('SELECT_SCHEME')}
        subtitle={facility ? (isHi ? facility.nameHi : facility.name) : ''}
        onBack={() => navigation.goBack()}
      />

      <Container scroll={false} padded edges={['left', 'right', 'bottom']}>
        <Text style={styles.description}>{t('SELECT_SCHEME_DESC')}</Text>

        {loading && items.length === 0 ? (
          <Loader text={t('LOADING')} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <SchemeCard
                scheme={item}
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
                    ? 'इस सुविधा के लिए कोई योजना नहीं मिली।'
                    : 'No schemes available for this facility.'
                }
              />
            }
            contentContainerStyle={{paddingBottom: 120}}
            showsVerticalScrollIndicator={false}
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
  footer: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
});

export default SchemeSelectionScreen;
