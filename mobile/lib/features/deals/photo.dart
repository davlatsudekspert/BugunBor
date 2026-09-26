import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';

/// What the server takes (modules/media/service.ts allows 700 KB; the site
/// aims a little lower, and so do we).
const maxUploadBytes = 650000;
const maxPhotoSide = 1280;

/// A picture the phone could not turn into a JPEG (e.g. an unconverted HEIC).
class UnreadablePhoto implements Exception {
  const UnreadablePhoto();
}

/// The person did not let the app use the camera.
class CameraDenied implements Exception {
  const CameraDenied();
}

/// Makes picked bytes something the server takes: a JPEG of at most
/// [maxUploadBytes] whose longest side is at most [maxPhotoSide]. Runs in
/// an isolate; throws [UnreadablePhoto] when the bytes are not a picture.
Uint8List preparePhoto(Uint8List bytes) {
  final isJpeg = bytes.length > 2 && bytes[0] == 0xFF && bytes[1] == 0xD8;
  final img.Image? decoded;
  try {
    decoded = img.decodeImage(bytes);
  } catch (_) {
    // A decoder that trips over bytes it half recognises.
    throw const UnreadablePhoto();
  }
  if (decoded == null) throw const UnreadablePhoto();
  // Phones often store a turned photo with a "rotate me" mark; servers and
  // browsers may ignore the mark, so the pixels are turned here.
  final orientation = decoded.exif.imageIfd.orientation ?? 1;
  final upright = orientation == 1 ? decoded : img.bakeOrientation(decoded);
  final fits = upright.width <= maxPhotoSide && upright.height <= maxPhotoSide;
  if (isJpeg && fits && bytes.length <= maxUploadBytes && orientation == 1) return bytes;
  final resized = fits
      ? upright
      : img.copyResize(upright, width: upright.width >= upright.height ? maxPhotoSide : null, height: upright.height > upright.width ? maxPhotoSide : null);
  for (var quality = 85; quality >= 40; quality -= 9) {
    final encoded = img.encodeJpg(resized, quality: quality);
    if (encoded.length <= maxUploadBytes) return encoded;
  }
  throw const UnreadablePhoto();
}

/// Opens the camera or the gallery; the ready-to-upload JPEG, or null when
/// the person changed their mind. Tests override it.
final photoPickerProvider = Provider<Future<Uint8List?> Function({required bool camera})>(
  (ref) => ({required camera}) async {
    final XFile? file;
    try {
      file = await ImagePicker().pickImage(
        source: camera ? ImageSource.camera : ImageSource.gallery,
        maxWidth: maxPhotoSide.toDouble(),
        maxHeight: maxPhotoSide.toDouble(),
        imageQuality: 85,
        requestFullMetadata: false,
      );
    } on PlatformException catch (error) {
      // The plugin asks for the camera itself; a "no" comes back as this code.
      if (error.code == 'camera_access_denied') throw const CameraDenied();
      rethrow;
    }
    if (file == null) return null;
    return compute(preparePhoto, await file.readAsBytes());
  },
);
