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

// Use shared STORAGE_KEYS if loaded first, otherwise fall back to portal_* names
const PORTAL_KEYS = {
    students: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.STUDENTS) || "portal_students",
    subjects: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.SUBJECTS) || "portal_subjects",
    teachers: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.TEACHERS) || "portal_teachers",
    grades: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.GRADES) || "portal_grades",
    reportComments: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.REPORT_COMMENTS) || "portal_reportComments",
    currentUser: (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.SESSION) || "portal_currentUser"
};

const SEED_SUBJECTS = [
    { code: "ENG", name: "English Language", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "ENGLIT", name: "English Literature", gradeLevels: [9, 10, 11] },
    { code: "MATH", name: "Mathematics", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "INTSCI", name: "Integrated Science", gradeLevels: [7, 8, 9] },
    { code: "BIO", name: "Biology", gradeLevels: [10, 11, 12, 13] },
    { code: "CHEM", name: "Chemistry", gradeLevels: [10, 11] },
    { code: "SOCST", name: "Social Studies", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "HIST", name: "Caribbean History", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "POA", name: "Principles of Accounts", gradeLevels: [10, 11] },
    { code: "IT", name: "Information Technology", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "SPAN", name: "Spanish", gradeLevels: [7, 8, 9, 10, 11] },
    { code: "COMM", name: "Communication Studies", gradeLevels: [12, 13] },
    { code: "PUREMATH", name: "Pure Mathematics", gradeLevels: [12, 13] },
    { code: "COMPSCI", name: "Computer Science", gradeLevels: [12, 13] },
    { code: "CARIB", name: "Caribbean Studies", gradeLevels: [12, 13] }
];

const SEED_TEACHERS = [
    { username: "tbrown", fullName: "Mr. Andre Brown", subjects: ["MATH", "IT", "COMPSCI"] },
    { username: "tcampbell", fullName: "Mrs. Karen Campbell", subjects: ["ENG", "ENGLIT", "COMM"] },
    { username: "twilliams", fullName: "Ms. Tanya Williams", subjects: ["INTSCI", "BIO", "CHEM"] },
    { username: "tgordon", fullName: "Mr. Ricardo Gordon", subjects: ["SPAN", "SOCST"] },
    { username: "tmorgan", fullName: "Mrs. Paula Morgan", subjects: ["HIST", "CARIB", "POA", "PUREMATH"] }
];

const SEED_FIRST_NAMES = [
    "Aaliyah", "Brandon", "Chantelle", "Damion", "Ebony", "Fabian", "Gabrielle", "Horace",
    "Imani", "Jordan", "Kemar", "Latoya", "Marlon", "Nadine", "Omar", "Princess",
    "Quincy", "Renee", "Shanice", "Tyrone", "Udeen", "Venice", "Wayne", "Ximena",
    "Yanique", "Zavier", "Akeem", "Brianna", "Coreen", "Dwayne", "Ellis", "Fiona",
    "Garfield", "Hanna", "Isaiah", "Jada", "Kevaughn", "Lisa", "Mario", "Nickeisha"
];

const SEED_LAST_NAMES = [
    "Henry", "Thompson", "Reid", "Morgan", "Francis", "Grant", "Clarke", "Spence",
    "Lewis", "Bailey", "Johnson", "Walker", "Edwards", "Robinson", "Allen", "Hall"
];

// Generate 56 sample students across Grades 7-13 (Classes A & B, 4 students each)
function buildSeedStudents() {
    const list = [];
    let index = 0;

    for (let grade = 7; grade <= 13; grade++) {
        for (const section of ["A", "B"]) {
            for (let seat = 1; seat <= 4; seat++) {
                const firstName = SEED_FIRST_NAMES[index % SEED_FIRST_NAMES.length];
                const lastName = SEED_LAST_NAMES[(index * 3 + Math.floor(index / SEED_FIRST_NAMES.length)) % SEED_LAST_NAMES.length];

                list.push({
                    id: "S" + (1001 + index),
                    name: `${firstName} ${lastName}`,
                    firstName,
                    lastName,
                    gradeLevel: grade,
                    className: `${grade}${section}`,
                    studentClass: `Grade ${grade}`,
                    status: "Active",
                    cohort: "2026/2027 - Semester 1"
                });
                index++;
            }
        }
    }
    return list;
}

// Generate a repeatable score between 45% and 100% of the max mark
function seededScore(seedText, maxScore) {
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
        hash = (hash * 31 + seedText.charCodeAt(i)) % 100000;
    }
    return Math.round((0.45 + (hash % 56) / 100) * maxScore);
}

// Create Term 1 sample grades for each student's eligible subjects
function buildSeedGrades(students) {
    const grades = [];

    for (const student of students) {
        for (const subject of SEED_SUBJECTS) {
            if (!subject.gradeLevels.includes(student.gradeLevel)) continue;

            const teacher = SEED_TEACHERS.find((t) => t.subjects.includes(subject.code));
            const coursework = seededScore(`${student.id}${subject.code}cw`, 40);
            const exam = seededScore(`${student.id}${subject.code}ex`, 60);

            grades.push({
                studentId: student.id,
                subjectCode: subject.code,
                term: "Term 1",
                coursework,
                exam,
                total: coursework + exam,
                enteredBy: teacher ? teacher.username : "admin",
                updatedAt: "2026-10-30T12:00:00.000Z"
            });
        }
    }
    return grades;
}

// Only write starter data if the key is not already in localStorage
function seedIfMissing(key, value) {
    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

function initialiseMockDatabase() {
    const students = buildSeedStudents();
    seedIfMissing(PORTAL_KEYS.subjects, SEED_SUBJECTS);
    seedIfMissing(PORTAL_KEYS.teachers, SEED_TEACHERS);
    seedIfMissing(PORTAL_KEYS.students, students);
    seedIfMissing(PORTAL_KEYS.grades, buildSeedGrades(students));
    seedIfMissing(PORTAL_KEYS.reportComments, []);
}

initialiseMockDatabase();