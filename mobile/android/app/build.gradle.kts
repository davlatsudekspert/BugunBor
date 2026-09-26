plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Push builds: CI writes google-services.json (Firebase client settings) from
// a secret. Without the file the app is built without push.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Release signing with the Play upload key. The keystore and its passwords
// exist only in CI secrets (never in the repository); without them a release
// build is signed with the debug key and is only good for local testing.
val uploadKeystore = System.getenv("BUGUNBOR_UPLOAD_KEYSTORE")?.let { file(it) }?.takeIf { it.exists() }

android {
    namespace = "uz.bugunbor.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Never changes: Play identifies the app by it.
        applicationId = "uz.bugunbor.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // CI passes --build-number=<run number>, so every build counts up.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (uploadKeystore != null) {
            create("upload") {
                storeFile = uploadKeystore
                storePassword = System.getenv("BUGUNBOR_UPLOAD_STORE_PASSWORD")
                keyAlias = System.getenv("BUGUNBOR_UPLOAD_KEY_ALIAS")
                keyPassword = System.getenv("BUGUNBOR_UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName(if (uploadKeystore != null) "upload" else "debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
