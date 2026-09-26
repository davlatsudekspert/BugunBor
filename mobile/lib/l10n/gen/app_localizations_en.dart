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
  String get updateText => 'This version is no longer supported — please install the new version of the app.';

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

  @override
  String get bizJoinTitle => 'Add your business to BugunBor';

  @override
  String get bizJoinText => 'Enter the basics — once it is checked, you can post deals.';

  @override
  String get bizJoinLogin => 'Sign in with Telegram to add a business — it will be linked to your account.';

  @override
  String get bizName => 'Business name';

  @override
  String get bizNameHint => 'For example, Oqtepa Lavash';

  @override
  String get bizCategory => 'Category';

  @override
  String get bizCity => 'City';

  @override
  String get bizPhone => 'Phone';

  @override
  String get bizAddress => 'Main branch address';

  @override
  String get bizAddressHint => 'For example: Chilonzor 9th block, house 12';

  @override
  String get bizAddressNote => 'Add a landmark so customers find you easily (for example, “next to Korzinka”).';

  @override
  String get bizHours => 'Opening hours';

  @override
  String get bizOpens => 'Opens';

  @override
  String get bizCloses => 'Closes';

  @override
  String get bizDescription => 'Short description';

  @override
  String get bizDescriptionHint => 'Tell customers about your business, clearly and simply…';

  @override
  String get bizTemplate => 'Sample text';

  @override
  String get bizTemplateAsk => 'Replace what you wrote with the sample?';

  @override
  String get bizTemplateHint => 'Adjust the sample to fit your business.';

  @override
  String bizTplFood(String name) {
    return '$name — national and European dishes, freshly cooked every day, with warm service. Come by for lunch and dinner.';
  }

  @override
  String bizTplCoffee(String name) {
    return '$name — coffee, tea and desserts. A cosy place to meet friends or relax.';
  }

  @override
  String bizTplShop(String name) {
    return '$name — quality goods at fair prices. We help you choose, and new items arrive regularly.';
  }

  @override
  String bizTplBeauty(String name) {
    return '$name — beauty and care services by experienced specialists, with quality products.';
  }

  @override
  String bizTplSport(String name) {
    return '$name — a place for sport and a healthy life. Classes for beginners and experienced athletes.';
  }

  @override
  String bizTplFun(String name) {
    return '$name — a place to have a great time with friends and family. Come and enjoy yourself.';
  }

  @override
  String bizTplServices(String name) {
    return '$name — everyday services done quickly and well. We tell you the price up front.';
  }

  @override
  String bizTplDelivery(String name) {
    return '$name — we deliver orders quickly and on time. Ordering is easy.';
  }

  @override
  String bizTplDefault(String name) {
    return '$name — quality products and friendly service. Come and visit us!';
  }

  @override
  String bizCounter(String count, String max) {
    return '$count / $max';
  }

  @override
  String get bizMore => 'Telegram, Instagram and website (optional)';

  @override
  String get bizHandleHint => 'username (without @)';

  @override
  String bizMyTelegram(String username) {
    return 'My Telegram: @$username';
  }

  @override
  String get bizLocate => 'Use my location';

  @override
  String get bizLocating => 'Locating…';

  @override
  String bizLocated(String city) {
    return 'Location found: $city. The map pin will be saved.';
  }

  @override
  String get bizLocateFailed => 'Couldn’t get your location — choose the city from the list.';

  @override
  String get bizLocateNote => 'Tap this while you are at the business — customers will find you on the map and under “Near me”.';

  @override
  String get bizSubmit => 'Send for review';

  @override
  String get bizSubmitting => 'Sending…';

  @override
  String get bizConsent => 'By sending, you agree to the details being checked. The business is not published until it is approved.';

  @override
  String get bizFixErrors => 'Please check the highlighted fields.';

  @override
  String get bizLimit => 'One account can add at most 5 businesses.';

  @override
  String get bizSentTitle => 'Application sent';

  @override
  String get bizVerifiedTitle => 'Your business is approved!';

  @override
  String get bizVerifiedText => 'Now post your first deal — customers will see it in the app and on the website.';

  @override
  String get bizPendingText =>
      'A moderator will review it (usually within 24 hours). Once approved, everyone can see your business — you can prepare deals already.';

  @override
  String get bizOpenProfile => 'Open the business profile';

  @override
  String get bizAddFirstDeal => 'Add the first deal';

  @override
  String valTooShort(String min) {
    return 'At least $min characters';
  }

  @override
  String valTooLong(String max) {
    return 'At most $max characters';
  }

  @override
  String get valInvalid => 'Invalid value';

  @override
  String get valPhone => 'Enter the number as +998 90 123 45 67';

  @override
  String get valTime => 'Choose a time';

  @override
  String get valChoose => 'Choose one';

  @override
  String get bizProfileTitle => 'Business profile';

  @override
  String get modeBusiness => 'Business';

  @override
  String get modePersonal => 'Personal';

  @override
  String get bizStatusVerified => 'Approved';

  @override
  String get bizStatusPending => 'In review';

  @override
  String get bizStatusRejected => 'Rejected';

  @override
  String get bizStatusSuspended => 'Suspended';

  @override
  String get roleOwner => 'Owner';

  @override
  String get roleManager => 'Manager';

  @override
  String get roleCashier => 'Cashier';

  @override
  String get bizPendingNote =>
      'A moderator is reviewing your business (usually within 24 hours). Once approved, your deals become visible — you can prepare them now.';

  @override
  String bizRejectedNote(String reason) {
    return 'The business was rejected: $reason';
  }

  @override
  String get bizRejectedFix => 'Fix it on the website and resend';

  @override
  String get bizSuspendedNote => 'The business is suspended for now — its deals are hidden. Contact us if you have questions.';

  @override
  String get bizQuick => 'Quick actions';

  @override
  String get bizAddDeal => 'Add a deal';

  @override
  String get bizViewPage => 'Business page';

  @override
  String get bizAddAnother => 'Add another business';

  @override
  String get bizStats => 'Statistics';

  @override
  String get statLive => 'Live deals';

  @override
  String get statClaimsToday => 'Booked today';

  @override
  String get statRedeemedToday => 'Used today';

  @override
  String get statViews => 'Views';

  @override
  String get statFollowers => 'Followers';

  @override
  String get statRating => 'Rating';

  @override
  String get bizSetupTitle => 'Complete your profile';

  @override
  String bizSetupProgress(String done, String total) {
    return '$done of $total done';
  }

  @override
  String get bizSetupHint => 'A complete profile earns more trust — your deals get seen more.';

  @override
  String get setupLogo => 'Upload a logo';

  @override
  String get setupCover => 'Upload a cover photo';

  @override
  String get setupDescription => 'Write a fuller description (at least 80 characters)';

  @override
  String get setupContacts => 'Add Telegram or Instagram';

  @override
  String get setupLocation => 'Pin your branch on the map';

  @override
  String get setupDeal => 'Post your first deal';

  @override
  String get bizRecent => 'Latest codes';

  @override
  String get bizRecentEmpty => 'No codes yet.';

  @override
  String get bizCashierOnly => 'You are a cashier here: you check customers’ codes.';

  @override
  String get promoTitle => 'Have a business? Sell more';

  @override
  String get promoText => 'Add it to BugunBor — shoppers nearby see your deal and come straight to you with a code.';

  @override
  String get promoPoint1 => 'Shoppers nearby find you';

  @override
  String get promoPoint2 => 'Followers hear about your new deals';

  @override
  String get promoPoint3 => 'You see the results: bookings and codes used';

  @override
  String get promoPoint4 => 'Signing up is free and takes minutes';

  @override
  String get promoAction => 'Add my business';

  @override
  String get promoHide => 'Hide';

  @override
  String get bizDiscardAsk => 'What you entered will not be saved. Leave?';

  @override
  String get bizDiscard => 'Leave';

  @override
  String get bizJoinSoon => 'Adding a business in the app works once the server is updated. For now you can add it on the website.';

  @override
  String get bizOnSite => 'Add on the website';

  @override
  String get dealsTitle => 'Deals';

  @override
  String get dealsNew => 'New deal';

  @override
  String get dealsFilterAll => 'All';

  @override
  String get dealsFilterLive => 'Live';

  @override
  String get dealsFilterReview => 'In review';

  @override
  String get dealsFilterDraft => 'Drafts';

  @override
  String get dealsFilterEnded => 'Ended';

  @override
  String get dealsEmpty => 'No deals here.';

  @override
  String get dealsEmptyTitle => 'No deals yet';

  @override
  String get dealsEmptyText => 'Add your first deal — shoppers nearby will see it right away.';

  @override
  String dealsStock(String left, String total) {
    return 'Left: $left of $total';
  }

  @override
  String get dealsUnlimited => 'No quantity limit';

  @override
  String dealsClaims(String count) {
    return 'Booked: $count';
  }

  @override
  String dealsRedeemed(String count) {
    return 'Used: $count';
  }

  @override
  String dealsViews(String count) {
    return 'Views: $count';
  }

  @override
  String dealsRejected(String reason) {
    return 'Reason for rejection: $reason';
  }

  @override
  String get dealActEdit => 'Edit';

  @override
  String get dealActSubmit => 'Send for review';

  @override
  String get dealActWithdraw => 'Withdraw';

  @override
  String get dealActPause => 'Pause';

  @override
  String get dealActResume => 'Resume';

  @override
  String get dealActEnd => 'End';

  @override
  String get dealActDuplicate => 'Duplicate';

  @override
  String get dealActDelete => 'Delete';

  @override
  String get dealActView => 'Open as customers see it';

  @override
  String get dealConfirmEnd => 'End the deal? This cannot be undone; codes already given stay valid.';

  @override
  String get dealConfirmDelete => 'Delete the draft?';

  @override
  String get dealLocked => 'An approved deal’s terms cannot be changed. Duplicate it to make changes.';

  @override
  String get dealStLive => 'Live';

  @override
  String get dealStScheduled => 'Coming soon';

  @override
  String get dealStSoldOut => 'Sold out';

  @override
  String get dealStExpired => 'Expired';

  @override
  String get dealStPaused => 'Paused';

  @override
  String get dealStDraft => 'Draft';

  @override
  String get dealStReview => 'In review';

  @override
  String get dealStRejected => 'Rejected';

  @override
  String get dealStArchived => 'Ended';

  @override
  String get dealSavedLive => 'The deal is live — customers can see it now!';

  @override
  String get dealSavedReview => 'The deal was sent for review. It goes live once approved.';

  @override
  String get dealSavedDraft => 'Draft saved.';

  @override
  String get dealDonePause => 'The deal is paused.';

  @override
  String get dealDoneResume => 'The deal is running again.';

  @override
  String get dealDoneEnd => 'The deal has ended.';

  @override
  String get dealDoneDuplicate => 'A copy was added to drafts.';

  @override
  String get dealDoneDelete => 'The draft was deleted.';

  @override
  String get dealDoneWithdraw => 'The deal was withdrawn from review.';

  @override
  String get dealNewTitle => 'New deal';

  @override
  String get dealEditTitle => 'Edit deal';

  @override
  String get dealTitleLabel => 'Deal title';

  @override
  String get dealTitleHint => 'For example, Lagman and salad combo';

  @override
  String get dealDescriptionLabel => 'Description';

  @override
  String get dealDescriptionHint => 'What does the customer get? Be specific.';

  @override
  String get dealTermsHint => 'For example: dine-in only. Not combined with other discounts.';

  @override
  String get dealPhoto => 'Deal photo';

  @override
  String get dealPhotoHint => 'A real photo of your product or service that you took yourself. Without one, a neat icon is shown.';

  @override
  String get dealPhotoAdd => 'Add a photo';

  @override
  String get dealPhotoChange => 'Change';

  @override
  String get dealPhotoRemove => 'Remove';

  @override
  String get dealPhotoCamera => 'Camera';

  @override
  String get dealPhotoGallery => 'Gallery';

  @override
  String get dealPhotoUploading => 'Uploading…';

  @override
  String get dealPhotoUnsupported => 'This picture could not be read. Choose a JPG or PNG.';

  @override
  String get dealVisualLabel => 'Icon';

  @override
  String get dealVisualHint => 'Shown when there is no photo.';

  @override
  String get dealOriginalPrice => 'Regular price, UZS';

  @override
  String get dealPriceLabel => 'Deal price, UZS';

  @override
  String dealDiscountPreview(String percent) {
    return 'Discount: $percent%';
  }

  @override
  String get dealStarts => 'Starts';

  @override
  String get dealEnds => 'Ends';

  @override
  String get dealTimeHint => 'Tashkent time';

  @override
  String get dealQuick2h => '2 hours';

  @override
  String get dealQuick4h => '4 hours';

  @override
  String get dealQuickToday => 'Until end of day';

  @override
  String get dealQuick1d => '1 day';

  @override
  String get dealQuick3d => '3 days';

  @override
  String get dealQuick7d => '7 days';

  @override
  String get dealQuantity => 'Quantity';

  @override
  String get dealUnlimited => 'Unlimited';

  @override
  String get dealPerCustomerLabel => 'Per customer';

  @override
  String get dealTtl => 'Code valid for';

  @override
  String get dealTtl30 => '30 minutes';

  @override
  String get dealTtl60 => '1 hour';

  @override
  String get dealTtl120 => '2 hours';

  @override
  String get dealTtl240 => '4 hours';

  @override
  String get dealWhere => 'At which branches';

  @override
  String get dealNoBranches => 'No branches — add one in the workspace on the website first.';

  @override
  String dealRulesNote(String min) {
    return 'Rules: at least $min% off, from 30 minutes to 30 days long.';
  }

  @override
  String get dealPreview => 'How customers will see it';

  @override
  String get dealSaveDraft => 'Save as draft';

  @override
  String get dealSaving => 'Saving…';

  @override
  String get dealAutoNote => 'Once sent, the deal is checked automatically — it usually goes live within seconds.';

  @override
  String get dealNeedsUpdate => 'Adding deals in the app works once the server is updated. For now you can add it on the website.';

  @override
  String get valPriceOrder => 'The deal price must be below the regular price';

  @override
  String valMinDiscount(String min) {
    return 'The discount must be at least $min%';
  }

  @override
  String get valEndAfterStart => 'The end must be after the start';

  @override
  String get valDuration => 'A deal can run from 30 minutes to 30 days';

  @override
  String get valEndInPast => 'The end time has already passed';

  @override
  String get valBranches => 'Choose at least one branch';

  @override
  String valMinAmount(String amount) {
    return 'At least $amount UZS';
  }

  @override
  String get bizDeals => 'Deals';

  @override
  String get bizSiteHint => 'Branches, team and profile photos are managed in the website workspace';

  @override
  String get dealPhotoCameraDenied => 'No camera access — pick a photo from the gallery or allow the camera in your phone settings.';

  @override
  String get dealWhen => 'When';

  @override
  String get dealsNeedUpdate => 'Viewing and running deals in the app works once the server is updated. For now, use the business workspace on the website.';

  @override
  String get newVersionTitle => 'A new version is out';

  @override
  String get newVersionText => 'A new version of the app is out — update it. Your account and data stay.';

  @override
  String get newVersionAction => 'Update';

  @override
  String get profileGuides => 'Video guides';

  @override
  String get profilePhotoAdd => 'Add a photo';

  @override
  String get profilePhotoChange => 'Change photo';

  @override
  String get profilePhotoRemove => 'Remove photo';

  @override
  String get profilePhotoHint => 'Only you see this photo.';

  @override
  String get homeHowTitle => 'How BugunBor works';

  @override
  String get homeHowText => 'Discounts from cafés, shops and services near you — in one place.';

  @override
  String get homeAllDeals => 'All deals';

  @override
  String get homePromoText => 'Post a deal — people nearby will see it.';

  @override
  String timeLeftMinutes(String count) {
    return '$count min left';
  }

  @override
  String timeLeftHours(String count) {
    return '$count h left';
  }

  @override
  String timeLeftDays(String count) {
    return '$count d left';
  }

  @override
  String timeLeftHoursMinutes(String hours, String minutes) {
    return '$hours h $minutes min left';
  }
}
