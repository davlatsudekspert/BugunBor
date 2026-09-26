// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class LEn extends L {
  LEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'BugunBor';

  @override
  String get navHome => 'Home';

  @override
  String get navSearch => 'Search';

  @override
  String get navSaved => 'Saved';

  @override
  String get navCodes => 'My codes';

  @override
  String get navProfile => 'Profile';

  @override
  String get retry => 'Try again';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorNetwork => 'No internet connection. Check your network and try again.';

  @override
  String get errorServer => 'Server error. Please try again a little later.';

  @override
  String get errorSessionExpired => 'Your session has ended — please sign in again.';

  @override
  String get errorRateLimited => 'Too many attempts. Please try again later.';

  @override
  String get errorNotFound => 'Not found or no longer available.';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get close => 'Close';

  @override
  String get next => 'Next';

  @override
  String get skip => 'Skip';

  @override
  String get ok => 'OK';

  @override
  String get yes => 'Yes';

  @override
  String sum(String amount) {
    return '$amount UZS';
  }

  @override
  String percentOff(String percent) {
    return '−$percent%';
  }

  @override
  String distanceKm(String distance) {
    return '$distance km';
  }

  @override
  String distanceM(String distance) {
    return '$distance m';
  }

  @override
  String endsIn(String time) {
    return 'Ends in $time';
  }

  @override
  String daysShort(String days) {
    return '$days d';
  }

  @override
  String left(String count) {
    return '$count left';
  }

  @override
  String get demoBadge => 'Sample';

  @override
  String get demoNotice => 'This is a sample deal: it shows how the app works; the business does not exist. Real deals have a “Book” button here.';

  @override
  String get demoCarouselTitle => 'Your business can look like this';

  @override
  String get demoCarouselText => 'Have a business? Post your deal for free — customers will see it here.';

  @override
  String get addBusiness => 'Add a business';

  @override
  String get onbWelcomeTitle => 'Welcome to BugunBor';

  @override
  String get onbWelcomeText =>
      'Discounts from cafes, shops, salons and services in your city, in one place. Pick a deal, get a free code and show it at the counter to pay less.';

  @override
  String get onbStep1 => 'Find a deal';

  @override
  String get onbStep2 => 'Get a free code';

  @override
  String get onbStep3 => 'Show it at the counter';

  @override
  String get onbLanguage => 'Choose a language';

  @override
  String get onbInterestsTitle => 'What do you like?';

  @override
  String get onbInterestsText => 'Your picks come first on the home screen. You can change them later in your profile.';

  @override
  String get onbLocationTitle => 'Show deals near you?';

  @override
  String get onbLocationText => 'Your location is used only while the app is open, to sort deals by distance. It is never taken in the background.';

  @override
  String get onbLocationAllow => 'Allow location';

  @override
  String get onbLocationCity => 'I’ll choose a city';

  @override
  String get onbNotifyTitle => 'Hear about new deals';

  @override
  String get onbNotifyText =>
      'We’ll tell you about new deals from businesses you follow, codes about to expire and deals nearby that match your interests. At most 3 a day, never at night.';

  @override
  String get onbNotifyAllow => 'Turn on notifications';

  @override
  String get onbLater => 'Later';

  @override
  String get onbStart => 'Get started';

  @override
  String get homeTitle => 'What’s on today?';

  @override
  String get homeSearchHint => 'Plov, coffee, haircut…';

  @override
  String get homeForYou => 'For you';

  @override
  String get homeForYouEmpty => 'Choose your interests — matching deals will show up here.';

  @override
  String get homeChooseInterests => 'Choose interests';

  @override
  String get homeNearby => 'Near me';

  @override
  String homeInCity(String city) {
    return 'In $city';
  }

  @override
  String get homeEnding => 'Ending soon';

  @override
  String get homeAll => 'See all';

  @override
  String get homeEmptyTitle => 'No deals yet';

  @override
  String get homeEmptyText => 'New offers are coming soon. Try another city.';

  @override
  String get homeUseLocation => 'Use my location';

  @override
  String get homeLocationDenied => 'Location access was not given — showing your city instead.';

  @override
  String get chooseCity => 'Choose a city';

  @override
  String get searchHint => 'Search deals or businesses';

  @override
  String get sortEnding => 'Ending soon';

  @override
  String get sortDiscount => 'Biggest discount';

  @override
  String get sortNew => 'New';

  @override
  String get sortNear => 'Nearby';

  @override
  String get allCategories => 'All';

  @override
  String get searchEmpty => 'Nothing found. Try another word.';

  @override
  String get dealBook => 'Book';

  @override
  String get dealLoginToBook => 'Sign in to book';

  @override
  String get dealUnavailable => 'Can’t be booked right now';

  @override
  String get dealHaveCode => 'You already have an active code for this deal';

  @override
  String get dealViewCode => 'View code';

  @override
  String get dealLimitReached => 'You’ve reached the limit for this deal';

  @override
  String get dealChooseBranch => 'Choose a branch';

  @override
  String get dealBranches => 'Branches';

  @override
  String get dealTerms => 'Terms';

  @override
  String dealPerCustomer(String count) {
    return 'Per customer: $count';
  }

  @override
  String dealCodeValid(String minutes) {
    return 'The code is valid for $minutes minutes. You pay on the spot.';
  }

  @override
  String get dealDirections => 'Directions';

  @override
  String get share => 'Share';

  @override
  String get dealSave => 'Save';

  @override
  String get dealSaved => 'Saved';

  @override
  String get report => 'Report';

  @override
  String dealYouSave(String amount) {
    return 'You save $amount UZS';
  }

  @override
  String get dealBooked => 'Deal booked!';

  @override
  String get follow => 'Follow';

  @override
  String get followingLabel => 'Following';

  @override
  String get businessDeals => 'Deals';

  @override
  String get businessUpcoming => 'Coming soon';

  @override
  String get businessReviews => 'Reviews';

  @override
  String get businessNoDeals => 'No active deals right now';

  @override
  String get block => 'Block';

  @override
  String get unblock => 'Unblock';

  @override
  String get blockAsk => 'Deals from this business will be hidden from you and the follow ends. Continue?';

  @override
  String get blocked => 'Business blocked';

  @override
  String get call => 'Call';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get loginText => 'Sign in to BugunBor with Telegram — no password or SMS.';

  @override
  String get loginConsent => 'I agree to the privacy policy and terms of use';

  @override
  String get loginButton => 'Sign in with Telegram';

  @override
  String get loginConsentHint => 'Tick the consent box to sign in.';

  @override
  String get loginMatchCode => 'Match code';

  @override
  String get loginMatchHint => 'You’ll see this code in the Telegram bot — confirm if it matches.';

  @override
  String get loginOpenTelegram => 'Open Telegram';

  @override
  String get loginWaiting => 'Waiting for confirmation in Telegram…';

  @override
  String get loginExpired => 'The request has expired.';

  @override
  String get loginDenied => 'The request was declined.';

  @override
  String get loginRestart => 'Start again';

  @override
  String get loginDone => 'You’re in!';

  @override
  String get loginReviewer => 'Reviewer code';

  @override
  String get privacyPolicy => 'Privacy policy';

  @override
  String get terms => 'Terms of use';

  @override
  String get codesActive => 'Active';

  @override
  String get codesHistory => 'History';

  @override
  String get codesEmpty => 'No active codes yet';

  @override
  String get codesEmptyText => 'Book a deal — the code will be kept here.';

  @override
  String get historyEmpty => 'No history yet';

  @override
  String get codeShow => 'Show this code at the counter';

  @override
  String codeValidUntil(String time) {
    return 'Valid until $time';
  }

  @override
  String get codeCancel => 'Cancel code';

  @override
  String get codeCancelAsk => 'Cancel the code? The spot goes back to others.';

  @override
  String get statusClaimed => 'Active';

  @override
  String get statusCompleted => 'Used';

  @override
  String get statusExpired => 'Expired';

  @override
  String get statusCanceled => 'Cancelled';

  @override
  String get rateVisit => 'Rate';

  @override
  String get rateTitle => 'How was your visit?';

  @override
  String get rateComment => 'Your comment (optional)';

  @override
  String get rateThanks => 'Thank you! Your rating was saved.';

  @override
  String yourRating(String rating) {
    return 'Your rating: $rating';
  }

  @override
  String get loginRequiredTitle => 'Sign in needed';

  @override
  String get loginRequiredText => 'Sign in with Telegram to see this.';

  @override
  String get loginAction => 'Sign in';

  @override
  String get savedDeals => 'Deals';

  @override
  String get savedBusinesses => 'Businesses';

  @override
  String get savedEmpty => 'No saved deals';

  @override
  String get savedEmptyText => 'Tap ♡ on a deal to keep it here.';

  @override
  String get followsEmpty => 'Not following anyone';

  @override
  String get followsEmptyText => 'Tap “Follow” on a business page and we’ll tell you about its new deals.';

  @override
  String liveDeals(String count) {
    return '$count live deals';
  }

  @override
  String get endedDeals => 'Ended';

  @override
  String get profileGuestText => 'Sign in for your codes, saved deals and notifications.';

  @override
  String get profileSaved => 'Saved';

  @override
  String get profileRedeemed => 'Codes used';

  @override
  String get profileName => 'Your name';

  @override
  String get profileLanguage => 'Language';

  @override
  String get profileCity => 'City';

  @override
  String get profileTheme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get profileInterests => 'Interests';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get notifyDeals => 'New deals from businesses you follow';

  @override
  String get notifyReminders => 'Reminder before a code expires';

  @override
  String get notifyNearby => 'New deal nearby matching my interests';

  @override
  String get notifyNearbyHint => 'For this we keep your approximate area (≈1 km) from when you open the app. Turning it off deletes it at once.';

  @override
  String get notifyPermissionOff => 'Notifications are off in the phone settings.';

  @override
  String get profileCashier => 'Check codes (counter)';

  @override
  String get profileBusiness => 'Business workspace';

  @override
  String get profileContact => 'Contact us';

  @override
  String get profileLogout => 'Sign out';

  @override
  String get profileDelete => 'Delete account';

  @override
  String get deleteAsk => 'Delete your account for good? This cannot be undone.';

  @override
  String get deleteSoleOwner =>
      'You are the only owner of a business. It will disappear from the site, its deals will stop and active codes will be cancelled. Close the business and delete the account?';

  @override
  String get deleteCloseAndDelete => 'Close the business and delete';

  @override
  String get deleted => 'Account deleted';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get reportTitle => 'Report';

  @override
  String get reportReason => 'Choose a reason';

  @override
  String get reportComment => 'Comment (optional)';

  @override
  String get reportSend => 'Send';

  @override
  String get reportThanks => 'Thank you! A moderator will review it.';

  @override
  String get reasonWrongInfo => 'Wrong information';

  @override
  String get reasonScam => 'Scam';

  @override
  String get reasonOffensive => 'Offensive or inappropriate content';

  @override
  String get reasonProhibited => 'Prohibited product or service';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reasonOther => 'Other';

  @override
  String get cashierTitle => 'Check a code';

  @override
  String get cashierChooseBusiness => 'Choose a business';

  @override
  String get cashierScanHint => 'Point the frame at the customer’s QR code';

  @override
  String get cashierManual => 'Enter the code manually';

  @override
  String get cashierCodeHint => 'For example, K7P 2QX';

  @override
  String get cashierCheck => 'Check';

  @override
  String get cashierValid => 'The code is valid';

  @override
  String get cashierCustomer => 'Customer';

  @override
  String get cashierConfirm => 'Confirm — code used';

  @override
  String get cashierDone => 'Code used';

  @override
  String get cashierNext => 'Next customer';

  @override
  String get cameraDenied => 'No camera access — enter the code manually.';

  @override
  String get updateTitle => 'Please update the app';

  @override
  String get updateText => 'This version is no longer supported. Please update from Google Play.';

  @override
  String get updateAction => 'Update';

  @override
  String get offline => 'Offline — showing the latest data';

  @override
  String get open => 'Open';

  @override
  String get homeForYouNone => 'No deals for your interests yet.';

  @override
  String get homeChange => 'Change';

  @override
  String dealStartsAt(String time) {
    return 'Starts $time';
  }

  @override
  String get dealSoldOut => 'Fully booked';

  @override
  String get dealEnded => 'This deal has ended';

  @override
  String get dealNotStarted => 'This deal hasn’t started yet';

  @override
  String get endsInLabel => 'Ends in:';

  @override
  String get unblocked => 'Business unblocked';

  @override
  String followers(String count) {
    return '$count followers';
  }

  @override
  String get blockedNote => 'You blocked this business — its deals are hidden from you.';

  @override
  String get website => 'Website';

  @override
  String get codeOpenDeal => 'Open the deal';

  @override
  String get profileSettings => 'Settings';

  @override
  String get notifyTurnOn => 'Turn on';

  @override
  String get profileForBusiness => 'For business';

  @override
  String get profileBusinessHint => 'Deals, branches and team are managed on the website';

  @override
  String get profileAbout => 'About';

  @override
  String get cashierBadCode => 'Invalid code. Check the 6 characters.';

  @override
  String get cashierNoBusiness => 'Only staff of a verified business can check codes.';

  @override
  String get homeSamplesNote => 'For now these are sample deals that show how the app works. Real deals will appear here as soon as they are added.';
}
