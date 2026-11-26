/*
 * ============================================================
 *  School Portal - Mock Database Seed (shared test data)
 *  CIT2011 Web Programming - Group Project
 * ------------------------------------------------------------
 *  Group Members (Name - ID# - Lab day/time):
 *    Student 1: [Full Name] - [ID#] - [Day / Time]
 *    Student 2: [Full Name] - [ID#] - [Day / Time]
 *    Student 3: Dejahnae Fairclough - 2406846 - [Day / Time]
 *    Student 4: Shemar Lindo - 2401825 - Friday 8:00am
 *    Student 5: [Full Name] - [ID#] - [Day / Time]
 * ------------------------------------------------------------
 *  Purpose:
 *    Puts starter arrays into localStorage ONLY if they are not
 *    already there, so the Teacher Module can be tested on its
 *    own. School: Meadowbrook High School, 2 Meadowbrook Avenue,
 *    Kingston 19 (Grades 7-13, subjects from the school website).
 *
 *    If Student 2's storage.js is loaded BEFORE this file, its
 *    STORAGE_KEYS names are used, so every page shares one set of
 *    data. Any key storage.js does not define falls back to the
 *    defaults below.
 * ============================================================
 */

/* Default storage key names */
const DEFAULT_STORAGE_KEYS = {
    students: "portal_students",
    subjects: "portal_subjects",
    teachers: "portal_teachers",
    grades: "portal_grades",
    reportComments: "portal_reportComments",
    currentUser: "portal_currentUser" /* kept in sessionStorage */
};

/*
 * The key names this module actually uses: Student 2's STORAGE_KEYS
 * (from storage.js) win wherever they exist, defaults fill the gaps.
 */
const PORTAL_KEYS = Object.assign(
    {},
    DEFAULT_STORAGE_KEYS,
    typeof STORAGE_KEYS !== "undefined" ? STORAGE_KEYS : {}
);

/*
 * Subjects taken from Meadowbrook's academic departments, and the grade
 * levels each one is taught in. Grades 12-13 (Sixth Form) take CAPE subjects.
 */
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

/* Sample teachers (made-up names) and the subjects each one is allowed to grade */
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

/*
 * Builds 56 students: grades 7-13, classes A and B, 4 students per class.
 * Names are picked in order so the data is the same every time.
 * Each record also has Student 3's fields (name, studentClass, status)
 * so the admin registry page can show these students too.
 */
function buildSeedStudents() {
    const studentList = [];
    let nameIndex = 0;

    for (let gradeLevel = 7; gradeLevel <= 13; gradeLevel++) {
        ["A", "B"].forEach(function (classLetter) {
            for (let seat = 1; seat <= 4; seat++) {
                const firstName = SEED_FIRST_NAMES[nameIndex % SEED_FIRST_NAMES.length];
                const lastName = SEED_LAST_NAMES[(nameIndex * 3 + Math.floor(nameIndex / SEED_FIRST_NAMES.length)) % SEED_LAST_NAMES.length];
                studentList.push({
                    id: "S" + (1000 + nameIndex + 1),
                    name: firstName + " " + lastName,     /* Student 3 field */
                    firstName: firstName,
                    lastName: lastName,
                    gradeLevel: gradeLevel,
                    className: gradeLevel + classLetter,
                    studentClass: "Grade " + gradeLevel,  /* Student 3 field */
                    status: "Active",                     /* Student 3 field */
                    cohort: "2026/2027 - Semester 1"
                });
                nameIndex++;
            }
        });
    }
    return studentList;
}

/*
 * Makes a repeatable "random" score from a text seed, so the
 * sample Term 1 grades are the same every time the data is reset.
 */
function seededScore(seedText, maximum) {
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
        hash = (hash * 31 + seedText.charCodeAt(i)) % 100000;
    }
    /* keep scores between 45% and 100% of the maximum */
    const fraction = 0.45 + (hash % 56) / 100;
    return Math.round(fraction * maximum);
}

/* Pre-fills Term 1 grades for every student and subject so report cards have data */
function buildSeedGrades(studentList) {
    const gradeList = [];

    studentList.forEach(function (student) {
        SEED_SUBJECTS.forEach(function (subject) {
            if (subject.gradeLevels.indexOf(student.gradeLevel) === -1) {
                return; /* subject not offered at this grade level */
            }
            const teacher = SEED_TEACHERS.find(function (t) {
                return t.subjects.indexOf(subject.code) !== -1;
            });
            const coursework = seededScore(student.id + subject.code + "cw", 40);
            const exam = seededScore(student.id + subject.code + "ex", 60);

            gradeList.push({
                studentId: student.id,
                subjectCode: subject.code,
                term: "Term 1",
                coursework: coursework,
                exam: exam,
                total: coursework + exam,
                enteredBy: teacher ? teacher.username : "admin",
                updatedAt: "2026-10-30T12:00:00.000Z"
            });
        });
    });
    return gradeList;
}

/* Only writes a key if it is missing, so real data is never overwritten */
function seedIfMissing(storageKey, starterValue) {
    if (localStorage.getItem(storageKey) === null) {
        localStorage.setItem(storageKey, JSON.stringify(starterValue));
    }
}

function initialiseMockDatabase() {
    const seedStudents = buildSeedStudents();
    seedIfMissing(PORTAL_KEYS.subjects, SEED_SUBJECTS);
    seedIfMissing(PORTAL_KEYS.teachers, SEED_TEACHERS);
    seedIfMissing(PORTAL_KEYS.students, seedStudents);
    seedIfMissing(PORTAL_KEYS.grades, buildSeedGrades(seedStudents));
    seedIfMissing(PORTAL_KEYS.reportComments, []);
}

initialiseMockDatabase();
