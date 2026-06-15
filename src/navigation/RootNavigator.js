/**
 * Top-level navigator.
 *
 *  - On mount, dispatches bootstrapAuth which rehydrates a stored token
 *    from AsyncStorage so the user lands directly on the dashboard if
 *    their previous session is still valid.
 *  - While bootstrapping, renders a small splash so we don't briefly
 *    flash the login screen.
 *  - Switches between the unauthenticated stack (Login only) and the
 *    authenticated stack based on Redux auth state.
 */

import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View, Image} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, IMAGES} from '../constants/colors';
import {ROUTES} from '../constants/routes';
import {bootstrapAuth} from '../redux/slices/authSlice';
import {FONT_SIZE, FONT_WEIGHT, SPACING} from '../styles/theme';

import LoginScreen from '../screens/Login';
import ChangePasswordScreen from '../screens/ChangePassword';
import DashboardScreen from '../screens/Dashboard';
import FacilitySelectionScreen from '../screens/FacilitySelection';
import SchemeSelectionScreen from '../screens/SchemeSelection';
import BeneficiaryFormScreen from '../screens/BeneficiaryForm';
import FaceAuthenticationScreen from '../screens/FaceAuthentication';
import BeneficiaryListScreen from '../screens/BeneficiaryList';
import BeneficiaryDetailsScreen from '../screens/BeneficiaryDetails';
import ProfileScreen from '../screens/Profile';
import MyReportScreen from '../screens/MyReport';

const Stack = createNativeStackNavigator();

const Splash = () => (
  <View style={styles.splash}>
    <View style={styles.logo}>
      {/* <Text style={styles.logoText}>{'\u2695'}</Text> */}
      <Image source={IMAGES.logo} style={{width:100, height:100}} />
    </View>
    {/* <Text style={styles.appName}>परिवार कल्याण</Text> */}
    {/* <View style={styles.logoCircle}>
              <Text style={styles.logoText}>{'\u2695'}</Text>
            </View> */}
            <Text style={styles.appTitle}>{'Family Welfare Program'}</Text>
            <Text style={styles.appSubtitle}>{'Ministry of Health & Family Welfare'}</Text>
            <Text style={styles.govt}>{'Government of India'}</Text>
    <ActivityIndicator color="#fff" style={{marginTop: SPACING.lg}} />
  </View>
);

const RootNavigator = () => {
  const dispatch = useDispatch();
  const {isAuthenticated, bootstrapping} = useSelector(s => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  if (bootstrapping) return <Splash />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
            <Stack.Screen
              name={ROUTES.CHANGE_PASSWORD}
              component={ChangePasswordScreen}
            />
          </>
        ) : (
          <>
            <Stack.Screen name={ROUTES.DASHBOARD} component={DashboardScreen} />
            <Stack.Screen
              name={ROUTES.FACILITY_SELECTION}
              component={FacilitySelectionScreen}
            />
            <Stack.Screen
              name={ROUTES.SCHEME_SELECTION}
              component={SchemeSelectionScreen}
            />
            <Stack.Screen
              name={ROUTES.BENEFICIARY_FORM}
              component={BeneficiaryFormScreen}
            />
            <Stack.Screen
              name={ROUTES.FACE_AUTHENTICATION}
              component={FaceAuthenticationScreen}
            />
            <Stack.Screen
              name={ROUTES.BENEFICIARY_LIST}
              component={BeneficiaryListScreen}
            />
            <Stack.Screen
              name={ROUTES.BENEFICIARY_DETAILS}
              component={BeneficiaryDetailsScreen}
            />
            <Stack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
            <Stack.Screen name={ROUTES.MY_REPORT} component={MyReportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {fontSize: 44, color: COLORS.primary},
  appName: {
    color: '#fff',
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {fontSize: 40, color: COLORS.primary},
  appTitle: {
    color: '#fff',
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  appSubtitle: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.body,
    marginTop: 4,
    textAlign: 'center',
  },
  govt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.small,
    marginTop: 2,
  },
});

export default RootNavigator;
