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



// import React, {useState} from 'react';
// import {
//   SafeAreaView,
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ScrollView,
// } from 'react-native';
// import axios from 'axios';

// const LOGIN_URL =
//   'https://fwmis.nhmmp.gov.in/FPISAPI/api/Auth/login';

// const App = () => {
//   const [userId, setUserId] = useState('DH_Bhopal');
//   const [password, setPassword] = useState('Welcome@1');
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   const login = async () => {
//     setLoading(true);
//     setResult(null);

//     const payload = {
//       user_Id: userId,
//       password: password,
//       device_id: 'string',
//       device_model: 'string',
//       os_version: 'string',
//       app_version: 'string',
//     };

//     console.log('================ LOGIN START ================');
//     console.log('URL:', LOGIN_URL);
//     console.log('Payload:', payload);

//     try {
//       const response = await axios({
//         method: 'POST',
//         url: LOGIN_URL,
//         data: payload,
//         headers: {
//           'Content-Type': 'application/json',
//           Accept: 'application/json',
//         },
//         timeout: 30000,
//       });

//       console.log('STATUS:', response.status);
//       console.log('DATA:', response.data);
//       console.log('HEADERS:', response.headers);

//       setResult({
//         status: response.status,
//         data: response.data,
//       });

//       if (response.data?.success) {
//         Alert.alert(
//           'Login Successful',
//           response.data?.message || 'Login successful',
//         );
//       } else {
//         Alert.alert(
//           'Login Failed',
//           response.data?.message || 'Login failed',
//         );
//       }
//     } catch (error) {
//       console.log('========== LOGIN ERROR ==========');
    
//       console.log('message:', error?.message);
//       console.log('code:', error?.code);
//       console.log('name:', error?.name);
    
//       console.log(
//         'response status:',
//         error?.response?.status,
//       );
    
//       console.log(
//         'response data:',
//         JSON.stringify(error?.response?.data),
//       );
    
//       console.log(
//         'response headers:',
//         JSON.stringify(error?.response?.headers),
//       );
    
//       console.log(
//         'request:',
//         error?.request,
//       );
    
//       console.log(
//         'config:',
//         JSON.stringify({
//           url: error?.config?.url,
//           method: error?.config?.method,
//           timeout: error?.config?.timeout,
//           baseURL: error?.config?.baseURL,
//         }),
//       );
    
//       console.log(
//         'stack:',
//         error?.stack,
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={styles.title}>FWMIS Login Test</Text>

//         <Text style={styles.label}>User ID</Text>

//         <TextInput
//           value={userId}
//           onChangeText={setUserId}
//           style={styles.input}
//           autoCapitalize="none"
//           placeholder="User ID"
//         />

//         <Text style={styles.label}>Password</Text>

//         <TextInput
//           value={password}
//           onChangeText={setPassword}
//           style={styles.input}
//           secureTextEntry
//           placeholder="Password"
//         />

//         <TouchableOpacity
//           style={styles.button}
//           onPress={login}
//           disabled={loading}>
//           <Text style={styles.buttonText}>
//             {loading ? 'Logging in...' : 'LOGIN'}
//           </Text>
//         </TouchableOpacity>

//         {result && (
//           <View style={styles.resultBox}>
//             <Text style={styles.resultTitle}>API Response</Text>

//             <Text selectable style={styles.resultText}>
//               {JSON.stringify(result, null, 2)}
//             </Text>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },

//   content: {
//     padding: 20,
//     paddingTop: 50,
//   },

//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginBottom: 30,
//   },

//   label: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 8,
//   },

//   input: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },

//   button: {
//     height: 50,
//     backgroundColor: '#007AFF',
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//   },

//   resultBox: {
//     marginTop: 30,
//     padding: 15,
//     backgroundColor: '#f5f5f5',
//     borderRadius: 8,
//   },

//   resultTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     marginBottom: 10,
//   },

//   resultText: {
//     fontSize: 12,
//   },
// });

// export default App;