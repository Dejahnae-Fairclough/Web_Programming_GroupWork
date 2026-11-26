/*
 * ============================================================
 *  School Portal - Teacher Module Logic (teacher.js)
 *  CIT2011 Web Programming - Group Project
 * ------------------------------------------------------------
 *  Group Members (Name - ID# - Lab day/time):
 *    Student 1: [Full Name] - [ID#] - [Day / Time]
 *    Student 2: [Full Name] - [ID#] - [Day / Time]
 *    Student 3: Dejahnae Fairclough - 2406846 - [Day / Time]
 *    Student 4: Shemar Lindo - 2401825 - Friday 8:00am
 *    Student 5: [Full Name] - [ID#] - [Day / Time]
 * ------------------------------------------------------------
 *  Owner: Student 4 - Instructor Workflow Specialist
 *
 *  Sections in this file:
 *    1. Settings (grading scale, score limits, terms)
 *    2. Storage helpers (read/write localStorage)
 *    3. Grade calculations (letter grade, GPA, averages)
 *    4. Sign-in check
 *    5. Cascading subject filter (Subject > Grade > Class > Term)
 *    6. Grade entry table (typing, checking, saving, batch paste)
 *    7. Report card engine (compile + display + print)
 *    8. Start-up
 *
 *  Needs js/mock-data.js loaded first (it defines PORTAL_KEYS).
 * ============================================================
 */

/* ------------------------------------------------------------
 * 1. SETTINGS
 * ---------------------------------------------------------- */
const SCHOOL_NAME = "Meadowbrook High School";
const COURSEWORK_MAX = 40;
const EXAM_MAX = 60;
const PASS_MARK = 50;
const TERM_LIST = ["Term 1", "Term 2", "Term 3"];

/* Grading scale, highest first. A total must be >= minimum to earn that letter. */
const GRADE_SCALE = [
    { minimum: 80, letter: "A", points: 4.0, remark: "Excellent" },
    { minimum: 70, letter: "B", points: 3.0, remark: "Very Good" },
    { minimum: 60, letter: "C", points: 2.0, remark: "Good" },
    { minimum: 50, letter: "D", points: 1.0, remark: "Satisfactory" },
    { minimum: 0, letter: "F", points: 0.0, remark: "Needs Improvement" }
];

/* Remembers what the teacher is working on right now */
const panelState = {
    teacher: null,          /* signed-in teacher record */
    selectedSubject: null,  /* subject object */
    selectedClass: "",      /* e.g. "9A" */
    selectedTerm: "",       /* e.g. "Term 1" */
    classStudents: [],      /* students in the loaded class */
    hasUnsavedChanges: false
};

/* ------------------------------------------------------------
 * 2. STORAGE HELPERS
 * ---------------------------------------------------------- */

/* Reads an array from localStorage. Returns [] if missing or damaged. */
function readStoredList(storageKey) {
    try {
        const storedList = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(storedList) ? storedList : [];
    } catch (error) {
        return [];
    }
}

function writeStoredList(storageKey, list) {
    localStorage.setItem(storageKey, JSON.stringify(list));
}

function getSubjectByCode(subjectCode) {
    return readStoredList(PORTAL_KEYS.subjects).find(function (subject) {
        return subject.code === subjectCode;
    });
}

/*
 * Student records can come from two places with different field names:
 *   - Student 3's admin page:  { id, name, studentClass: "Grade 9", status }
 *   - the seed data:           { id, firstName, lastName, gradeLevel, className, ... }
 * This turns either one into the same shape so the rest of the file
 * only has to deal with: id, fullName, gradeLevel, className, cohort, status.
 */
function normaliseStudent(record) {
    const fullName = record.name ||
        ((record.firstName || "") + " " + (record.lastName || "")).trim();

    /* grade level: use the number if given, otherwise pull it out of "Grade 9" or "9A" */
    let gradeLevel = Number(record.gradeLevel);
    if (!gradeLevel) {
        const digits = String(record.className || record.studentClass || "").match(/\d+/);
        gradeLevel = digits ? Number(digits[0]) : 0;
    }

    return {
        id: String(record.id),
        fullName: fullName || "(no name)",
        gradeLevel: gradeLevel,
        className: record.className || record.studentClass || "Grade " + gradeLevel,
        cohort: record.cohort || "",
        status: record.status || "Active"
    };
}

/* All ACTIVE students, in the common shape (inactive students are not graded) */
function readStudents() {
    return readStoredList(PORTAL_KEYS.students)
        .map(normaliseStudent)
        .filter(function (student) {
            return student.status !== "Inactive";
        });
}

function getStudentById(studentId) {
    return readStudents().find(function (student) {
        return student.id === studentId;
    });
}

/* Finds one saved grade for a student, subject and term (or undefined) */
function findGradeRecord(gradeList, studentId, subjectCode, term) {
    return gradeList.find(function (record) {
        return record.studentId === studentId &&
            record.subjectCode === subjectCode &&
            record.term === term;
    });
}

function getFullName(student) {
    return student.fullName;
}

/*
 * Makes text safe to put inside innerHTML, so a name typed into the
 * admin registry like "<b>Tom" shows as text instead of becoming HTML.
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
 * 3. GRADE CALCULATIONS
 * ---------------------------------------------------------- */

/* Returns the grade-scale row (letter, points, remark) for a total out of 100 */
function getGradeBand(total) {
    for (let i = 0; i < GRADE_SCALE.length; i++) {
        if (total >= GRADE_SCALE[i].minimum) {
            return GRADE_SCALE[i];
        }
    }
    return GRADE_SCALE[GRADE_SCALE.length - 1];
}

function calculateAverage(numberList) {
    if (numberList.length === 0) {
        return null;
    }
    const sum = numberList.reduce(function (runningTotal, value) {
        return runningTotal + value;
    }, 0);
    return sum / numberList.length;
}

/* Rounds to 1 decimal place and shows "-" when there is no value */
function formatNumber(value) {
    return value === null ? "-" : (Math.round(value * 10) / 10).toString();
}

/*
 * Checks one score box. Returns an object:
 *   { isBlank, isValid, value, message }
 */
function checkScore(rawText, maximum) {
    const trimmedText = rawText.trim();
    if (trimmedText === "") {
        return { isBlank: true, isValid: true, value: null, message: "" };
    }
    const value = Number(trimmedText);
    if (Number.isNaN(value)) {
        return { isBlank: false, isValid: false, value: null, message: "Numbers only" };
    }
    if (value < 0 || value > maximum) {
        return { isBlank: false, isValid: false, value: null, message: "Must be 0 - " + maximum };
    }
    /* allow half marks only, e.g. 32.5 */
    if (value * 2 !== Math.floor(value * 2)) {
        return { isBlank: false, isValid: false, value: null, message: "Use whole or half marks" };
    }
    return { isBlank: false, isValid: true, value: value, message: "" };
}

/* ------------------------------------------------------------
 * 4. SIGN-IN CHECK
 *    Student 2's login page should save the signed-in user to
 *    sessionStorage as: { username, role, fullName }
 * ---------------------------------------------------------- */
function getSignedInTeacher() {
    let sessionUser = null;
    try {
        sessionUser = JSON.parse(sessionStorage.getItem(PORTAL_KEYS.currentUser));
    } catch (error) {
        sessionUser = null;
    }
    if (!sessionUser || sessionUser.role !== "teacher") {
        return null;
    }
    /* Look up the full teacher record to get their subjects */
    const teacherRecord = readStoredList(PORTAL_KEYS.teachers).find(function (teacher) {
        return teacher.username === sessionUser.username;
    });
    return teacherRecord || null;
}

/* TESTING ONLY - signs in as the first seeded teacher. Remove after login.html is merged. */
function signInAsDemoTeacher() {
    const demoTeacher = readStoredList(PORTAL_KEYS.teachers)[0];
    sessionStorage.setItem(PORTAL_KEYS.currentUser, JSON.stringify({
        username: demoTeacher.username,
        role: "teacher",
        fullName: demoTeacher.fullName
    }));
    window.location.reload();
}

function logOut() {
    if (panelState.hasUnsavedChanges && !window.confirm("You have unsaved grades. Log out anyway?")) {
        return;
    }
    panelState.hasUnsavedChanges = false;
    sessionStorage.removeItem(PORTAL_KEYS.currentUser);
    window.location.href = "login.html";
}

/* ------------------------------------------------------------
 * 5. CASCADING SUBJECT FILTER
 *    Each dropdown is only switched on after the one before it
 *    has a value. Changing an earlier one clears the later ones.
 * ---------------------------------------------------------- */
const subjectSelect = document.getElementById("subjectSelect");
const gradeLevelSelect = document.getElementById("gradeLevelSelect");
const classSelect = document.getElementById("classSelect");
const termSelect = document.getElementById("termSelect");
const loadStudentsButton = document.getElementById("loadStudentsButton");

/* Replaces a dropdown's options (keeps the "-- Select --" first option) */
function fillDropdown(selectElement, optionList) {
    const placeholderOption = selectElement.options[0];
    selectElement.innerHTML = "";
    selectElement.appendChild(placeholderOption);

    optionList.forEach(function (optionData) {
        const optionElement = document.createElement("option");
        optionElement.value = optionData.value;
        optionElement.textContent = optionData.label;
        selectElement.appendChild(optionElement);
    });
    selectElement.value = "";
}

/* Clears and disables a dropdown */
function resetDropdown(selectElement) {
    fillDropdown(selectElement, []);
    selectElement.disabled = true;
}

/* Highlights the current step in the step tracker */
function updateStepTracker(currentStep) {
    document.querySelectorAll("#stepTracker li").forEach(function (stepItem) {
        const stepNumber = Number(stepItem.dataset.step);
        stepItem.classList.toggle("step-done", stepNumber < currentStep);
        stepItem.classList.toggle("step-active", stepNumber === currentStep);
    });
}

/* Asks before throwing away typed-but-unsaved grades */
function canLeaveCurrentClass() {
    if (!panelState.hasUnsavedChanges) {
        return true;
    }
    return window.confirm("You have unsaved grades for this class. Discard them?");
}

/* Hides the grade table and report area when the filter changes */
function hideClassSections() {
    document.getElementById("gradeEntrySection").hidden = true;
    document.getElementById("reportSection").hidden = true;
    document.getElementById("reportCard").hidden = true;
    panelState.hasUnsavedChanges = false;
}

/* Step 1: only the teacher's own subjects are listed */
function fillSubjectDropdown() {
    const subjectOptions = panelState.teacher.subjects
        .map(getSubjectByCode)
        .filter(Boolean)
        .map(function (subject) {
            return { value: subject.code, label: subject.name };
        });
    fillDropdown(subjectSelect, subjectOptions);
}

/* Step 2: grade levels where the subject is taught AND students exist */
function handleSubjectChange() {
    resetDropdown(gradeLevelSelect);
    resetDropdown(classSelect);
    resetDropdown(termSelect);
    loadStudentsButton.disabled = true;

    panelState.selectedSubject = getSubjectByCode(subjectSelect.value) || null;
    if (!panelState.selectedSubject) {
        updateStepTracker(1);
        return;
    }

    const allStudents = readStudents();
    const levelOptions = panelState.selectedSubject.gradeLevels
        .filter(function (level) {
            return allStudents.some(function (student) {
                return student.gradeLevel === level;
            });
        })
        .map(function (level) {
            return { value: String(level), label: "Grade " + level };
        });

    fillDropdown(gradeLevelSelect, levelOptions);
    gradeLevelSelect.disabled = false;
    updateStepTracker(2);
}

/* Step 3: classes found in that grade level */
function handleGradeLevelChange() {
    resetDropdown(classSelect);
    resetDropdown(termSelect);
    loadStudentsButton.disabled = true;

    if (gradeLevelSelect.value === "") {
        updateStepTracker(2);
        return;
    }

    const chosenLevel = Number(gradeLevelSelect.value);
    const classNames = [];
    readStudents().forEach(function (student) {
        if (student.gradeLevel === chosenLevel && classNames.indexOf(student.className) === -1) {
            classNames.push(student.className);
        }
    });
    classNames.sort();

    fillDropdown(classSelect, classNames.map(function (name) {
        return { value: name, label: "Class " + name };
    }));
    classSelect.disabled = false;
    updateStepTracker(3);
}

/* Step 4: choose the term */
function handleClassChange() {
    resetDropdown(termSelect);
    loadStudentsButton.disabled = true;

    if (classSelect.value === "") {
        updateStepTracker(3);
        return;
    }
    fillDropdown(termSelect, TERM_LIST.map(function (term) {
        return { value: term, label: term };
    }));
    termSelect.disabled = false;
    updateStepTracker(4);
}

function handleTermChange() {
    loadStudentsButton.disabled = termSelect.value === "";
    updateStepTracker(termSelect.value === "" ? 4 : 5);
}

/*
 * Wraps a filter handler so the teacher is warned about unsaved
 * work first. If they cancel, the dropdown goes back to its old value.
 */
function guardFilterChange(selectElement, handler) {
    let previousValue = selectElement.value;

    selectElement.addEventListener("focus", function () {
        previousValue = selectElement.value;
    });
    selectElement.addEventListener("change", function () {
        if (!canLeaveCurrentClass()) {
            selectElement.value = previousValue;
            return;
        }
        hideClassSections();
        previousValue = selectElement.value;
        handler();
    });
}

/* "Load students" button: shows the grade table for the chosen class */
function handleFilterSubmit(event) {
    event.preventDefault();
    if (!panelState.selectedSubject || classSelect.value === "" || termSelect.value === "") {
        return;
    }
    if (!canLeaveCurrentClass()) {
        return;
    }

    panelState.selectedClass = classSelect.value;
    panelState.selectedTerm = termSelect.value;
    panelState.classStudents = readStudents()
        .filter(function (student) {
            return student.className === panelState.selectedClass;
        })
        .sort(function (a, b) {
            return a.fullName.localeCompare(b.fullName);
        });

    renderGradeTable();
    fillReportStudentDropdown();

    document.getElementById("gradeEntrySection").hidden = false;
    document.getElementById("reportSection").hidden = false;
    document.getElementById("reportCard").hidden = true;
    document.getElementById("gradeEntrySection").scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------
 * 6. GRADE ENTRY TABLE
 * ---------------------------------------------------------- */
const gradeTableBody = document.getElementById("gradeTableBody");

/* Builds one table row per student, filling in any saved scores */
function renderGradeTable() {
    const gradeList = readStoredList(PORTAL_KEYS.grades);
    gradeTableBody.innerHTML = "";

    document.getElementById("gradeEntryContext").textContent =
        panelState.selectedSubject.name + " | Class " + panelState.selectedClass +
        " | " + panelState.selectedTerm;

    if (panelState.classStudents.length === 0) {
        gradeTableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">No students are registered in this class yet.</td></tr>';
        updateClassSummary();
        return;
    }

    panelState.classStudents.forEach(function (student) {
        const savedRecord = findGradeRecord(gradeList, student.id,
            panelState.selectedSubject.code, panelState.selectedTerm);

        const safeName = escapeHtml(getFullName(student));
        const row = document.createElement("tr");
        row.dataset.studentId = student.id;
        row.innerHTML =
            '<td data-label="ID">' + escapeHtml(student.id) + '</td>' +
            '<td data-label="Student">' + safeName + '</td>' +
            '<td data-label="Coursework /40">' +
                '<input type="number" class="score-input" data-field="coursework" min="0" max="' + COURSEWORK_MAX + '" step="0.5" inputmode="decimal" aria-label="Coursework for ' + safeName + '">' +
                '<span class="field-error"></span></td>' +
            '<td data-label="Exam /60">' +
                '<input type="number" class="score-input" data-field="exam" min="0" max="' + EXAM_MAX + '" step="0.5" inputmode="decimal" aria-label="Exam for ' + safeName + '">' +
                '<span class="field-error"></span></td>' +
            '<td data-label="Total /100" class="total-cell">-</td>' +
            '<td data-label="Grade"><span class="grade-badge">-</span></td>' +
            '<td data-label="Status"><span class="status-tag"></span></td>';

        /* put saved values in the boxes */
        if (savedRecord) {
            row.querySelector('[data-field="coursework"]').value = savedRecord.coursework;
            row.querySelector('[data-field="exam"]').value = savedRecord.exam;
        }
        gradeTableBody.appendChild(row);
        updateRow(row, savedRecord ? "saved" : "empty");
    });

    panelState.hasUnsavedChanges = false;
    document.getElementById("saveMessage").textContent = "";
    updateClassSummary();
}

/*
 * Re-checks one row and redraws its total, grade and status.
 * statusOverride lets callers force "saved" / "empty" after loading.
 * Returns true if the row is fine to save.
 */
function updateRow(row, statusOverride) {
    const courseworkInput = row.querySelector('[data-field="coursework"]');
    const examInput = row.querySelector('[data-field="exam"]');
    const courseworkCheck = checkScore(courseworkInput.value, COURSEWORK_MAX);
    const examCheck = checkScore(examInput.value, EXAM_MAX);

    showFieldError(courseworkInput, courseworkCheck.message);
    showFieldError(examInput, examCheck.message);

    /* one box filled but the other empty counts as a mistake */
    let rowIsValid = courseworkCheck.isValid && examCheck.isValid;
    if (rowIsValid && courseworkCheck.isBlank !== examCheck.isBlank) {
        rowIsValid = false;
        const emptyInput = courseworkCheck.isBlank ? courseworkInput : examInput;
        showFieldError(emptyInput, "Enter both scores");
    }

    const totalCell = row.querySelector(".total-cell");
    const gradeBadge = row.querySelector(".grade-badge");

    if (rowIsValid && !courseworkCheck.isBlank) {
        const total = courseworkCheck.value + examCheck.value;
        const band = getGradeBand(total);
        totalCell.textContent = formatNumber(total);
        gradeBadge.textContent = band.letter;
        gradeBadge.className = "grade-badge grade-" + band.letter;
        row.dataset.total = total;
    } else {
        totalCell.textContent = "-";
        gradeBadge.textContent = "-";
        gradeBadge.className = "grade-badge";
        delete row.dataset.total;
    }

    let status = statusOverride;
    if (!status) {
        status = rowIsValid ? "unsaved" : "invalid";
    }
    setRowStatus(row, status);
    return rowIsValid;
}

function showFieldError(inputElement, message) {
    inputElement.nextElementSibling.textContent = message;
    inputElement.classList.toggle("input-invalid", message !== "");
    inputElement.setAttribute("aria-invalid", message !== "" ? "true" : "false");
}

const STATUS_LABELS = {
    saved: "Saved",
    unsaved: "Not saved",
    invalid: "Fix errors",
    empty: "Not graded"
};

function setRowStatus(row, status) {
    const statusTag = row.querySelector(".status-tag");
    statusTag.textContent = STATUS_LABELS[status];
    statusTag.className = "status-tag status-" + status;
    row.dataset.status = status;
}

/* Recalculates the summary boxes under the table */
function updateClassSummary() {
    const totals = [];
    gradeTableBody.querySelectorAll("tr[data-student-id]").forEach(function (row) {
        if (row.dataset.total !== undefined) {
            totals.push(Number(row.dataset.total));
        }
    });

    const passCount = totals.filter(function (total) {
        return total >= PASS_MARK;
    }).length;

    document.getElementById("summaryGraded").textContent =
        totals.length + " / " + panelState.classStudents.length;
    document.getElementById("summaryAverage").textContent = formatNumber(calculateAverage(totals));
    document.getElementById("summaryHighest").textContent =
        totals.length ? formatNumber(Math.max.apply(null, totals)) : "-";
    document.getElementById("summaryPassRate").textContent =
        totals.length ? Math.round((passCount / totals.length) * 100) + "%" : "-";
}

/* Runs every time a score box changes */
function handleScoreInput(event) {
    if (!event.target.classList.contains("score-input")) {
        return;
    }
    const row = event.target.closest("tr");
    updateRow(row);
    panelState.hasUnsavedChanges = true;
    document.getElementById("saveMessage").textContent = "";
    updateClassSummary();
}

/* Enter key jumps to the same column in the next row (fast data entry) */
function handleScoreKeydown(event) {
    if (event.key !== "Enter" || !event.target.classList.contains("score-input")) {
        return;
    }
    event.preventDefault();
    const fieldName = event.target.dataset.field;
    const nextRow = event.target.closest("tr").nextElementSibling;
    if (nextRow) {
        nextRow.querySelector('[data-field="' + fieldName + '"]').focus();
    }
}

/*
 * Saves every valid row to localStorage in one go.
 * Existing records are updated; new ones are added.
 * Clearing both boxes on a saved row deletes that grade.
 */
function saveAllGrades() {
    const saveMessage = document.getElementById("saveMessage");
    const rows = Array.from(gradeTableBody.querySelectorAll("tr[data-student-id]"));

    /* 1. stop if any row has a mistake */
    const invalidRows = rows.filter(function (row) {
        /* keep the current status label unless the row was already marked invalid */
        return !updateRow(row, row.dataset.status === "invalid" ? undefined : row.dataset.status);
    });
    if (invalidRows.length > 0) {
        invalidRows.forEach(function (row) { setRowStatus(row, "invalid"); });
        saveMessage.textContent = invalidRows.length + " row(s) need fixing before saving.";
        saveMessage.className = "form-message message-error";
        invalidRows[0].querySelector(".input-invalid").focus();
        return;
    }

    /* 2. merge the table into the stored grade list */
    const gradeList = readStoredList(PORTAL_KEYS.grades);
    const subjectCode = panelState.selectedSubject.code;
    const term = panelState.selectedTerm;
    let savedCount = 0;
    let removedCount = 0;

    rows.forEach(function (row) {
        const studentId = row.dataset.studentId;
        const courseworkText = row.querySelector('[data-field="coursework"]').value;
        const examText = row.querySelector('[data-field="exam"]').value;
        const existingIndex = gradeList.findIndex(function (record) {
            return record.studentId === studentId && record.subjectCode === subjectCode && record.term === term;
        });

        /* both boxes blank: remove an old grade if there was one */
        if (courseworkText.trim() === "" && examText.trim() === "") {
            if (existingIndex !== -1) {
                gradeList.splice(existingIndex, 1);
                removedCount++;
            }
            setRowStatus(row, "empty");
            return;
        }

        const coursework = Number(courseworkText);
        const exam = Number(examText);
        const record = {
            studentId: studentId,
            subjectCode: subjectCode,
            term: term,
            coursework: coursework,
            exam: exam,
            total: coursework + exam,
            enteredBy: panelState.teacher.username,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex === -1) {
            gradeList.push(record);
        } else {
            gradeList[existingIndex] = record;
        }
        savedCount++;
        setRowStatus(row, "saved");
    });

    writeStoredList(PORTAL_KEYS.grades, gradeList);
    panelState.hasUnsavedChanges = false;

    let messageText = "Saved " + savedCount + " grade(s) for " + panelState.selectedSubject.name + ".";
    if (removedCount > 0) {
        messageText += " Removed " + removedCount + " cleared grade(s).";
    }
    saveMessage.textContent = messageText;
    saveMessage.className = "form-message message-success";

    /* keep an open report card up to date */
    if (!document.getElementById("reportCard").hidden) {
        generateReportCard();
    }
}

function undoUnsavedChanges() {
    if (!panelState.hasUnsavedChanges) {
        return;
    }
    if (window.confirm("Undo all changes since the last save?")) {
        renderGradeTable();
    }
}

/*
 * Batch paste: reads lines like "S1001, 32, 48" and puts the
 * numbers into the matching row. Nothing is saved until the
 * teacher clicks "Save all grades".
 */
function applyBatchScores() {
    const batchMessage = document.getElementById("batchMessage");
    const lines = document.getElementById("batchInput").value.split("\n");
    let filledCount = 0;
    const problemLines = [];

    lines.forEach(function (line, index) {
        if (line.trim() === "") {
            return;
        }
        /* accept commas, tabs (copied from a spreadsheet) or spaces */
        const parts = line.trim().split(/[\s,;]+/);
        const row = gradeTableBody.querySelector('tr[data-student-id="' + (parts[0] || "").toUpperCase() + '"]');

        if (parts.length !== 3 || !row) {
            problemLines.push(index + 1);
            return;
        }
        row.querySelector('[data-field="coursework"]').value = parts[1];
        row.querySelector('[data-field="exam"]').value = parts[2];
        updateRow(row);
        filledCount++;
    });

    if (filledCount > 0) {
        panelState.hasUnsavedChanges = true;
        updateClassSummary();
        document.getElementById("saveMessage").textContent = ""; /* old save message no longer applies */
    }

    batchMessage.textContent = "Filled " + filledCount + " row(s)." +
        (problemLines.length ? " Could not read line(s): " + problemLines.join(", ") + "." : "") +
        (filledCount ? " Check the table, then click Save all grades." : "");
    batchMessage.className = "form-message " + (problemLines.length ? "message-error" : "message-success");
}

/* ------------------------------------------------------------
 * 7. REPORT CARD ENGINE
 * ---------------------------------------------------------- */
const reportStudentSelect = document.getElementById("reportStudentSelect");
const reportCardElement = document.getElementById("reportCard");

function fillReportStudentDropdown() {
    fillDropdown(reportStudentSelect, panelState.classStudents.map(function (student) {
        return { value: student.id, label: getFullName(student) + " (" + student.id + ")" };
    }));
}

/*
 * Works out a student's overall average for a term from a grade list.
 * Returns null if they have no grades that term.
 */
function getTermAverage(gradeList, studentId, term) {
    const totals = gradeList
        .filter(function (record) {
            return record.studentId === studentId && record.term === term;
        })
        .map(function (record) {
            return record.total;
        });
    return calculateAverage(totals);
}

/*
 * THE COMPILER: takes one student and one term and returns all the
 * numbers a report card needs. It does not touch the page, so it
 * can be reused by other modules (e.g. Student 5's viewer).
 */
function compileReportCard(studentId, term) {
    const student = getStudentById(studentId);
    const gradeList = readStoredList(PORTAL_KEYS.grades);
    const allStudents = readStudents();
    const classmates = allStudents.filter(function (other) {
        return other.className === student.className;
    });

    /* every subject taught at this student's grade level */
    const offeredSubjects = readStoredList(PORTAL_KEYS.subjects).filter(function (subject) {
        return subject.gradeLevels.indexOf(student.gradeLevel) !== -1;
    });

    const subjectRows = [];
    const missingSubjects = [];

    offeredSubjects.forEach(function (subject) {
        const record = findGradeRecord(gradeList, studentId, subject.code, term);
        if (!record) {
            missingSubjects.push(subject.name);
            return;
        }

        /* class average in this subject, for comparison */
        const classTotals = classmates
            .map(function (classmate) {
                return findGradeRecord(gradeList, classmate.id, subject.code, term);
            })
            .filter(Boolean)
            .map(function (classmateRecord) {
                return classmateRecord.total;
            });

        const band = getGradeBand(record.total);
        subjectRows.push({
            subjectName: subject.name,
            coursework: record.coursework,
            exam: record.exam,
            total: record.total,
            letter: band.letter,
            points: band.points,
            remark: band.remark,
            classAverage: calculateAverage(classTotals)
        });
    });

    /* overall figures */
    const totals = subjectRows.map(function (row) { return row.total; });
    const overallAverage = calculateAverage(totals);
    const gpa = calculateAverage(subjectRows.map(function (row) { return row.points; }));
    const passedCount = totals.filter(function (total) { return total >= PASS_MARK; }).length;

    /* best and weakest subject (sorted copy, highest total first) */
    const sortedRows = subjectRows.slice().sort(function (a, b) { return b.total - a.total; });

    /* class position: rank classmates by their term average */
    const rankedAverages = classmates
        .map(function (classmate) {
            return { id: classmate.id, average: getTermAverage(gradeList, classmate.id, term) };
        })
        .filter(function (entry) { return entry.average !== null; })
        .sort(function (a, b) { return b.average - a.average; });

    let classPosition = null;
    if (overallAverage !== null) {
        /* students with the same average share a position */
        classPosition = rankedAverages.filter(function (entry) {
            return entry.average > overallAverage;
        }).length + 1;
    }

    return {
        student: student,
        term: term,
        subjectRows: subjectRows,
        missingSubjects: missingSubjects,
        overallAverage: overallAverage,
        overallBand: overallAverage === null ? null : getGradeBand(overallAverage),
        gpa: gpa,
        passedCount: passedCount,
        bestSubject: sortedRows.length ? sortedRows[0] : null,
        weakestSubject: sortedRows.length > 1 ? sortedRows[sortedRows.length - 1] : null,
        classPosition: classPosition,
        classSize: rankedAverages.length
    };
}

function getSavedComment(studentId, term) {
    const commentRecord = readStoredList(PORTAL_KEYS.reportComments).find(function (record) {
        return record.studentId === studentId && record.term === term;
    });
    return commentRecord ? commentRecord.comment : "";
}

/* Turns a number like 1 into "1st", 2 into "2nd", etc. */
function toOrdinal(number) {
    const lastTwo = number % 100;
    if (lastTwo >= 11 && lastTwo <= 13) {
        return number + "th";
    }
    const suffixes = { 1: "st", 2: "nd", 3: "rd" };
    return number + (suffixes[number % 10] || "th");
}

/* Draws the compiled report card on the page */
function renderReportCard(report) {
    const student = report.student;

    let subjectRowsHtml = "";
    report.subjectRows.forEach(function (row) {
        subjectRowsHtml +=
            "<tr>" +
            '<td data-label="Subject">' + escapeHtml(row.subjectName) + "</td>" +
            '<td data-label="Coursework /40">' + formatNumber(row.coursework) + "</td>" +
            '<td data-label="Exam /60">' + formatNumber(row.exam) + "</td>" +
            '<td data-label="Total /100"><strong>' + formatNumber(row.total) + "</strong></td>" +
            '<td data-label="Grade"><span class="grade-badge grade-' + row.letter + '">' + row.letter + "</span></td>" +
            '<td data-label="Class avg.">' + formatNumber(row.classAverage) + "</td>" +
            '<td data-label="Remark">' + row.remark + "</td>" +
            "</tr>";
    });
    if (report.subjectRows.length === 0) {
        subjectRowsHtml = '<tr><td colspan="7" class="empty-cell">No grades recorded for this term yet.</td></tr>';
    }

    const missingHtml = report.missingSubjects.length
        ? '<p class="missing-note">Not yet graded: ' + escapeHtml(report.missingSubjects.join(", ")) + "</p>"
        : "";

    reportCardElement.innerHTML =
        '<header class="report-header">' +
            '<div><p class="report-school">' + SCHOOL_NAME + "</p>" +
            "<h3>Student Report Card - " + report.term + "</h3></div>" +
            '<button type="button" id="printReportButton" class="button button-secondary no-print">Print</button>' +
        "</header>" +

        '<dl class="report-details">' +
            "<div><dt>Student</dt><dd>" + escapeHtml(getFullName(student)) + "</dd></div>" +
            "<div><dt>ID</dt><dd>" + escapeHtml(student.id) + "</dd></div>" +
            "<div><dt>Class</dt><dd>" + escapeHtml(student.className) + "</dd></div>" +
            "<div><dt>Cohort</dt><dd>" + escapeHtml(student.cohort || "-") + "</dd></div>" +
        "</dl>" +

        '<div class="table-wrapper"><table class="data-table report-table">' +
            "<thead><tr>" +
                '<th scope="col">Subject</th><th scope="col">Coursework /40</th>' +
                '<th scope="col">Exam /60</th><th scope="col">Total /100</th>' +
                '<th scope="col">Grade</th><th scope="col">Class avg.</th><th scope="col">Remark</th>' +
            "</tr></thead>" +
            "<tbody>" + subjectRowsHtml + "</tbody>" +
        "</table></div>" +
        missingHtml +

        '<dl class="summary-grid report-summary">' +
            "<div><dt>Overall average</dt><dd>" + formatNumber(report.overallAverage) +
                (report.overallBand ? " (" + report.overallBand.letter + ")" : "") + "</dd></div>" +
            "<div><dt>GPA (4.0 scale)</dt><dd>" + (report.gpa === null ? "-" : report.gpa.toFixed(2)) + "</dd></div>" +
            "<div><dt>Class position</dt><dd>" +
                (report.classPosition ? toOrdinal(report.classPosition) + " of " + report.classSize : "-") + "</dd></div>" +
            "<div><dt>Subjects passed</dt><dd>" + report.passedCount + " / " + report.subjectRows.length + "</dd></div>" +
            "<div><dt>Strongest subject</dt><dd>" + (report.bestSubject ? escapeHtml(report.bestSubject.subjectName) : "-") + "</dd></div>" +
            "<div><dt>Needs most work</dt><dd>" + (report.weakestSubject ? escapeHtml(report.weakestSubject.subjectName) : "-") + "</dd></div>" +
        "</dl>" +

        '<p class="overall-remark">Overall: <strong>' +
            (report.overallBand ? report.overallBand.remark : "No grades yet") + "</strong></p>" +

        '<div class="form-field comment-field">' +
            '<label for="teacherCommentInput">Teacher\'s comment</label>' +
            '<textarea id="teacherCommentInput" rows="3" maxlength="300"></textarea>' +
            '<div class="comment-actions no-print">' +
                '<button type="button" id="saveCommentButton" class="button button-secondary">Save comment</button>' +
                '<span id="commentMessage" class="form-message" role="status"></span>' +
            "</div>" +
        "</div>" +
        '<p class="report-signature">Teacher: ' + escapeHtml(panelState.teacher.fullName) + "</p>";

    /* fill the comment with .value so typed text is never treated as HTML */
    document.getElementById("teacherCommentInput").value = getSavedComment(student.id, report.term);
    document.getElementById("printReportButton").addEventListener("click", function () {
        window.print();
    });
    document.getElementById("saveCommentButton").addEventListener("click", function () {
        saveReportComment(student.id, report.term);
    });

    reportCardElement.hidden = false;
}

function saveReportComment(studentId, term) {
    const commentText = document.getElementById("teacherCommentInput").value.trim();
    const commentList = readStoredList(PORTAL_KEYS.reportComments);
    const existingIndex = commentList.findIndex(function (record) {
        return record.studentId === studentId && record.term === term;
    });
    const commentRecord = {
        studentId: studentId,
        term: term,
        comment: commentText,
        enteredBy: panelState.teacher.username,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex === -1) {
        commentList.push(commentRecord);
    } else {
        commentList[existingIndex] = commentRecord;
    }
    writeStoredList(PORTAL_KEYS.reportComments, commentList);

    const commentMessage = document.getElementById("commentMessage");
    commentMessage.textContent = "Comment saved.";
    commentMessage.className = "form-message message-success";
}

function generateReportCard() {
    if (reportStudentSelect.value === "") {
        reportCardElement.hidden = true;
        return;
    }
    renderReportCard(compileReportCard(reportStudentSelect.value, panelState.selectedTerm));
}

/* ------------------------------------------------------------
 * 8. START-UP
 * ---------------------------------------------------------- */
function startTeacherPanel() {
    document.getElementById("demoLoginButton").addEventListener("click", signInAsDemoTeacher);
    document.getElementById("logoutButton").addEventListener("click", logOut);

    panelState.teacher = getSignedInTeacher();
    if (!panelState.teacher) {
        document.getElementById("accessNotice").hidden = false;
        document.getElementById("logoutButton").hidden = true;
        return;
    }

    /* show the panel and greet the teacher */
    document.getElementById("teacherPanel").hidden = false;
    document.getElementById("teacherNameText").textContent = panelState.teacher.fullName;
    document.getElementById("teacherSubjectsText").textContent = panelState.teacher.subjects
        .map(getSubjectByCode)
        .filter(Boolean)
        .map(function (subject) { return subject.name; })
        .join(", ");

    fillSubjectDropdown();

    guardFilterChange(subjectSelect, handleSubjectChange);
    guardFilterChange(gradeLevelSelect, handleGradeLevelChange);
    guardFilterChange(classSelect, handleClassChange);
    guardFilterChange(termSelect, handleTermChange);
    document.getElementById("filterForm").addEventListener("submit", handleFilterSubmit);

    gradeTableBody.addEventListener("input", handleScoreInput);
    gradeTableBody.addEventListener("keydown", handleScoreKeydown);
    document.getElementById("saveGradesButton").addEventListener("click", saveAllGrades);
    document.getElementById("resetGradesButton").addEventListener("click", undoUnsavedChanges);
    document.getElementById("applyBatchButton").addEventListener("click", applyBatchScores);

    document.getElementById("reportForm").addEventListener("submit", function (event) {
        event.preventDefault();
        generateReportCard();
    });

    /* warn before closing the tab with unsaved grades */
    window.addEventListener("beforeunload", function (event) {
        if (panelState.hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
}

startTeacherPanel();
