/*
CIT2011 Web Programming - Group Project
Group Members:
1. Shemar Lindo - 2401825 [Student 4] - Friday, 8:00 AM
2. Justin Francis - 2508413 [Student 5] - Friday, 8:00 AM
3. Sashkea Angrin - 2403272 [Student 1] - Friday, 8:00 AM
4. Dejahnae Fairclough - 2406846 [Student 3] - Friday, 8:00 AM
5. Kofi Foster - 2403233 [Student 2] - Friday, 8:00 AM
Lab: Friday, 8:00 AM
File: js/auth.js
Role: Student 2 - Authentication & Role Token Handler
 */

// Destination page for each user role
const ROLE_ROUTES = {
    admin: "Admin_Dashboard.html",
    teacher: "teacher.html",
    viewer: "viewer.html"
};

// Save the logged-in user's session in sessionStorage
function createSession(user) {
    const session = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        subjects: user.subjects || [],
        token: "TOK-" + user.id + "-" + Date.now(),
        loggedInAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    return session;
}

// Read the active session from sessionStorage
function getActiveSession() {
    const rawSession = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (!rawSession) {
        return null;
    }

    try {
        return JSON.parse(rawSession);
    } catch (error) {
        console.log("Invalid session data:", error);
        return null;
    }
}

// Clear the session and send the user back to login
function logoutUser(redirectTo = "login.html") {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    window.location.href = redirectTo;
}

// Verify username and password against stored users
function authenticateUser(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);

    const matchedUser = users.find(function (user) {
        return user.username.toLowerCase() === cleanUsername && user.password === password;
    });

    if (!matchedUser) {
        return {
            success: false,
            message: "Invalid username or password."
        };
    }

    const session = createSession(matchedUser);
    return {
        success: true,
        session: session,
        redirectUrl: ROLE_ROUTES[matchedUser.role] || "index.html"
    };
}

// Redirect users who are not logged in or lack permission for a page
function requireRole(allowedRoles) {
    const session = getActiveSession();

    if (!session || !session.token) {
        window.location.href = "login.html";
        return null;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
        window.location.href = ROLE_ROUTES[session.role] || "login.html";
        return null;
    }

    return session;
}

// Attach submit listener when on the login page
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) {
        return;
    }

    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    const errorBox = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = usernameInput ? usernameInput.value : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!username.trim() || !password) {
            if (errorBox) {
                errorBox.textContent = "Please enter both username and password.";
            }
            return;
        }

        const result = authenticateUser(username, password);
        if (!result.success) {
            if (errorBox) {
                errorBox.textContent = result.message;
            }
            return;
        }

        if (errorBox) {
            errorBox.textContent = "";
        }

        window.location.href = result.redirectUrl;
    });
});