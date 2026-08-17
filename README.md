# Family Welfare Program — परिवार कल्याण कार्यक्रम

Production-ready **React Native CLI** mobile application for the Government Family
Welfare Program. Built with Redux Toolkit, React Navigation, i18n (Hindi +
English), and a clean, reusable component architecture. The app is **online-only**
— no offline persistence of beneficiary data.

Pair this app with the **Express + MySQL backend** at
`~/Desktop/FamilyWelfareBackend` (start it with `npm run dev` on port 8082).
The API integration is fully wired — see [Backend Integration](#backend-integration)
below.

---

## Tech Stack

| Layer            | Library                                          |
| ---------------- | ------------------------------------------------ |
| Framework        | React Native CLI (0.74)                          |
| State            | Redux Toolkit + React-Redux                      |
| Navigation       | @react-navigation/native + native-stack          |
| Networking       | Axios with interceptors                          |
| i18n             | i18next + react-i18next                          |
| Dates            | react-native-date-picker                         |
| Safe area        | react-native-safe-area-context                   |
| Local storage    | @react-native-async-storage/async-storage (token + lang only) |

---

## App Flow

```
Login
  └─► Dashboard
        ├─► Add Beneficiary
        │     └─► Facility Selection
        │           └─► Scheme Selection
        │                 └─► Beneficiary Form
        │                       └─► Face Authentication
        │                             └─► Final Submit → Beneficiary List
        ├─► Beneficiary List
        │     └─► Beneficiary Details
        │           ├─► Edit  (when status ≠ SUBMITTED)
        │           └─► Face Authentication  (when status ∈ {PENDING_AUTH, AUTH_FAILED})
        ├─► Profile
        └─► Logout
```

### Login Types

| Login Type           | Facility Behavior                                  |
| -------------------- | -------------------------------------------------- |
| Block                | Selectable list: CHC, CH, PHC (with search)         |
| District             | District Hospital preselected (user taps Continue) |
| Medical College      | Medical College preselected (user taps Continue)   |

### Scheme Availability

Driven by `FACILITY_SCHEME_MAP` in [`src/constants/schemes.js`](src/constants/schemes.js).
Schemes:

1. पुरुष नसबंदी (Male Sterilization)
2. महिला नसबंदी (Female Sterilization)
3. अंतरा गर्भनिरोधक इंजेक्शन (Antara Contraceptive Injection)
4. प्रसव पश्चात आईयूसीडी इंसर्शन (PPIUCD)
5. परिवार नियोजन क्षतिपूर्ति योजना (FP Compensation Scheme)

### Beneficiary Statuses

- `PENDING_AUTH`
- `AUTH_SUCCESS`
- `AUTH_FAILED`
- `SUBMITTED`

Each status has its own color + label (see `STATUS_META` in `constants/schemes.js`).

---

## Folder Structure

```
src/
 ├── components/        # Reusable UI building blocks
 ├── screens/           # One folder per screen
 ├── navigation/        # RootNavigator (auth-aware stack)
 ├── redux/             # store + slices (auth, facility, scheme, beneficiary, ui)
 ├── services/          # Axios client + per-domain service modules
 ├── utils/             # validation, i18n, storage, formatters, responsive
 ├── constants/         # colors, schemes, facilities, routes, strings
 ├── hooks/             # useForm, useDebouncedValue
 ├── styles/            # theme tokens + global style fragments
 └── locales/           # en.json, hi.json (i18n catalogs)
```

---

## Reusable Components

| Component         | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `Container`       | Screen wrapper (SafeArea + scroll/no-scroll)              |
| `CustomHeader`    | Title bar with back button + right slot                   |
| `CustomButton`    | Primary / secondary / outline / ghost / danger variants   |
| `MyInput`         | Floating-label input with inline error + red border       |
| `DatePickerField` | Date input matching `MyInput` styling                     |
| `SearchBar`       | Standard search input with clear button                   |
| `Loader`          | Inline + overlay loaders                                  |
| `EmptyItem`       | Empty state w/ icon, title, description, optional CTA     |
| `FacilityCard`    | Selectable card for facility list                         |
| `SchemeCard`      | Selectable card for scheme list                           |
| `BeneficiaryCard` | List row card (avatar + name + scheme + status badge)     |
| `StatusBadge`     | Colored pill for beneficiary statuses                     |
| `SectionCard`     | Titled group container for details screen                 |

---

## Validation

Reusable regex catalog in [`src/utils/validation.js`](src/utils/validation.js).
Field configs (in `constants/schemes.js`) declare which regex applies. The
`useForm` hook (in `hooks/useForm.js`) handles state, error clearing on type,
and bulk validation on submit.

```js
RegexType.NAME       // Hindi + English letters
RegexType.AGE        // 1-120
RegexType.SAMAGRA_ID // 9 digits
RegexType.MOBILE     // Indian 10-digit
RegexType.CLAIM_ID   // Alphanumeric 4-20
```

Errors are translation keys — the screen renders `t(errorKey)` so the user sees
errors in the active language.

---

## API

`src/services/api.js` exports a configured Axios instance:

- Reads bearer token from AsyncStorage and attaches it automatically.
- Normalizes errors into a `{ code, message }` shape.

Per-domain services:

- `authService.js` → `loginApi`, `logoutApi`
- `beneficiaryService.js` → `fetchBeneficiariesApi`, `submitBeneficiaryApi`, `getBeneficiaryByIdApi`

Each service ships with a `USE_MOCK = true` toggle so the entire app works
out-of-the-box without a backend. Set `USE_MOCK = false` and update `BASE_URL`
in `services/api.js` to hit the real API.

---

## Internationalization

`src/utils/i18n.js` bootstraps `i18next` with `en` and `hi` catalogs. The
language is detected from the device locale on first launch and can be
toggled from the Login screen, the Dashboard header, or the Profile screen.

Use the standard hook in any component:

```js
import {useTranslation} from 'react-i18next';

const {t, i18n} = useTranslation();
return <Text>{t('WELCOME_BACK')}</Text>;
```

---

## Getting Started

### 1. Prerequisites

- Node ≥ 18
- Ruby (for CocoaPods on iOS)
- Xcode 15+ / Android Studio Hedgehog+
- React Native CLI: `npm install -g react-native-cli` (optional)

### 2. Install dependencies

```bash
npm install
# or
yarn
```

### 3. Generate native projects (one-time)

This repository contains the JavaScript layer only. To generate the matching
`ios/` and `android/` native projects, run:

```bash
npx react-native init FamilyWelfareApp --version 0.74.2
# then copy the generated ios/ and android/ folders into this directory
```

Alternatively, scaffold the project in one shot and then copy the contents of
the `src/`, `App.js`, `index.js`, `app.json`, `babel.config.js`,
`metro.config.js`, and `package.json` files over the generated ones.

### 4. iOS setup

```bash
cd ios && pod install && cd ..
npm run ios
```

### 5. Android setup

```bash
npm run android
```

### 6. Required native linking

The following packages need their native dependencies linked. Autolinking
handles this automatically when you run `pod install` / build the Android app:

- `react-native-date-picker`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `react-native-safe-area-context`
- `react-native-screens`
- `@react-native-async-storage/async-storage`

Also add the Reanimated Babel plugin (already configured in
`babel.config.js`).

### 7. Android — wrap your app for react-native-screens

In `android/app/src/main/java/.../MainActivity.{java,kt}` ensure:

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(null);
}
```

This is a one-time setup required by `react-native-screens`.

---

## Mock Credentials

The mock auth service accepts **any** non-empty username + password and
returns a fake token. Pick the desired login type before tapping Login.

---

## Roadmap / TODO

- Replace mock services with real API endpoints (set `USE_MOCK = false`)
- Wire the camera in `FaceAuthentication` (e.g. `react-native-vision-camera` +
  ML Kit face detection)
- Add unit tests under `__tests__/` using the included Jest setup
- Add CI workflow for lint + test

---

## Backend Integration

The app talks to the Express/MySQL backend through a small `src/api/` layer.
Every screen uses Redux Toolkit async thunks (no `fetch`/`axios` calls in
components).

### Architecture

```
src/
├── api/                         ← axios + per-domain API modules
│   ├── axiosInstance.js         ← baseURL, JWT interceptor, 401 → logout
│   ├── authApi.js               ← loginApi, meApi
│   ├── facilityApi.js           ← listFacilitiesApi
│   ├── schemeApi.js             ← listSchemesByFacilityTypeApi
│   └── beneficiaryApi.js        ← list/get/create/update/delete + faceAuth
├── constants/api.js             ← BASE_URL (platform-aware) + endpoint paths
├── utils/mappers.js             ← snake_case ↔ camelCase translators
└── redux/slices/                ← async thunks dispatched from screens
    ├── authSlice.js             ← login / bootstrapAuth / logout + forceLogout
    ├── facilitySlice.js         ← fetchFacilities
    ├── schemeSlice.js           ← fetchSchemes(facilityType)
    └── beneficiarySlice.js      ← fetch/fetchMore/byId/create/update/delete/faceAuth
```


### JWT handling

- The login thunk stores the token + user in **AsyncStorage** (`@fwa/authToken`, `@fwa/user`).
- Every outbound request gets `Authorization: Bearer <token>` from an axios
  request interceptor.
- A response interceptor watches for HTTP **401** and dispatches `forceLogout`
  + `logout` automatically (via a handler registered from `redux/store.js`).
  The user is bounced back to the Login screen and a toast says
  "Session expired".
- On app launch, `bootstrapAuth` rehydrates the token so a returning user
  lands on the Dashboard without seeing Login.

### Field-name mapping

The backend speaks **snake_case** (`beneficiary_name`, `auth_status`), the app
uses **camelCase** internally. Mapping happens only inside `utils/mappers.js`
+ the `api/` layer — screens never see snake_case keys.

| App key (camel)      | Server key (snake)       |
| -------------------- | ------------------------ |
| `beneficiaryName`    | `beneficiary_name`       |
| `guardianName`       | `father_husband_name`    |
| `samagraId`          | `samagra_id`             |
| `procedureDate`      | `procedure_date`         |
| `followUpDate`       | `follow_up_date`         |
| `claimId`            | `claim_id`               |
| `status`             | `auth_status`            |
| `faceAuthImage`      | `face_auth_image`        |

### Loading / error UX

| Concern              | Where                                           |
| -------------------- | ----------------------------------------------- |
| Button spinners      | `<CustomButton loading />` (Login, Form, etc.)  |
| Screen-level loader  | `<Loader text="..." />`                         |
| Pagination spinner   | Footer of `<FlatList>` in `BeneficiaryList`     |
| Pull-to-refresh      | `<RefreshControl>` in `BeneficiaryList`         |
| Errors & success     | Global `<Toast>` via `showToast({type, message})` |
| Validation errors    | Inline red border + message (server errors are mapped onto fields too) |

### Image upload (face auth)

`react-native-image-picker` provides the camera/gallery launcher.
`beneficiaryApi.faceAuthApi` builds a `FormData` body:

```js
form.append('beneficiary_id', String(beneficiaryId));
form.append('auth_status', status);
form.append('image', {uri, name, type});
```

…and POSTs it to `/beneficiaries/face-auth` with
`Content-Type: multipart/form-data`. The backend stores the file in
`uploads/face-auth/` and returns the saved path (`/uploads/face-auth/<file>`)
in `faceAuthImage` on the beneficiary record.

### Native permissions for image-picker

After running `npm install`, add the following to the native projects (one-time).

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                 android:maxSdkVersion="32" />
```

**iOS** — `ios/FamilyWelfareApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to capture beneficiary face for authentication.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to your photos to upload beneficiary images.</string>
```

Then re-run `cd ios && pod install && cd ..` for iOS.

### End-to-end flow

```
Login (mobile + password)
  → POST /auth/login           → store token + user
Dashboard
  → GET /beneficiaries          (for stats)
Add Beneficiary
  → GET /facilities             (role-filtered)
  → GET /schemes/:facilityType  (filtered by facility type)
  → POST /beneficiaries         (server returns id)
  → POST /beneficiaries/face-auth  (multipart upload, status update)
Beneficiary List
  → GET /beneficiaries?page=&limit=&search=&status=&dateFrom=&dateTo=
  → infinite scroll + pull-to-refresh + status tabs
Beneficiary Details
  → GET /beneficiaries/:id
  → PUT  /beneficiaries/:id     (when status ≠ SUBMITTED)
  → DELETE /beneficiaries/:id   (with confirm)
```

### Demo accounts

After running `npm run db:seed` on the backend, log in with any of:

| Role     | Mobile        | Password      |
| -------- | ------------- | ------------- |
| block    | `9000000001`  | `password123` |
| district | `9000000002`  | `password123` |
| medical  | `9000000003`  | `password123` |

Tapping a role pill on the Login screen auto-fills the matching mobile number.

---

## License

Internal Government project. All rights reserved.
