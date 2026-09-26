import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';

/// Tracks whether a photo header has scrolled away, so its bar can switch
/// from "icons on the photo" to the normal bar with the title.
class PhotoHeaderController extends ChangeNotifier {
  PhotoHeaderController({required this.expandedHeight}) {
    scroll.addListener(_update);
  }

  final double expandedHeight;
  final scroll = ScrollController();
  bool _collapsed = false;
  double _topPadding = 0;

  bool get collapsed => _collapsed;

  /// The status bar height, read from the screen's MediaQuery each build.
  set topPadding(double value) => _topPadding = value;

  void _update() {
    // Only once fully collapsed: until then the photo still shows behind the
    // bar (it fades over the last toolbar height), so the title would not read.
    final collapsed = scroll.hasClients && scroll.offset >= expandedHeight - kToolbarHeight - _topPadding - 1;
    if (collapsed == _collapsed) return;
    _collapsed = collapsed;
    notifyListeners();
  }

  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }
}

/// Style for the round buttons on a photo: white icon on a dark veil, so
/// they read on any picture; plain buttons once the bar is solid.
ButtonStyle? photoButtonStyle(bool onPhoto) =>
    onPhoto ? IconButton.styleFrom(backgroundColor: Colors.black.withValues(alpha: 0.38), foregroundColor: Colors.white) : null;

/// A pinned app bar over a photo. [actions] get `onPhoto` to style their
/// buttons with [photoButtonStyle].
class PhotoSliverAppBar extends StatelessWidget {
  const PhotoSliverAppBar({super.key, required this.controller, required this.title, required this.background, this.actions});

  final PhotoHeaderController controller;
  final String title;
  final Widget background;
  final List<Widget> Function(bool onPhoto)? actions;

  @override
  Widget build(BuildContext context) {
    controller.topPadding = MediaQuery.paddingOf(context).top;
    final onPhoto = !controller.collapsed;
    final canPop = Navigator.of(context).canPop();
    return SliverAppBar(
      pinned: true,
      expandedHeight: controller.expandedHeight,
      automaticallyImplyLeading: false,
      // Light status bar icons over the photo; the theme's once solid.
      systemOverlayStyle: onPhoto ? SystemUiOverlayStyle.light : (context.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark),
      leading: canPop
          ? Padding(
              padding: const EdgeInsets.all(4),
              child: IconButton(
                style: photoButtonStyle(onPhoto),
                tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                icon: const BackButtonIcon(),
                onPressed: () => Navigator.maybePop(context),
              ),
            )
          : null,
      title: AnimatedOpacity(
        opacity: onPhoto ? 0 : 1,
        duration: const Duration(milliseconds: 150),
        child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      actions: [...?actions?.call(onPhoto), const SizedBox(width: 4)],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax,
        background: Stack(
          fit: StackFit.expand,
          children: [
            background,
            // A soft shade under the status bar and buttons.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment(0, -0.3), colors: [Color(0x66000000), Color(0x00000000)]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
