import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../design/widgets/common.dart';

/// A deal's picture: the photo just picked, the uploaded one, or — without
/// a photo — its emoji on the warm gradient the site uses.
class DealPicture extends StatelessWidget {
  const DealPicture({super.key, this.bytes, this.photo, required this.emoji, this.emojiSize = 40});
  final Uint8List? bytes;
  final String? photo;
  final String emoji;
  final double emojiSize;

  @override
  Widget build(BuildContext context) {
    if (bytes case final picked?) return Image.memory(picked, fit: BoxFit.cover, gaplessPlayback: true);
    if (photo != null) return AppImage(photo, small: true);
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFF895D), Color(0xFFF44E2F)]),
      ),
      child: Center(
        child: ExcludeSemantics(
          child: Text(emoji, style: TextStyle(fontSize: emojiSize)),
        ),
      ),
    );
  }
}
