/**
 * Family Welfare Program (परिवार कल्याण कार्यक्रम)
 * Root Application Component
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';

import Toast from './src/components/Toast';
import {COLORS} from './src/constants/colors';
import RootNavigator from './src/navigation/RootNavigator';
import {store} from './src/redux/store';
import './src/utils/i18n';

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.primaryDark}
        />
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
