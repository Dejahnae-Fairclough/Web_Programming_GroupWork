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

const FEES_KEY = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.fees)
    ? STORAGE_KEYS.fees
    : "portal_fees";

const ANNUAL_TUITION_JMD = 48000;

/* ------------------------------------------------------------
 * 1. STORAGE & DATA NORMALISATION HELPERS
 * ---------------------------------------------------------- */
function readList(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

/* Matches Student 3 (name, studentClass, status) and Student 4 (firstName, lastName, className) */
function normaliseStudentRecord(record) {
    const fullName = record.name ||
        ((record.firstName || "") + " " + (record.lastName || "")).trim();

    let gradeLevel = Number(record.gradeLevel);
    if (!gradeLevel) {
        const digits = String(record.className || record.studentClass || "").match(/\d+/);
        gradeLevel = digits ? Number(digits[0]) : 0;
    }

    return {
        id: String(record.id),
        fullName: fullName || "(No Name)",
        gradeLevel: gradeLevel,
        className: record.className || record.studentClass || ("Grade " + gradeLevel),
        status: record.status || "Active"
    };
}

function getAllStudents() {
    return readList(PORTAL_KEYS.students).map(normaliseStudentRecord);
}

/* Seeds tuition records once if Student 3/2 hasn't written portal_fees yet */
function ensureFeeRecords() {
    const existing = readList(FEES_KEY);
    const students = getAllStudents();
    let changed = false;

    students.forEach(function (stu, index) {
        const found = existing.some(function (f) { return String(f.studentId) === stu.id; });
        if (!found) {
            /* Deterministic split: Paid, Pending, or Outstanding */
            let paid = ANNUAL_TUITION_JMD;
            if (index % 3 === 1) paid = 25000;
            if (index % 3 === 2) paid = 0;

            existing.push({
                studentId: stu.id,
                totalFee: ANNUAL_TUITION_JMD,
                amountPaid: paid,
                lastUpdated: "2026-10-30"
            });
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem(FEES_KEY, JSON.stringify(existing));
    }
    return existing;
}

function getFeeStatus(totalFee, amountPaid) {
    if (amountPaid >= totalFee) return "Paid";
    if (amountPaid > 0) return "Pending";
    return "Outstanding";
}

function getLetterGrade(total) {
    if (total >= 80) return "A";
    if (total >= 70) return "B";
    if (total >= 60) return "C";
    if (total >= 50) return "D";
    return "F";
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
 * 2. SESSION GUARD (Matches PORTAL_KEYS.currentUser)
 * ---------------------------------------------------------- */
function getSignedInUser() {
    try {
        return JSON.parse(sessionStorage.getItem(PORTAL_KEYS.currentUser));
    } catch (error) {
        return null;
    }
}

function signInAsDemoViewer() {
    sessionStorage.setItem(PORTAL_KEYS.currentUser, JSON.stringify({
        username: "viewer1",
        role: "viewer",
        fullName: "Ms. Sandra Clarke (Bursary Viewer)"
    }));
    window.location.reload();
}

function logOutViewer() {
    sessionStorage.removeItem(PORTAL_KEYS.currentUser);
    window.location.href = "login.html";
}

/* ------------------------------------------------------------
 * 3. RENDER FINANCIAL OVERVIEW & TABLES
 * ---------------------------------------------------------- */
function renderFinancialSummary(fees) {
    let totalBilled = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    fees.forEach(function (fee) {
        const billed = Number(fee.totalFee) || 0;
        const paid = Number(fee.amountPaid) || 0;
        totalBilled += billed;
        totalCollected += paid;

        if (getFeeStatus(billed, paid) === "Paid") {
            paidCount++;
        } else {
            unpaidCount++;
        }
    });

    document.getElementById("finTotalBilled").textContent = "$" + totalBilled.toLocaleString();
    document.getElementById("finTotalCollected").textContent = "$" + totalCollected.toLocaleString();
    document.getElementById("finPaidCount").textContent = paidCount;
    document.getElementById("finUnpaidCount").textContent = unpaidCount;
}

function renderUniversalMatrix() {
    const query = document.getElementById("searchQueryInput").value.trim().toLowerCase();
    const gradeFilter = document.getElementById("gradeFilterSelect").value;
    const statusFilter = document.getElementById("feeStatusSelect").value;

    const students = getAllStudents();
    const grades = readList(PORTAL_KEYS.grades);
    const fees = ensureFeeRecords();

    const tbody = document.getElementById("universalMatrixBody");
    tbody.innerHTML = "";
    let shown = 0;

    students.forEach(function (stu) {
        const stuGrades = grades.filter(function (g) { return String(g.studentId) === stu.id; });
        const fee = fees.find(function (f) { return String(f.studentId) === stu.id; }) || {
            totalFee: ANNUAL_TUITION_JMD,
            amountPaid: 0
        };

        const billed = Number(fee.totalFee) || 0;
        const paid = Number(fee.amountPaid) || 0;
        const balance = Math.max(0, billed - paid);
        const status = getFeeStatus(billed, paid);

        const matchesText = stu.fullName.toLowerCase().includes(query) || stu.id.toLowerCase().includes(query);
        const matchesGrade = gradeFilter === "ALL" || String(stu.gradeLevel) === gradeFilter;
        const matchesStatus = statusFilter === "ALL" || status === statusFilter;

        if (!matchesText || !matchesGrade || !matchesStatus) return;

        shown++;
        let avgText = "-";
        if (stuGrades.length > 0) {
            const sum = stuGrades.reduce(function (acc, g) {
                const total = g.total !== undefined ? Number(g.total) : (Number(g.coursework) + Number(g.exam));
                return acc + total;
            }, 0);
            avgText = (Math.round((sum / stuGrades.length) * 10) / 10) + "%";
        }

        const badgeClass = status === "Paid" ? "fee-paid" : (status === "Pending" ? "fee-pending" : "fee-outstanding");

        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td data-label="ID">' + escapeHtml(stu.id) + "</td>" +
            '<td data-label="Student Name">' + escapeHtml(stu.fullName) + "</td>" +
            '<td data-label="Class">' + escapeHtml(stu.className) + "</td>" +
            '<td data-label="Subjects Graded">' + stuGrades.length + "</td>" +
            '<td data-label="Term 1 Avg"><strong>' + avgText + "</strong></td>" +
            '<td data-label="Tuition Paid">$' + paid.toLocaleString() + "</td>" +
            '<td data-label="Balance Due">$' + balance.toLocaleString() + "</td>" +
            '<td data-label="Fee Status"><span class="fee-badge ' + badgeClass + '">' + status + "</span></td>";
        tbody.appendChild(tr);
    });

    if (shown === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No student records match your current filter.</td></tr>';
    }
    document.getElementById("matchCountText").textContent = shown + " student(s)";
}

function populateSubjectDropdown() {
    const select = document.getElementById("subjectFilterSelect");
    const subjects = readList(PORTAL_KEYS.subjects);

    subjects.forEach(function (sub) {
        const opt = document.createElement("option");
        opt.value = sub.code;
        opt.textContent = sub.name;
        select.appendChild(opt);
    });
}

function renderReadonlyGrades() {
    const selectedCode = document.getElementById("subjectFilterSelect").value;
    const students = getAllStudents();
    const subjects = readList(PORTAL_KEYS.subjects);
    const grades = readList(PORTAL_KEYS.grades);

    const tbody = document.getElementById("readonlyGradesBody");
    tbody.innerHTML = "";
    let count = 0;

    grades.forEach(function (g) {
        if (selectedCode !== "ALL" && g.subjectCode !== selectedCode) return;

        const stu = students.find(function (s) { return s.id === String(g.studentId); });
        const sub = subjects.find(function (s) { return s.code === g.subjectCode; });
        const total = g.total !== undefined ? Number(g.total) : (Number(g.coursework) + Number(g.exam));
        const letter = getLetterGrade(total);

        count++;
        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td data-label="Student ID">' + escapeHtml(g.studentId) + "</td>" +
            '<td data-label="Student Name">' + escapeHtml(stu ? stu.fullName : "Unknown") + "</td>" +
            '<td data-label="Subject">' + escapeHtml(sub ? sub.name : g.subjectCode) + "</td>" +
            '<td data-label="Term">' + escapeHtml(g.term || "Term 1") + "</td>" +
            '<td data-label="Coursework /40">' + g.coursework + "</td>" +
            '<td data-label="Exam /60">' + g.exam + "</td>" +
            '<td data-label="Total /100"><strong>' + total + "</strong></td>" +
            '<td data-label="Grade"><span class="grade-badge grade-' + letter + '">' + letter + "</span></td>";
        tbody.appendChild(tr);
    });

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No grade records found for this subject.</td></tr>';
    }
}

/* ------------------------------------------------------------
 * 4. START-UP
 * ---------------------------------------------------------- */
function startViewerPanel() {
    document.getElementById("demoViewerButton").addEventListener("click", signInAsDemoViewer);
    document.getElementById("logoutButton").addEventListener("click", logOutViewer);

    const user = getSignedInUser();
    if (!user) {
        document.getElementById("accessNotice").hidden = false;
        document.getElementById("logoutButton").hidden = true;
        return;
    }

    document.getElementById("viewerPanel").hidden = false;
    document.getElementById("viewerNameText").textContent = user.fullName || user.username;
    document.getElementById("viewerRoleText").textContent = user.role;

    const fees = ensureFeeRecords();
    renderFinancialSummary(fees);
    populateSubjectDropdown();
    renderUniversalMatrix();
    renderReadonlyGrades();

    document.getElementById("searchQueryInput").addEventListener("input", renderUniversalMatrix);
    document.getElementById("gradeFilterSelect").addEventListener("change", renderUniversalMatrix);
    document.getElementById("feeStatusSelect").addEventListener("change", renderUniversalMatrix);
    document.getElementById("subjectFilterSelect").addEventListener("change", renderReadonlyGrades);

    document.getElementById("resetFiltersButton").addEventListener("click", function () {
        document.getElementById("searchQueryInput").value = "";
        document.getElementById("gradeFilterSelect").value = "ALL";
        document.getElementById("feeStatusSelect").value = "ALL";
        renderUniversalMatrix();
    });

    document.getElementById("printViewerButton").addEventListener("click", function () {
        window.print();
    });
}

startViewerPanel();