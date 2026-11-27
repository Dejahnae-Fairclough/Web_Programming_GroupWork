/*
CIT2011 Web Programming - Group Project
Group Members:
1. Shemar Lindo - 2401825 [Student 4] - Friday, 8:00 AM
2. Justin Francis - 2508413 [Student 5] - Friday, 8:00 AM
3. Sashkea Angrin - 2403272 [Student 1] - Friday, 8:00 AM
4. Dejahnae Fairclough - 2406846 [Student 3] - Friday, 8:00 AM
5. Kofi Foster - 2403233 [Student 2] - Friday, 8:00 AM
Lab: Friday, 8:00 AM
*/


// Central list of browser storage keys used by the portal
const STORAGE_KEYS = {
    USERS: "portal_users",
    SESSION: "portal_currentUser",
    STUDENTS: "portal_students",
    GRADES: "portal_grades",
    LEDGER: "portal_ledger",
    SUBJECTS: "portal_subjects",
    TEACHERS: "portal_teachers",
    REPORT_COMMENTS: "portal_reportComments"
};

// Default login accounts for testing role-based access
const DEFAULT_USERS = [
    {
        id: "USR-01",
        username: "admin",
        password: "Password123!",
        fullName: "Mr. Kevin Facey (Principal)",
        role: "admin"
    },
    {
        id: "USR-02",
        username: "tbrown",
        password: "Password123!",
        fullName: "Mr. Andre Brown",
        role: "teacher",
        subjects: ["MATH", "IT", "COMPSCI"]
    },
    {
        id: "USR-03",
        username: "tcampbell",
        password: "Password123!",
        fullName: "Mrs. Karen Campbell",
        role: "teacher",
        subjects: ["ENG", "ENGLIT", "COMM"]
    },
    {
        id: "USR-04",
        username: "viewer1",
        password: "Password123!",
        fullName: "Parent / Guest Viewer",
        role: "viewer"
    }
];

// Starter student list if no student records exist yet
const DEFAULT_STUDENTS = [
    {
        id: "S1001",
        name: "Aaliyah Henry",
        firstName: "Aaliyah",
        lastName: "Henry",
        gradeLevel: 10,
        className: "10A",
        studentClass: "Grade 10",
        status: "Active",
        cohort: "2026/2027 - Semester 1"
    },
    {
        id: "S1002",
        name: "Brandon Thompson",
        firstName: "Brandon",
        lastName: "Thompson",
        gradeLevel: 10,
        className: "10A",
        studentClass: "Grade 10",
        status: "Active",
        cohort: "2026/2027 - Semester 1"
    }
];

// Starter grade record
const DEFAULT_GRADES = [
    {
        id: "GRD-1",
        studentId: "S1001",
        subjectCode: "MATH",
        term: "Term 1",
        coursework: 34,
        exam: 50,
        total: 84,
        enteredBy: "tbrown",
        updatedAt: "2026-10-30T12:00:00.000Z"
    }
];

// Starter tuition / payment records
const DEFAULT_LEDGER = [
    {
        id: "TXN-1",
        studentId: "S1001",
        studentName: "Aaliyah Henry",
        tuitionAmount: 95000,
        amountPaid: 95000,
        status: "Paid"
    },
    {
        id: "TXN-2",
        studentId: "S1002",
        studentName: "Brandon Thompson",
        tuitionAmount: 95000,
        amountPaid: 45000,
        status: "Pending"
    }
];

// Read a JSON array from localStorage safely
function loadFromStorage(key, fallbackValue = []) {
    const rawData = localStorage.getItem(key);
    if (!rawData) {
        return fallbackValue;
    }

    try {
        return JSON.parse(rawData);
    } catch (error) {
        console.log("Error reading storage key:", key, error);
        return fallbackValue;
    }
}

// Save a value to localStorage as JSON
function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Seed default records only when a key is not already stored
function initializeDatabase() {
    const starterData = {
        [STORAGE_KEYS.USERS]: DEFAULT_USERS,
        [STORAGE_KEYS.STUDENTS]: DEFAULT_STUDENTS,
        [STORAGE_KEYS.GRADES]: DEFAULT_GRADES,
        [STORAGE_KEYS.LEDGER]: DEFAULT_LEDGER
    };

    for (const key in starterData) {
        if (!localStorage.getItem(key)) {
            saveToStorage(key, starterData[key]);
        }
    }
}

initializeDatabase();