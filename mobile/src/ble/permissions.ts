import { Platform, PermissionsAndroid } from "react-native";

/**
 * Request BLE runtime permissions on Android.
 * - Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT
 * - Android 11 and below: ACCESS_FINE_LOCATION
 * - iOS: handled by Info.plist, no runtime request needed
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS === "ios") {
    return true;
  }

  if (Platform.OS === "android") {
    const apiLevel = Platform.Version;

    if (typeof apiLevel === "number" && apiLevel >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  return false;
}
