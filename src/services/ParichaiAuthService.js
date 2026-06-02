import {NativeModules} from 'react-native';

const {ParichaiAuthModule} = NativeModules;

console.log('NativeModules => ', NativeModules);
console.log('ParichaiAuthModule => ', NativeModules.ParichaiAuthModule);

export const startParichaiAuth = async params => {
  try {
    console.log('Calling Native Method');
    const result = await ParichaiAuthModule.startParichaiAuth(params);
    // console.log({result})
    console.log('Native Result =>', result);
    return result;
  } catch (error) {
    throw error;
  }
};