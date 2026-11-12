package com.taleemidunya.pro;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.ViewCompat;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.text.SimpleDateFormat;
import java.util.Date;

public class MainActivity extends AppCompatActivity {
    private static final int BACKGROUND = Color.rgb(9, 10, 28);
    private static final int SURFACE = Color.rgb(20, 22, 46);
    private static final int INK = Color.rgb(246, 244, 255);
    private static final int MUTED = Color.rgb(165, 169, 199);
    private static final int PRIMARY = Color.rgb(132, 83, 255);
    private static final int TEAL = Color.rgb(52, 220, 218);
    private static final int BORDER = Color.rgb(48, 47, 86);
    private static final int PINK = Color.rgb(255, 75, 190);
    private static final String USERNAME_DOMAIN = "@taleemidunya.local";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, TextView> roleButtons = new HashMap<>();
    private FirebaseAuth auth;
    private FirebaseFirestore firestore;
    private EditText identityInput;
    private EditText passwordInput;
    private TextView loginError;
    private Button loginButton;
    private String selectedRole = "admin";
    private String activeRole = "";
    private boolean previewMode;
    private Map<String, Object> currentProfile = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setSystemBars(BACKGROUND, false);

        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setApiKey(BuildConfig.FIREBASE_API_KEY)
                    .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                    .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
                    .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
                    .setStorageBucket(BuildConfig.FIREBASE_STORAGE_BUCKET)
                    .build();
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this, options);
            }
            auth = FirebaseAuth.getInstance();
            firestore = FirebaseFirestore.getInstance();
        } catch (IllegalStateException exception) {
            showLogin("The app could not initialize its secure school connection. Please contact support.");
            return;
        }

        showSplash();
    }

    private void showSplash() {
        LinearLayout root = vertical(BACKGROUND);
        root.setGravity(Gravity.CENTER);
        TextView mark = text("✦", 34, Color.WHITE, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(gradient(PRIMARY, PINK, 28));
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(96), dp(96));
        markParams.bottomMargin = dp(18);
        root.addView(mark, markParams);

        TextView title = text("TaleemiDunya Pro", 27, INK, true);
        title.setGravity(Gravity.CENTER);
        root.addView(title);
        TextView subtitle = text("NEXT-GENERATION SCHOOL APP", 11, TEAL, true);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setLetterSpacing(0.13f);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subtitleParams.topMargin = dp(8);
        root.addView(subtitle, subtitleParams);
        setScreenContentView(root);

        handler.postDelayed(() -> {
            if (auth == null) {
                return;
            }
            FirebaseUser user = auth.getCurrentUser();
            if (user == null) {
                if (getPreferences(Context.MODE_PRIVATE).getBoolean("welcome_seen", false)) {
                    showLogin(null);
                } else {
                    showWelcomeScreen();
                }
            } else {
                loadProfile(user.getUid(), null);
            }
        }, 650);
    }

    private void showWelcomeScreen() {
        setSystemBars(BACKGROUND, false);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout content = vertical(BACKGROUND);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setPadding(dp(24), dp(28), dp(24), dp(24));

        LinearLayout brand = horizontal(Color.TRANSPARENT);
        brand.setGravity(Gravity.CENTER_VERTICAL);
        TextView mark = text("✦", 19, Color.WHITE, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(gradient(PRIMARY, PINK, 14));
        brand.addView(mark, new LinearLayout.LayoutParams(dp(42), dp(42)));
        brand.addView(text("TaleemiDunya Pro", 17, INK, true), leftMarginParams(11));
        content.addView(brand);

        LinearLayout artwork = vertical(0);
        artwork.setGravity(Gravity.CENTER);
        artwork.setBackground(gradient(Color.rgb(38, 22, 83), Color.rgb(16, 30, 66), 30));
        TextView sparkles = text("✦      ·       ✧", 20, TEAL, true);
        sparkles.setGravity(Gravity.CENTER);
        artwork.addView(sparkles);
        TextView school = text("🏫", 88, Color.WHITE, false);
        school.setGravity(Gravity.CENTER);
        artwork.addView(school, topMarginParams(14));
        TextView books = text("📚      🎓", 31, Color.WHITE, false);
        books.setGravity(Gravity.CENTER);
        artwork.addView(books, topMarginParams(3));
        TextView caption = text("LEARN  •  GROW  •  SUCCEED", 10, TEAL, true);
        caption.setGravity(Gravity.CENTER);
        caption.setLetterSpacing(0.12f);
        artwork.addView(caption, topMarginParams(18));
        LinearLayout.LayoutParams artworkParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(294));
        artworkParams.topMargin = dp(26);
        content.addView(artwork, artworkParams);

        TextView heading = text("Your school,\none smarter app.", 30, INK, true);
        heading.setGravity(Gravity.CENTER);
        content.addView(heading, topMarginParams(25));
        TextView detail = text("Manage, learn and grow together with connected portals for your whole school community.",
                14, MUTED, false);
        detail.setGravity(Gravity.CENTER);
        content.addView(detail, topMarginParams(9));

        TextView dots = text("●   ○   ○", 13, PRIMARY, true);
        dots.setGravity(Gravity.CENTER);
        content.addView(dots, topMarginParams(20));

        Button next = button("Get started   →", PRIMARY);
        next.setBackground(gradient(PRIMARY, PINK, 17));
        LinearLayout.LayoutParams nextParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        nextParams.topMargin = dp(19);
        content.addView(next, nextParams);
        next.setOnClickListener(view -> {
            getPreferences(Context.MODE_PRIVATE).edit().putBoolean("welcome_seen", true).apply();
            showLogin(null);
        });

        TextView skip = text("Skip introduction", 13, MUTED, true);
        skip.setGravity(Gravity.CENTER);
        content.addView(skip, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(44)));
        skip.setOnClickListener(view -> {
            getPreferences(Context.MODE_PRIVATE).edit().putBoolean("welcome_seen", true).apply();
            showLogin(null);
        });

        scroll.addView(content);
        setScreenContentView(scroll);
    }

    private void showLogin(String errorMessage) {
        setSystemBars(BACKGROUND, false);
        selectedRole = "admin";
        previewMode = false;
        roleButtons.clear();

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BACKGROUND);
        LinearLayout content = vertical(BACKGROUND);
        content.setPadding(dp(22), dp(26), dp(22), dp(30));

        LinearLayout brand = horizontal(Color.TRANSPARENT);
        brand.setGravity(Gravity.CENTER_VERTICAL);
        TextView mark = text("✦", 22, Color.WHITE, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(gradient(PRIMARY, PINK, 17));
        brand.addView(mark, new LinearLayout.LayoutParams(dp(58), dp(58)));
        LinearLayout brandWords = vertical(Color.TRANSPARENT);
        brandWords.setPadding(dp(12), 0, 0, 0);
        brandWords.addView(text("TaleemiDunya Pro", 19, INK, true));
        brandWords.addView(text("SCHOOL MANAGEMENT, SIMPLIFIED", 9, MUTED, true));
        brand.addView(brandWords);
        content.addView(brand);

        LinearLayout intro = vertical(SURFACE);
        intro.setPadding(dp(20), dp(22), dp(20), dp(22));
        intro.setBackground(gradient(Color.rgb(28, 22, 63), Color.rgb(19, 24, 52), 24));
        TextView eyebrow = text("YOUR SCHOOL  •  YOUR PORTAL", 10, TEAL, true);
        eyebrow.setLetterSpacing(0.1f);
        intro.addView(eyebrow);
        TextView heading = text("Welcome back", 29, Color.WHITE, true);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        headingParams.topMargin = dp(8);
        intro.addView(heading, headingParams);
        TextView detail = text("Sign in to open your own school portal.", 14, MUTED, false);
        LinearLayout.LayoutParams detailParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        detailParams.topMargin = dp(5);
        intro.addView(detail, detailParams);
        LinearLayout.LayoutParams introParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        introParams.topMargin = dp(28);
        content.addView(intro, introParams);

        content.addView(label("Select your portal"));
        HorizontalScrollView rolesScroll = new HorizontalScrollView(this);
        rolesScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout roles = horizontal(Color.TRANSPARENT);
        String[][] roleChoices = {
                {"admin", "Admin"}, {"teacher", "Teacher"},
                {"student", "Student"}, {"parent", "Parent"}
        };
        for (String[] choice : roleChoices) {
            TextView role = text(choice[1], 13, MUTED, true);
            role.setGravity(Gravity.CENTER);
            role.setPadding(dp(15), dp(12), dp(15), dp(12));
            role.setBackground(rounded(SURFACE, 16, BORDER, 1));
            LinearLayout.LayoutParams roleParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            roleParams.rightMargin = dp(8);
            roles.addView(role, roleParams);
            roleButtons.put(choice[0], role);
            role.setOnClickListener(view -> {
                selectedRole = choice[0];
                updateRoleButtons();
            });
        }
        rolesScroll.addView(roles);
        LinearLayout.LayoutParams rolesParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rolesParams.topMargin = dp(10);
        content.addView(rolesScroll, rolesParams);

        content.addView(label("Email or username"));
        identityInput = input("Enter your email or username", InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        content.addView(identityInput, inputParams());

        content.addView(label("Password"));
        passwordInput = input("Enter your password",
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        content.addView(passwordInput, inputParams());

        loginError = text(errorMessage == null ? "" : errorMessage, 13, Color.rgb(255, 111, 133), false);
        loginError.setVisibility(errorMessage == null || errorMessage.isEmpty() ? View.GONE : View.VISIBLE);
        LinearLayout.LayoutParams errorParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        errorParams.topMargin = dp(10);
        content.addView(loginError, errorParams);

        loginButton = button("Continue to portal", PRIMARY);
        LinearLayout.LayoutParams loginParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        loginParams.topMargin = dp(18);
        content.addView(loginButton, loginParams);
        loginButton.setOnClickListener(view -> signIn());

        TextView previewLink = text("Explore the dashboard designs", 13, TEAL, true);
        previewLink.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams previewParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(46));
        previewParams.topMargin = dp(7);
        content.addView(previewLink, previewParams);
        previewLink.setOnClickListener(view -> showRolePreview());

        TextView reset = text("Forgot password? Contact your school administrator.", 12, MUTED, false);
        reset.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams resetParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        resetParams.topMargin = dp(17);
        content.addView(reset, resetParams);

        TextView footer = text("Secure access for school administrators, teachers, students and parents.", 11, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        footerParams.topMargin = dp(24);
        content.addView(footer, footerParams);

        scroll.addView(content);
        setScreenContentView(scroll);
        updateRoleButtons();
    }

    private void signIn() {
        if (auth == null) {
            showLogin("Secure sign-in is unavailable. Please try again later.");
            return;
        }
        String identity = identityInput.getText().toString().trim().toLowerCase(Locale.ROOT);
        String password = passwordInput.getText().toString();
        if (identity.isEmpty() || password.isEmpty()) {
            loginError.setText("Enter your email/username and password.");
            loginError.setVisibility(View.VISIBLE);
            return;
        }

        String email = identity.contains("@") ? identity : identity + USERNAME_DOMAIN;
        previewMode = false;
        hideKeyboard();
        loginButton.setEnabled(false);
        loginButton.setText("Signing in…");
        loginError.setVisibility(View.GONE);

        auth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    if (!task.isSuccessful() || task.getResult() == null
                            || task.getResult().getUser() == null) {
                        loginButton.setEnabled(true);
                        loginButton.setText("Continue to portal");
                        loginError.setText(authErrorMessage(task.getException()));
                        loginError.setVisibility(View.VISIBLE);
                        return;
                    }
                    loadProfile(task.getResult().getUser().getUid(), selectedRole);
                });
    }

    private void loadProfile(String uid, String expectedRole) {
        if (firestore == null) {
            showLogin("School account service is unavailable. Check your internet connection.");
            return;
        }
        firestore.collection("users").document(uid).get()
                .addOnSuccessListener(this, snapshot -> {
                    if (!snapshot.exists()) {
                        auth.signOut();
                        showLogin("This account has no portal profile yet. Ask your school administrator to set it up.");
                        return;
                    }
                    Map<String, Object> profile = snapshot.getData();
                    if (profile == null) {
                        auth.signOut();
                        showLogin("Your portal profile could not be loaded. Please contact your school administrator.");
                        return;
                    }
                    profile.put("uid", uid);
                    String actualRole = normalizeRole(stringValue(profile.get("role")));
                    if (actualRole.isEmpty()) {
                        auth.signOut();
                        showLogin("Your account does not have a portal role yet. Ask your school administrator.");
                        return;
                    }
                    if (expectedRole != null && !roleMatches(expectedRole, actualRole)) {
                        auth.signOut();
                        showLogin("This account belongs to the " + roleLabel(actualRole)
                                + " portal. Select that portal and sign in again.");
                        return;
                    }
                    currentProfile = profile;
                    activeRole = actualRole;
                    previewMode = false;
                    showDashboard();
                })
                .addOnFailureListener(this, exception -> {
                    if (auth != null) {
                        auth.signOut();
                    }
                    showLogin("Could not load your role profile. Check your connection or contact your school administrator.");
                });
    }

    private void showRolePreview() {
        previewMode = true;
        setSystemBars(BACKGROUND, false);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout content = vertical(BACKGROUND);
        content.setPadding(dp(20), dp(28), dp(20), dp(28));

        TextView mark = text("✦", 20, Color.WHITE, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(gradient(PRIMARY, PINK, 15));
        content.addView(mark, new LinearLayout.LayoutParams(dp(48), dp(48)));
        content.addView(text("Explore the app", 27, INK, true), topMarginParams(21));
        content.addView(text("Preview the separate mobile portal designed for each role.",
                14, MUTED, false), topMarginParams(5));

        String[][] roles = {
                {"school-admin", "Admin portal", "School overview, people, finance and operations", "▦"},
                {"teacher", "Teacher portal", "Classes, attendance, homework and marks", "✎"},
                {"student", "Student portal", "Timetable, homework, attendance and results", "▤"},
                {"parent", "Parent portal", "Children, progress, fees and school updates", "♡"}
        };
        for (String[] role : roles) {
            LinearLayout card = horizontal(SURFACE);
            card.setGravity(Gravity.CENTER_VERTICAL);
            card.setPadding(dp(15), dp(14), dp(15), dp(14));
            card.setBackground(rounded(SURFACE, 18, BORDER, 1));
            TextView icon = text(role[3], 21, roleColor(role[0]), true);
            icon.setGravity(Gravity.CENTER);
            icon.setBackground(rounded(tint(roleColor(role[0]), 0.1f), 14,
                    tint(roleColor(role[0]), 0.1f), 0));
            card.addView(icon, new LinearLayout.LayoutParams(dp(45), dp(45)));
            LinearLayout copy = vertical(Color.TRANSPARENT);
            copy.setPadding(dp(12), 0, dp(5), 0);
            copy.addView(text(role[1], 15, INK, true));
            copy.addView(text(role[2], 11, MUTED, false), topMarginParams(3));
            card.addView(copy, new LinearLayout.LayoutParams(0,
                    ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            card.addView(text("›", 24, MUTED, false));
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            params.topMargin = dp(12);
            content.addView(card, params);
            card.setOnClickListener(view -> openRolePreview(role[0]));
        }

        TextView note = text("Sample preview only — no school records are shown or changed.",
                11, MUTED, false);
        note.setGravity(Gravity.CENTER);
        content.addView(note, topMarginParams(20));
        TextView signIn = text("Back to secure sign in", 13, PRIMARY, true);
        signIn.setGravity(Gravity.CENTER);
        content.addView(signIn, topMarginParams(12));
        signIn.setOnClickListener(view -> showLogin(null));
        scroll.addView(content);
        setScreenContentView(scroll);
    }

    private void openRolePreview(String role) {
        previewMode = true;
        activeRole = normalizeRole(role);
        currentProfile = new HashMap<>();
        currentProfile.put("name", roleLabel(activeRole));
        currentProfile.put("schoolName", "Sample school · UI preview");
        showDashboard();
    }

    private void addPreviewRoleSwitcher(LinearLayout content) {
        TextView label = text("PREVIEW ANOTHER PORTAL", 9, MUTED, true);
        label.setLetterSpacing(0.08f);
        content.addView(label, topMarginParams(14));
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        LinearLayout row = horizontal(Color.TRANSPARENT);
        String[][] roles = {
                {"school-admin", "Admin"}, {"teacher", "Teacher"},
                {"student", "Student"}, {"parent", "Parent"}
        };
        for (String[] role : roles) {
            boolean selected = normalizeRole(role[0]).equals(activeRole);
            TextView chip = text(role[1], 10, selected ? Color.WHITE : MUTED, true);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(dp(12), dp(8), dp(12), dp(8));
            chip.setBackground(rounded(selected ? roleColor(activeRole) : SURFACE, 12,
                    selected ? roleColor(activeRole) : BORDER, 1));
            LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            chipParams.rightMargin = dp(7);
            row.addView(chip, chipParams);
            chip.setOnClickListener(view -> openRolePreview(role[0]));
        }
        scroll.addView(row);
        content.addView(scroll, topMarginParams(7));
    }

    private void showDashboard() {
        setSystemBars(BACKGROUND, false);
        LinearLayout page = vertical(BACKGROUND);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        LinearLayout content = vertical(BACKGROUND);
        content.setPadding(dp(18), dp(15), dp(18), dp(24));

        LinearLayout top = horizontal(Color.TRANSPARENT);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView mark = text("✦", 17, Color.WHITE, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(gradient(PRIMARY, PINK, 14));
        top.addView(mark, new LinearLayout.LayoutParams(dp(44), dp(44)));
        LinearLayout titleGroup = vertical(Color.TRANSPARENT);
        titleGroup.setPadding(dp(11), 0, 0, 0);
        titleGroup.addView(text("TaleemiDunya Pro", 15, INK, true));
        titleGroup.addView(text(roleLabel(activeRole).toUpperCase(Locale.ROOT) + " APP", 9, MUTED, true));
        top.addView(titleGroup, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView alerts = text("♢", 23, INK, true);
        alerts.setGravity(Gravity.CENTER);
        alerts.setBackground(rounded(SURFACE, 15, BORDER, 1));
        top.addView(alerts, new LinearLayout.LayoutParams(dp(42), dp(42)));
        alerts.setOnClickListener(view -> showNotifications());
        TextView avatar = text(initials(stringValue(currentProfile.get("name"))), 13, PRIMARY, true);
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackground(rounded(tint(PRIMARY, 0.18f), 20, tint(PRIMARY, 0.32f), 1));
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(42), dp(42));
        avatarParams.leftMargin = dp(8);
        top.addView(avatar, avatarParams);
        avatar.setOnClickListener(view -> showProfile());
        content.addView(top);

        String name = stringValue(currentProfile.get("name"));
        if (name.isEmpty()) {
            FirebaseUser user = auth == null ? null : auth.getCurrentUser();
            name = user != null && user.getDisplayName() != null
                    ? user.getDisplayName() : roleLabel(activeRole);
        }
        String school = stringValue(currentProfile.get("schoolName"));
        if (school.isEmpty()) school = "Your school workspace";

        LinearLayout greeting = vertical(Color.TRANSPARENT);
        TextView greetingLine = text(greetingForTime() + ",", 12, MUTED, true);
        greetingLine.setLetterSpacing(0.08f);
        LinearLayout.LayoutParams greetingLineParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        greetingLineParams.topMargin = dp(22);
        greeting.addView(greetingLine, greetingLineParams);
        greeting.addView(text(name, 25, INK, true), topMarginParams(4));
        greeting.addView(text(school, 12, MUTED, false), topMarginParams(3));
        content.addView(greeting);

        if (previewMode) {
            addPreviewRoleSwitcher(content);
        }

        LinearLayout hero = vertical(0);
        hero.setPadding(dp(18), dp(19), dp(18), dp(18));
        hero.setBackground(gradient(roleColor(activeRole), Color.rgb(70, 42, 145), 23));
        LinearLayout heroTop = horizontal(Color.TRANSPARENT);
        heroTop.setGravity(Gravity.CENTER_VERTICAL);
        TextView role = text(roleLabel(activeRole).toUpperCase(Locale.ROOT), 10, Color.WHITE, true);
        role.setLetterSpacing(0.1f);
        heroTop.addView(role, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView preview = text("UI PREVIEW", 9, Color.WHITE, true);
        preview.setGravity(Gravity.CENTER);
        preview.setPadding(dp(9), dp(6), dp(9), dp(6));
        preview.setBackground(rounded(0x33FFFFFF, 10, 0x55FFFFFF, 1));
        heroTop.addView(preview);
        if (previewMode) {
            preview.setOnClickListener(view -> showRolePreview());
        }
        hero.addView(heroTop);
        TextView heroTitle = text(heroTitleFor(activeRole), 21, Color.WHITE, true);
        hero.addView(heroTitle, topMarginParams(11));
        TextView heroSubtitle = text(roleSummary(activeRole), 12, Color.WHITE, false);
        heroSubtitle.setAlpha(0.9f);
        hero.addView(heroSubtitle, topMarginParams(5));
        LinearLayout heroBottom = horizontal(Color.TRANSPARENT);
        heroBottom.setGravity(Gravity.CENTER_VERTICAL);
        TextView date = text("TODAY  •  " + currentDateLabel(), 9, Color.WHITE, true);
        date.setLetterSpacing(0.05f);
        heroBottom.addView(date, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView arrow = text("View overview  ›", 11, Color.WHITE, true);
        heroBottom.addView(arrow);
        hero.addView(heroBottom, topMarginParams(17));
        LinearLayout.LayoutParams heroParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        heroParams.topMargin = dp(17);
        content.addView(hero, heroParams);

        List<PortalModule> modules = modulesFor(activeRole);
        addSectionHeader(content, "At a glance", "Sample preview", () -> showFeatures());
        addStats(content, statsFor(activeRole));

        addSectionHeader(content, "Quick actions", "See all", () -> showFeatures());
        addQuickActions(content, modules);

        addSectionHeader(content, activityTitle(activeRole), "Preview", null);
        addActivityPreview(content, activeRole);

        addSectionHeader(content, "Your modules", "View all", () -> showFeatures());
        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        for (int i = 0; i < modules.size(); i++) {
            PortalModule module = modules.get(i);
            LinearLayout card = moduleCard(module);
            GridLayout.LayoutParams cardParams = new GridLayout.LayoutParams();
            cardParams.width = 0;
            cardParams.height = dp(126);
            cardParams.columnSpec = GridLayout.spec(i % 2, 1f);
            cardParams.setMargins(dp(4), dp(4), dp(4), dp(4));
            grid.addView(card, cardParams);
        }
        LinearLayout.LayoutParams gridParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        gridParams.topMargin = dp(3);
        content.addView(grid, gridParams);

        scroll.addView(content);
        page.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNavigation("home"));
        setScreenContentView(page);
    }

    private void addSectionHeader(LinearLayout content, String title, String action, Runnable onAction) {
        LinearLayout row = horizontal(Color.TRANSPARENT);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView heading = text(title, 17, INK, true);
        row.addView(heading, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (action != null) {
            TextView actionText = text(action, 11, PRIMARY, true);
            row.addView(actionText);
            if (onAction != null) {
                actionText.setOnClickListener(view -> onAction.run());
            }
        }
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(21);
        params.bottomMargin = dp(8);
        content.addView(row, params);
    }

    private List<DashboardStat> statsFor(String role) {
        List<DashboardStat> stats = new ArrayList<>();
        switch (normalizeRole(role)) {
            case "school-admin":
            case "super-admin":
                stats.add(new DashboardStat("Students", "1,248", "+8 this month", PRIMARY, "♙"));
                stats.add(new DashboardStat("Staff", "86", "Across all classes", TEAL, "♟"));
                stats.add(new DashboardStat("Attendance", "94%", "Today's overview", Color.rgb(232, 148, 42), "◷"));
                stats.add(new DashboardStat("Fee collection", "Rs 2.4M", "This month", Color.rgb(35, 155, 107), "₹"));
                break;
            case "teacher":
                stats.add(new DashboardStat("My classes", "04", "Today's timetable", PRIMARY, "▦"));
                stats.add(new DashboardStat("Students", "128", "Across your classes", TEAL, "♙"));
                stats.add(new DashboardStat("Homework", "12", "To review", Color.rgb(232, 148, 42), "▤"));
                stats.add(new DashboardStat("Next class", "10:30", "Grade 8 • Science", Color.rgb(139, 93, 203), "◷"));
                break;
            case "student":
                stats.add(new DashboardStat("Attendance", "96%", "This term", PRIMARY, "◷"));
                stats.add(new DashboardStat("Homework", "03", "Due this week", TEAL, "▤"));
                stats.add(new DashboardStat("Next class", "10:30", "Science • Room 4", Color.rgb(232, 148, 42), "▦"));
                stats.add(new DashboardStat("Class rank", "—", "Your progress", Color.rgb(139, 93, 203), "✦"));
                break;
            case "parent":
                stats.add(new DashboardStat("Children", "02", "Linked to your account", PRIMARY, "♙"));
                stats.add(new DashboardStat("Attendance", "96%", "This term", TEAL, "◷"));
                stats.add(new DashboardStat("Homework", "02", "Needs attention", Color.rgb(232, 148, 42), "▤"));
                stats.add(new DashboardStat("School updates", "03", "New this week", Color.rgb(139, 93, 203), "✉"));
                break;
            default:
                stats.add(new DashboardStat("Portal", "Ready", "Your school access", PRIMARY, "•"));
                stats.add(new DashboardStat("Updates", "—", "Coming to your portal", TEAL, "✉"));
        }
        return stats;
    }

    private void addStats(LinearLayout content, List<DashboardStat> stats) {
        for (int i = 0; i < stats.size(); i += 2) {
            LinearLayout row = horizontal(Color.TRANSPARENT);
            for (int j = i; j < Math.min(i + 2, stats.size()); j++) {
                DashboardStat stat = stats.get(j);
                LinearLayout card = vertical(SURFACE);
                card.setPadding(dp(13), dp(12), dp(11), dp(12));
                card.setBackground(rounded(SURFACE, 17, BORDER, 1));
                LinearLayout cardTop = horizontal(Color.TRANSPARENT);
                cardTop.setGravity(Gravity.CENTER_VERTICAL);
                TextView icon = text(stat.icon, 16, accentOnDark(stat.color), true);
                icon.setGravity(Gravity.CENTER);
                icon.setBackground(rounded(tint(stat.color, 0.1f), 11, tint(stat.color, 0.1f), 0));
                cardTop.addView(icon, new LinearLayout.LayoutParams(dp(31), dp(31)));
                TextView preview = text("SAMPLE", 8, MUTED, true);
                preview.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
                cardTop.addView(preview, new LinearLayout.LayoutParams(0,
                        ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                card.addView(cardTop);
                card.addView(text(stat.value, 21, INK, true), topMarginParams(9));
                card.addView(text(stat.label, 11, MUTED, true), topMarginParams(2));
                TextView detail = text(stat.detail, 9, accentOnDark(stat.color), false);
                card.addView(detail, topMarginParams(3));

                LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                        0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
                cardParams.setMargins(dp(3), dp(3), dp(3), dp(3));
                row.addView(card, cardParams);
            }
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            if (i > 0) rowParams.topMargin = dp(2);
            content.addView(row, rowParams);
        }
    }

    private void addQuickActions(LinearLayout content, List<PortalModule> modules) {
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        LinearLayout row = horizontal(Color.TRANSPARENT);
        for (int i = 0; i < Math.min(5, modules.size()); i++) {
            PortalModule module = modules.get(i);
            LinearLayout action = vertical(SURFACE);
            action.setGravity(Gravity.CENTER);
            action.setPadding(dp(10), dp(12), dp(10), dp(10));
            action.setBackground(rounded(SURFACE, 16, BORDER, 1));
            TextView icon = text(module.icon, 18, accentOnDark(module.color), true);
            icon.setGravity(Gravity.CENTER);
            icon.setBackground(rounded(tint(module.color, 0.1f), 12, tint(module.color, 0.1f), 0));
            action.addView(icon, new LinearLayout.LayoutParams(dp(38), dp(38)));
            TextView title = text(module.title, 10, INK, true);
            title.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            titleParams.topMargin = dp(7);
            action.addView(title, titleParams);
            LinearLayout.LayoutParams actionParams = new LinearLayout.LayoutParams(
                    dp(105), dp(98));
            actionParams.rightMargin = dp(8);
            row.addView(action, actionParams);
            action.setOnClickListener(view -> showModule(module));
        }
        scroll.addView(row);
        content.addView(scroll);
    }

    private void addActivityPreview(LinearLayout content, String role) {
        LinearLayout card = vertical(SURFACE);
        card.setPadding(dp(15), dp(14), dp(15), dp(14));
        card.setBackground(rounded(SURFACE, 18, BORDER, 1));
        LinearLayout chartHeader = horizontal(Color.TRANSPARENT);
        chartHeader.setGravity(Gravity.CENTER_VERTICAL);
        chartHeader.addView(text(activityTitle(role), 13, INK, true),
                new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView sample = text("SAMPLE PREVIEW", 8, MUTED, true);
        chartHeader.addView(sample);
        card.addView(chartHeader);
        card.addView(text(activitySubtitle(role), 10, MUTED, false), topMarginParams(4));

        int[] heights = activityBars(role);
        String[] days = {"M", "T", "W", "T", "F", "S", "S"};
        LinearLayout chart = horizontal(Color.TRANSPARENT);
        chart.setGravity(Gravity.BOTTOM);
        chart.setPadding(dp(2), dp(15), dp(2), 0);
        for (int i = 0; i < heights.length; i++) {
            LinearLayout column = vertical(Color.TRANSPARENT);
            column.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
            View bar = new View(this);
            bar.setBackground(rounded(i == heights.length - 1
                    ? roleColor(role) : tint(roleColor(role), 0.22f), 5,
                    Color.TRANSPARENT, 0));
            column.addView(bar, new LinearLayout.LayoutParams(dp(13), dp(heights[i])));
            TextView day = text(days[i], 9, MUTED, false);
            day.setGravity(Gravity.CENTER);
            column.addView(day, topMarginParams(6));
            LinearLayout.LayoutParams colParams = new LinearLayout.LayoutParams(
                    0, dp(91), 1);
            chart.addView(column, colParams);
        }
        LinearLayout.LayoutParams chartParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(105));
        chartParams.topMargin = dp(6);
        card.addView(chart, chartParams);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        cardParams.topMargin = dp(2);
        content.addView(card, cardParams);
    }

    private int[] activityBars(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return new int[]{37, 55, 45, 68, 51, 31, 24};
            case "student": return new int[]{58, 68, 48, 62, 70, 32, 25};
            case "parent": return new int[]{31, 45, 62, 44, 68, 42, 26};
            default: return new int[]{42, 57, 48, 72, 60, 34, 27};
        }
    }

    private String activityTitle(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return "Teaching week";
            case "student": return "Your study week";
            case "parent": return "Family activity";
            default: return "School overview";
        }
    }

    private String activitySubtitle(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return "A quick look at your weekly teaching activity";
            case "student": return "Your weekly learning activity";
            case "parent": return "A weekly view of your children's school activity";
            default: return "A weekly snapshot of your school";
        }
    }

    private String heroTitleFor(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return "Your classroom, at a glance";
            case "student": return "Ready for a great school day?";
            case "parent": return "Stay close to their progress";
            default: return "Your school, at a glance";
        }
    }

    private String roleSummary(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return "Classes, attendance and learning tools in one place.";
            case "student": return "Classes, homework and progress in your pocket.";
            case "parent": return "Your children's school journey, all together.";
            default: return "A clearer view of your school's daily operations.";
        }
    }

    private String greetingForTime() {
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    }

    private String currentDateLabel() {
        return new SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(new Date())
                .toUpperCase(Locale.ROOT);
    }

    private LinearLayout moduleCard(PortalModule module) {
        LinearLayout card = vertical(SURFACE);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(13), dp(13), dp(11), dp(12));
        card.setBackground(rounded(SURFACE, 18, BORDER, 1));
        TextView icon = text(module.icon, 22, accentOnDark(module.color), true);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(rounded(tint(module.color, 0.09f), 13, tint(module.color, 0.09f), 0));
        card.addView(icon, new LinearLayout.LayoutParams(dp(38), dp(38)));
        TextView title = text(module.title, 13, INK, true);
        card.addView(title, topMarginParams(10));
        TextView detail = text(module.subtitle, 10, MUTED, false);
        card.addView(detail, topMarginParams(3));
        card.setOnClickListener(view -> showModule(module));
        return card;
    }

    private LinearLayout bottomNavigation(String selected) {
        LinearLayout nav = horizontal(SURFACE);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(6), dp(6), dp(6), dp(6));
        nav.setBackground(rounded(SURFACE, 18, BORDER, 1));
        LinearLayout.LayoutParams navParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(62));
        navParams.setMargins(dp(12), dp(5), dp(12), dp(8));

        addNavItem(nav, "⌂", "Home", selected.equals("home"), this::showDashboard);
        addNavItem(nav, "▦", "Modules", selected.equals("features"), this::showFeatures);
        addNavItem(nav, "♢", "Alerts", selected.equals("notifications"), this::showNotifications);
        addNavItem(nav, "●", "Profile", selected.equals("profile"), this::showProfile);
        nav.setLayoutParams(navParams);
        return nav;
    }

    private void addNavItem(LinearLayout nav, String icon, String title, boolean selected, Runnable action) {
        LinearLayout item = vertical(Color.TRANSPARENT);
        item.setGravity(Gravity.CENTER);
        TextView iconView = text(icon, 19, selected ? PRIMARY : MUTED, true);
        iconView.setGravity(Gravity.CENTER);
        item.addView(iconView);
        item.addView(text(title, 10, selected ? PRIMARY : MUTED, selected));
        nav.addView(item, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        item.setOnClickListener(view -> action.run());
    }

    private void showFeatures() {
        List<PortalModule> modules = modulesFor(activeRole);
        LinearLayout page = pageWithNavigation("features");
        ScrollView scroll = (ScrollView) page.getChildAt(0);
        LinearLayout content = (LinearLayout) scroll.getChildAt(0);
        addBackHeader(content, "Your features",
                "Tools for your " + roleLabel(activeRole).toLowerCase(Locale.ROOT) + " portal");
        for (PortalModule module : modules) {
            LinearLayout row = horizontal(SURFACE);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(14), dp(12), dp(14), dp(12));
            row.setBackground(rounded(SURFACE, 17, BORDER, 1));
            TextView icon = text(module.icon, 20, accentOnDark(module.color), true);
            icon.setGravity(Gravity.CENTER);
            row.addView(icon, new LinearLayout.LayoutParams(dp(38), dp(38)));
            LinearLayout copy = vertical(Color.TRANSPARENT);
            copy.setPadding(dp(12), 0, 0, 0);
            copy.addView(text(module.title, 14, INK, true));
            copy.addView(text(module.subtitle, 11, MUTED, false));
            row.addView(copy, new LinearLayout.LayoutParams(0,
                    ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rowParams.topMargin = dp(9);
            content.addView(row, rowParams);
            row.setOnClickListener(view -> showModule(module));
        }
        setScreenContentView(page);
    }

    private void showNotifications() {
        LinearLayout page = pageWithNavigation("notifications");
        LinearLayout content = (LinearLayout) ((ScrollView) page.getChildAt(0)).getChildAt(0);
        addBackHeader(content, "Notifications", "Updates for your " + roleLabel(activeRole).toLowerCase(Locale.ROOT) + " portal");

        LinearLayout preview = vertical(SURFACE);
        preview.setPadding(dp(15), dp(14), dp(15), dp(14));
        preview.setBackground(gradient(Color.rgb(36, 25, 78), SURFACE, 17));
        preview.addView(text("DESIGN PREVIEW", 9, PRIMARY, true));
        preview.addView(text("Your school updates will appear here when notifications are connected.",
                13, INK, false), topMarginParams(6));
        LinearLayout.LayoutParams previewParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        previewParams.topMargin = dp(18);
        content.addView(preview, previewParams);

        addSectionHeader(content, "Updates", null, null);
        LinearLayout empty = vertical(SURFACE);
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(dp(22), dp(32), dp(22), dp(32));
        empty.setBackground(rounded(SURFACE, 20, BORDER, 1));
        TextView icon = text("♢", 26, PRIMARY, true);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(rounded(tint(PRIMARY, 0.18f), 24, tint(PRIMARY, 0.18f), 0));
        empty.addView(icon, new LinearLayout.LayoutParams(dp(54), dp(54)));
        TextView title = text("You’re all caught up", 16, INK, true);
        title.setGravity(Gravity.CENTER);
        empty.addView(title, topMarginParams(13));
        TextView detail = text("New school announcements and reminders will show here.",
                12, MUTED, false);
        detail.setGravity(Gravity.CENTER);
        empty.addView(detail, topMarginParams(5));
        LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        emptyParams.topMargin = dp(3);
        content.addView(empty, emptyParams);
        setScreenContentView(page);
    }

    private LinearLayout pageWithNavigation(String selected) {
        LinearLayout page = vertical(BACKGROUND);
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = vertical(BACKGROUND);
        content.setPadding(dp(20), dp(22), dp(20), dp(24));
        scroll.addView(content);
        page.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNavigation(selected));
        return page;
    }

    private void showProfile() {
        LinearLayout page = pageWithNavigation("profile");
        LinearLayout content = (LinearLayout) ((ScrollView) page.getChildAt(0)).getChildAt(0);
        addBackHeader(content, "Your profile", "Your secure TaleemiDunya account");
        String name = stringValue(currentProfile.get("name"));
        if (name.isEmpty()) {
            name = "School portal user";
        }
        addProfileRow(content, "Name", name);
        FirebaseUser user = auth == null ? null : auth.getCurrentUser();
        addProfileRow(content, "Email", user == null || user.getEmail() == null ? "—" : user.getEmail());
        addProfileRow(content, "Portal", roleLabel(activeRole));
        String school = stringValue(currentProfile.get("schoolName"));
        addProfileRow(content, "School", school.isEmpty() ? "Your school portal" : school);

        Button logout = button("Sign out", Color.rgb(190, 53, 69));
        LinearLayout.LayoutParams logoutParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        logoutParams.topMargin = dp(22);
        content.addView(logout, logoutParams);
        logout.setOnClickListener(view -> {
            if (previewMode) {
                showRolePreview();
                return;
            }
            if (auth != null) {
                auth.signOut();
            }
            currentProfile.clear();
            activeRole = "";
            showLogin(null);
        });
        setScreenContentView(page);
    }

    private void addProfileRow(LinearLayout content, String title, String value) {
        LinearLayout card = vertical(SURFACE);
        card.setPadding(dp(15), dp(13), dp(15), dp(13));
        card.setBackground(rounded(SURFACE, 16, BORDER, 1));
        card.addView(text(title.toUpperCase(Locale.ROOT), 9, MUTED, true));
        card.addView(text(value, 15, INK, true), topMarginParams(5));
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        cardParams.topMargin = dp(10);
        content.addView(card, cardParams);
    }

    private void showModule(PortalModule module) {
        setSystemBars(BACKGROUND, false);
        LinearLayout page = vertical(BACKGROUND);
        LinearLayout content = vertical(BACKGROUND);
        content.setPadding(dp(20), dp(18), dp(20), dp(24));
        Button back = button("‹    " + roleLabel(activeRole) + " portal", SURFACE, INK);
        back.setGravity(Gravity.CENTER_VERTICAL);
        back.setBackground(rounded(SURFACE, 16, BORDER, 1));
        content.addView(back, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));
        back.setOnClickListener(view -> showDashboard());

        LinearLayout hero = vertical(SURFACE);
        hero.setPadding(dp(20), dp(20), dp(20), dp(20));
        hero.setBackground(rounded(SURFACE, 22, BORDER, 1));
        TextView icon = text(module.icon, 27, accentOnDark(module.color), true);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(rounded(tint(module.color, 0.1f), 18, tint(module.color, 0.1f), 0));
        hero.addView(icon, new LinearLayout.LayoutParams(dp(54), dp(54)));
        hero.addView(text(module.title, 23, INK, true), topMarginParams(16));
        hero.addView(text(module.subtitle, 14, MUTED, false), topMarginParams(7));
        LinearLayout.LayoutParams heroParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        heroParams.topMargin = dp(20);
        content.addView(hero, heroParams);

        LinearLayout status = vertical(SURFACE);
        status.setPadding(dp(16), dp(15), dp(16), dp(15));
        status.setBackground(gradient(Color.rgb(36, 25, 78), SURFACE, 17));
        status.addView(text("Native feature rollout", 14, INK, true));
        status.addView(text("This screen is part of your Android app. This feature's live school data and actions are being connected in the next native update.",
                13, MUTED, false), topMarginParams(7));
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        statusParams.topMargin = dp(15);
        content.addView(status, statusParams);

        page.addView(content, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNavigation(""));
        setScreenContentView(page);
    }

    private List<PortalModule> modulesFor(String role) {
        List<PortalModule> modules = new ArrayList<>();
        switch (normalizeRole(role)) {
            case "school-admin":
            case "super-admin":
                modules.add(new PortalModule("Students", "Admissions and student records", "♙", PRIMARY));
                modules.add(new PortalModule("Admissions", "New inquiries and enrollment", "＋", Color.rgb(77, 117, 230)));
                modules.add(new PortalModule("Staff & payroll", "Staff profiles and salary", "♟", TEAL));
                modules.add(new PortalModule("Attendance", "Student and staff attendance", "◷", Color.rgb(232, 148, 42)));
                modules.add(new PortalModule("Fees & collection", "Collections and fee status", "₹", Color.rgb(35, 155, 107)));
                modules.add(new PortalModule("Exams & results", "Marks, report cards and results", "✎", Color.rgb(139, 93, 203)));
                modules.add(new PortalModule("Timetable", "Classes, periods and schedules", "▣", Color.rgb(53, 146, 190)));
                modules.add(new PortalModule("Homework", "Assignments and classwork", "▤", TEAL));
                modules.add(new PortalModule("Communication", "Notices and parent updates", "✉", Color.rgb(216, 92, 130)));
                modules.add(new PortalModule("Reports & analytics", "School performance overview", "▥", Color.rgb(101, 111, 201)));
                modules.add(new PortalModule("Transport", "Routes and student pickup", "⌑", Color.rgb(45, 154, 145)));
                modules.add(new PortalModule("Library", "Books and issue register", "▧", Color.rgb(180, 125, 53)));
                modules.add(new PortalModule("Inventory", "School assets and supplies", "▤", Color.rgb(88, 132, 155)));
                modules.add(new PortalModule("School settings", "School profile and preferences", "⚙", MUTED));
                break;
            case "teacher":
                modules.add(new PortalModule("My classes", "Classes and assigned students", "▦", PRIMARY));
                modules.add(new PortalModule("Attendance", "Mark today's class attendance", "◷", Color.rgb(232, 148, 42)));
                modules.add(new PortalModule("Homework", "Share and review classwork", "▤", TEAL));
                modules.add(new PortalModule("Marks", "Enter marks and view results", "✎", Color.rgb(139, 93, 203)));
                modules.add(new PortalModule("Timetable", "Your teaching schedule", "▣", Color.rgb(35, 155, 107)));
                modules.add(new PortalModule("Notices", "School announcements", "✉", Color.rgb(216, 92, 130)));
                modules.add(new PortalModule("Lesson plans", "Prepare upcoming lessons", "▤", Color.rgb(53, 146, 190)));
                modules.add(new PortalModule("My profile", "Your staff information", "●", MUTED));
                break;
            case "student":
                modules.add(new PortalModule("Timetable", "Your classes and daily schedule", "▣", PRIMARY));
                modules.add(new PortalModule("Homework", "Assignments and classwork", "▤", TEAL));
                modules.add(new PortalModule("Attendance", "Your attendance record", "◷", Color.rgb(232, 148, 42)));
                modules.add(new PortalModule("Results", "Exams and academic progress", "✎", Color.rgb(139, 93, 203)));
                modules.add(new PortalModule("Fees", "Fee status and due dates", "₹", Color.rgb(35, 155, 107)));
                modules.add(new PortalModule("Notices", "Messages from your school", "✉", Color.rgb(216, 92, 130)));
                modules.add(new PortalModule("Study material", "Learning resources and notes", "▧", Color.rgb(53, 146, 190)));
                modules.add(new PortalModule("My profile", "Your student information", "●", MUTED));
                break;
            case "parent":
                modules.add(new PortalModule("My children", "Your linked student profiles", "♙", PRIMARY));
                modules.add(new PortalModule("Attendance", "Your child's attendance", "◷", Color.rgb(232, 148, 42)));
                modules.add(new PortalModule("Fees", "Fee balance and payment status", "₹", Color.rgb(35, 155, 107)));
                modules.add(new PortalModule("Results", "Academic progress and results", "✎", Color.rgb(139, 93, 203)));
                modules.add(new PortalModule("Homework", "Your child's assignments", "▤", TEAL));
                modules.add(new PortalModule("School updates", "Notices and communication", "✉", Color.rgb(216, 92, 130)));
                modules.add(new PortalModule("Timetable", "Your child's class schedule", "▣", Color.rgb(53, 146, 190)));
                modules.add(new PortalModule("Contact school", "Reach your school team", "☎", MUTED));
                break;
            default:
                modules.add(new PortalModule("Account", "Contact your school administrator", "•", PRIMARY));
        }
        return modules;
    }

    private void updateRoleButtons() {
        for (Map.Entry<String, TextView> entry : roleButtons.entrySet()) {
            boolean selected = entry.getKey().equals(selectedRole);
            TextView view = entry.getValue();
            view.setTextColor(selected ? Color.WHITE : MUTED);
            view.setBackground(rounded(selected ? PRIMARY : SURFACE, 16,
                    selected ? PRIMARY : BORDER, 1));
        }
    }

    private boolean roleMatches(String expected, String actual) {
        if (expected.equals("admin")) {
            return actual.equals("school-admin") || actual.equals("super-admin");
        }
        return expected.equals(actual);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        String normalized = role.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        if (normalized.equals("admin") || normalized.equals("schooladmin")) {
            return "school-admin";
        }
        if (normalized.equals("superadmin")) {
            return "super-admin";
        }
        return normalized;
    }

    private String roleLabel(String role) {
        switch (normalizeRole(role)) {
            case "school-admin": return "School Admin";
            case "super-admin": return "Super Admin";
            case "teacher": return "Teacher";
            case "student": return "Student";
            case "parent": return "Parent";
            default: return "School";
        }
    }

    private int roleColor(String role) {
        switch (normalizeRole(role)) {
            case "teacher": return TEAL;
            case "student": return Color.rgb(177, 115, 255);
            case "parent": return PINK;
            default: return PRIMARY;
        }
    }

    private String authErrorMessage(Exception exception) {
        if (exception instanceof FirebaseAuthException) {
            String code = ((FirebaseAuthException) exception).getErrorCode();
            if (code != null && (code.contains("INVALID_CREDENTIAL")
                    || code.contains("WRONG_PASSWORD")
                    || code.contains("USER_NOT_FOUND"))) {
                return "The email/username or password is incorrect.";
            }
            if (code != null && code.contains("TOO_MANY_REQUESTS")) {
                return "Too many sign-in attempts. Wait a little and try again.";
            }
            if (code != null && code.contains("NETWORK")) {
                return "No connection. Check your internet and try again.";
            }
        }
        return "Sign-in failed. Check your details and internet connection, then try again.";
    }

    private void addBackHeader(LinearLayout content, String title, String subtitle) {
        Button back = button("‹    " + roleLabel(activeRole) + " portal", SURFACE, INK);
        back.setGravity(Gravity.CENTER_VERTICAL);
        back.setBackground(rounded(SURFACE, 16, BORDER, 1));
        content.addView(back, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));
        back.setOnClickListener(view -> showDashboard());
        TextView heading = text(title, 26, INK, true);
        content.addView(heading, topMarginParams(22));
        content.addView(text(subtitle, 13, MUTED, false), topMarginParams(5));
    }

    private LinearLayout vertical(int backgroundColor) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(backgroundColor);
        return layout;
    }

    private LinearLayout horizontal(int backgroundColor) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        layout.setBackgroundColor(backgroundColor);
        return layout;
    }

    private TextView label(String value) {
        TextView view = text(value, 12, INK, true);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(18);
        params.bottomMargin = dp(2);
        view.setLayoutParams(params);
        return view;
    }

    private EditText input(String hint, int inputType) {
        EditText field = new EditText(this);
        field.setSingleLine(true);
        field.setTextSize(15);
        field.setTextColor(INK);
        field.setHintTextColor(MUTED);
        field.setHint(hint);
        field.setInputType(inputType);
        field.setPadding(dp(15), dp(4), dp(15), dp(4));
        field.setBackground(rounded(SURFACE, 14, BORDER, 1));
        return field;
    }

    private LinearLayout.LayoutParams inputParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        params.topMargin = dp(7);
        return params;
    }

    private Button button(String title, int background) {
        return button(title, background, Color.WHITE);
    }

    private Button button(String title, int background, int foreground) {
        Button view = new Button(this);
        view.setText(title);
        view.setTextSize(14);
        view.setTextColor(foreground);
        view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        view.setAllCaps(false);
        view.setPadding(dp(14), 0, dp(14), 0);
        view.setBackground(rounded(background, 16, background, 0));
        return view;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return view;
    }

    private GradientDrawable rounded(int fill, int radius, int stroke, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        if (strokeWidth > 0) {
            drawable.setStroke(dp(strokeWidth), stroke);
        }
        return drawable;
    }

    private GradientDrawable gradient(int startColor, int endColor, int radius) {
        GradientDrawable drawable = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR, new int[]{startColor, endColor});
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }

    private LinearLayout.LayoutParams topMarginParams(int margin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(margin);
        return params;
    }

    private LinearLayout.LayoutParams leftMarginParams(int margin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.leftMargin = dp(margin);
        return params;
    }

    private int tint(int color, float fraction) {
        int red = Color.red(BACKGROUND);
        int green = Color.green(BACKGROUND);
        int blue = Color.blue(BACKGROUND);
        return Color.rgb(
                (int) (red + (Color.red(color) - red) * fraction),
                (int) (green + (Color.green(color) - green) * fraction),
                (int) (blue + (Color.blue(color) - blue) * fraction));
    }

    private int accentOnDark(int color) {
        return Color.rgb(
                (Color.red(color) + 255) / 2,
                (Color.green(color) + 255) / 2,
                (Color.blue(color) + 255) / 2);
    }

    private String initials(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "TD";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, 1).toUpperCase(Locale.ROOT);
        }
        return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1))
                .toUpperCase(Locale.ROOT);
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void setSystemBars(int color, boolean lightIcons) {
        Window window = getWindow();
        window.setStatusBarColor(color);
        window.setNavigationBarColor(color);
        int flags = window.getDecorView().getSystemUiVisibility();
        if (lightIcons) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            flags &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
        window.getDecorView().setSystemUiVisibility(flags);
    }

    private void setScreenContentView(View root) {
        int topInset = Math.max(root.getPaddingTop(), dp(28));
        int bottomInset = Math.max(root.getPaddingBottom(), dp(24));
        root.setPadding(root.getPaddingLeft(), topInset, root.getPaddingRight(), bottomInset);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            androidx.core.graphics.Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars());
            view.setPadding(view.getPaddingLeft(), Math.max(insets.top, topInset),
                    view.getPaddingRight(), Math.max(insets.bottom, bottomInset));
            return windowInsets;
        });
        setContentView(root);
    }

    private void hideKeyboard() {
        View focus = getCurrentFocus();
        if (focus != null) {
            InputMethodManager manager = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            manager.hideSoftInputFromWindow(focus.getWindowToken(), 0);
            focus.clearFocus();
        }
    }

    private static class PortalModule {
        final String title;
        final String subtitle;
        final String icon;
        final int color;

        PortalModule(String title, String subtitle, String icon, int color) {
            this.title = title;
            this.subtitle = subtitle;
            this.icon = icon;
            this.color = color;
        }
    }

    private static class DashboardStat {
        final String label;
        final String value;
        final String detail;
        final int color;
        final String icon;

        DashboardStat(String label, String value, String detail, int color, String icon) {
            this.label = label;
            this.value = value;
            this.detail = detail;
            this.color = color;
            this.icon = icon;
        }
    }
}
