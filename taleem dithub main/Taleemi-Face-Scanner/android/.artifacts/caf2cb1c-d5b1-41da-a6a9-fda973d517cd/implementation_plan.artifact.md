# Android Project Errors Fix Plan

Is plan mein hum project ke building errors aur splash screen ke masail ko theek karenge.

## User Review Required

> [!IMPORTANT]
> SDK version ko 36 se 35 par change kiya ja raha hai kyunki 36 abhi stable nahi ho sakta aur building errors de sakta hai.

## Proposed Changes

### [Android App Resources]

#### [NEW] [colors.xml](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/android/app/src/main/res/values/colors.xml)
- Missing color definitions ko add karna.

#### [MODIFY] [styles.xml](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/android/app/src/main/res/values/styles.xml)
- `postSplashScreenTheme` add karna taake splash ke baad app sahi theme par jaye.

### [Java Source Code]

#### [MODIFY] [MainActivity.java](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/android/app/src/main/java/com/taleemi/facescanner/MainActivity.java)
- `installSplashScreen()` call add karna.

### [Build Configuration]

#### [MODIFY] [variables.gradle](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/android/variables.gradle)
- SDK versions ko 35 par set karna.

#### [MODIFY] [build.gradle](file:///G:/taleem%20dithub/Taleemi-Face-Scanner/android/app/build.gradle)
- Proguard rule file ko update karna.

## Verification Plan

### Automated Tests
- `./gradlew assembleDebug` run karke check karenge ke build pass ho rahi hai.
