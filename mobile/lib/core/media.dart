import 'env.dart';

/// Image fields come from the server as site paths (`/media/…`, `/photos/…`).
String? mediaUrl(String? path, {String base = Env.apiBase}) {
  if (path == null || path.isEmpty) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? '$base$path' : '$base/$path';
}

/// A smaller copy exists for stock photos (`x.webp` → `x.sm.webp`).
String? thumbnailUrl(String? path, {String base = Env.apiBase}) {
  if (path == null) return null;
  if (path.startsWith('/photos/') && path.endsWith('.webp') && !path.endsWith('.sm.webp')) {
    return mediaUrl('${path.substring(0, path.length - 5)}.sm.webp', base: base);
  }
  return mediaUrl(path, base: base);
}
