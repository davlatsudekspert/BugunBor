import 'package:url_launcher/url_launcher.dart';

import '../core/env.dart';

/// Opens [uri] outside the app (browser, Telegram, phone, maps).
Future<bool> openExternal(Uri uri) async {
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

/// A page of the site in the browser (business workspace, policies…).
Future<bool> openSite(String path, {String? lang}) {
  final uri = Uri.parse('${Env.apiBase}$path');
  return openExternal(lang == null ? uri : uri.replace(queryParameters: {...uri.queryParameters, 'lang': lang}));
}

Future<bool> callPhone(String phone) => openExternal(Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'[^\d+]'), '')));

/// Lets the phone pick a maps app (Yandex, Google…); the web map otherwise.
Future<void> openDirections(double latitude, double longitude, String label) async {
  final geo = Uri.parse('geo:$latitude,$longitude?q=$latitude,$longitude(${Uri.encodeComponent(label)})');
  if (await openExternal(geo)) return;
  await openExternal(Uri.https('www.google.com', '/maps/dir/', {'api': '1', 'destination': '$latitude,$longitude'}));
}

Uri telegramUri(String handle) {
  final value = handle.trim();
  if (value.startsWith('http')) return Uri.parse(value);
  return Uri.https('t.me', '/${value.replaceFirst('@', '')}');
}

Uri instagramUri(String handle) {
  final value = handle.trim();
  if (value.startsWith('http')) return Uri.parse(value);
  return Uri.https('instagram.com', '/${value.replaceFirst('@', '')}');
}

Uri websiteUri(String site) => Uri.parse(site.startsWith('http') ? site : 'https://$site');

/// The public link of a deal or business (for sharing and App Links).
String siteUrl(String path) => '${Env.apiBase}$path';

/// Where a link from a notification or App Link opens inside the app, or
/// null when it belongs to the site (business workspace, admin).
String? appPathFor(String link) {
  final uri = Uri.tryParse(link);
  if (uri == null) return null;
  final path = uri.path;
  if (RegExp(r'^/deals/[^/]+/?$').hasMatch(path)) return path;
  if (RegExp(r'^/businesses/[^/]+/?$').hasMatch(path)) return path;
  if (RegExp(r'^/r/[^/]+/?$').hasMatch(path)) return path;
  if (path.startsWith('/account/codes')) return '/codes';
  if (path.startsWith('/account/favorites')) return '/saved';
  if (path == '/' || path.isEmpty) return '/';
  return null;
}
