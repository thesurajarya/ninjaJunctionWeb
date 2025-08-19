/* dashboard.js
   Dynamic dashboard for Firebase projects.
   Features:
   - Displays user's display name
   - Shows total, owned, and contributor project counts
   - Realtime project list updates
   - Project filtering
   - Add new project modal
   - Logout with Firebase Auth
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    onSnapshot,
    addDoc,
    serverTimestamp,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* -------------------------
   Firebase config
------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyC9uZJReWXp0qVPN-R62a-LOpzjt0qzWJk",
    authDomain: "nj-webdb.firebaseapp.com",
    projectId: "nj-webdb",
    storageBucket: "nj-webdb.firebasestorage.app",
    messagingSenderId: "860317113632",
    appId: "1:860317113632:web:e94e778890aec599940b45",
    measurementId: "G-GPQYS3521C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- DOM Elements ---------- */
const userNameEl = document.getElementById("user-name");
const totalProjectsEl = document.getElementById("total-projects");
const ownedProjectsEl = document.getElementById("owned-projects");
const contribProjectsEl = document.getElementById("contrib-projects");

const filterSelect = document.getElementById("filter-projects");
const projectsContainer = document.getElementById("projects-container");

const newProjectBtn = document.getElementById("new-project-btn");
const projectModal = document.getElementById("project-modal");
const closeModalBtn = document.getElementById("close-modal");
const addProjectForm = document.getElementById("add-project-form");

const logoutBtn = document.getElementById("logout-btn");

/* ---------- State ---------- */
let lastDocs = [];
let currentUserUid = null;
let unsubscribeProjects = null;

/* ---------- Auth listener ---------- */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        let displayName = user.displayName;

        // If no displayName, fetch from Firestore
        if (!displayName) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    displayName = userDoc.data().name;
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }

        // If still no name, fallback to email
        welcomeText.textContent = `Welcome, ${displayName || user.email}`;
    } else {
        // Redirect if not logged in
        window.location.href = "login.html";
    }
});

/* ---------- Logout ---------- */
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            // Redirect handled by onAuthStateChanged
        } catch (err) {
            console.error("Sign out failed:", err);
            alert("Sign out failed: " + (err.message || err));
        }
    });
}

/* ---------- Start listening to projects ---------- */
function startProjectsListener() {
    if (unsubscribeProjects) unsubscribeProjects();

    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    unsubscribeProjects = onSnapshot(q, (snapshot) => {
        lastDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        updateStatsAndUI();
    }, (err) => {
        console.error("Realtime listener error:", err);
        alert("Error loading projects: " + err.message);
    });
}

/* ---------- Update stats and render ---------- */
function updateStatsAndUI() {
    const total = lastDocs.length;

    const owned = lastDocs.filter(p =>
        p.ownerId === currentUserUid ||
        p.owner === currentUserUid ||
        p.ownerUid === currentUserUid
    ).length;

    const contrib = lastDocs.filter(p => {
        const isOwner = p.ownerId === currentUserUid ||
            p.owner === currentUserUid ||
            p.ownerUid === currentUserUid;
        if (isOwner) return false;
        if (Array.isArray(p.contributors)) return p.contributors.includes(currentUserUid);
        if (typeof p.contributors === "string") {
            return p.contributors.split(",").map(s => s.trim()).includes(currentUserUid);
        }
        return false;
    }).length;

    if (totalProjectsEl) totalProjectsEl.textContent = total;
    if (ownedProjectsEl) ownedProjectsEl.textContent = owned;
    if (contribProjectsEl) contribProjectsEl.textContent = contrib;

    renderProjects(lastDocs, filterSelect?.value || "all");
}

/* ---------- Render projects ---------- */
function renderProjects(docs, filter) {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = "";

    let filtered = docs;
    if (filter === "Owner") {
        filtered = docs.filter(p =>
            p.ownerId === currentUserUid ||
            p.owner === currentUserUid ||
            p.ownerUid === currentUserUid
        );
    } else if (filter === "Contributor") {
        filtered = docs.filter(p => {
            if (Array.isArray(p.contributors)) return p.contributors.includes(currentUserUid);
            if (typeof p.contributors === "string") {
                return p.contributors.split(",").map(s => s.trim()).includes(currentUserUid);
            }
            return false;
        });
    }

    if (filtered.length === 0) {
        projectsContainer.innerHTML = `<p class="text-gray-500">No projects yet for this filter.</p>`;
        return;
    }

    filtered.forEach((p) => {
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-lg shadow";

        let created = "";
        if (p.createdAt) {
            try {
                created = p.createdAt.toDate
                    ? new Date(p.createdAt.toDate()).toLocaleString()
                    : new Date(p.createdAt).toLocaleString();
            } catch { /* ignore */ }
        }

        const roleBadge = (p.ownerId === currentUserUid || p.owner === currentUserUid)
            ? `<span class="px-2 py-1 bg-[var(--primary)] text-white text-xs rounded">Owner</span>`
            : `<span class="px-2 py-1 bg-gray-200 text-black text-xs rounded">Contributor</span>`;

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="text-lg font-bold">${escapeHtml(p.title || "Untitled")}</h4>
                ${roleBadge}
            </div>
            <p class="text-sm mt-2">${escapeHtml(p.description || "")}</p>
            <div class="mt-3 flex items-center justify-between">
                <a href="${escapeAttr(p.github || "#")}" target="_blank" class="text-blue-600 hover:underline text-sm">View on GitHub</a>
                <span class="text-xs text-gray-500">${escapeHtml(p.tag || "")}</span>
            </div>
            <div class="mt-2 text-xs text-gray-400">Created: ${created}</div>
        `;
        projectsContainer.appendChild(card);
    });
}

/* ---------- UI Events ---------- */
if (filterSelect) {
    filterSelect.addEventListener("change", () => {
        renderProjects(lastDocs, filterSelect.value);
    });
}

if (newProjectBtn) {
    newProjectBtn.addEventListener("click", () => {
        projectModal?.classList.remove("hidden");
    });
}
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        projectModal?.classList.add("hidden");
    });
}
if (projectModal) {
    projectModal.addEventListener("click", (e) => {
        if (e.target === projectModal) projectModal.classList.add("hidden");
    });
}

if (addProjectForm) {
    addProjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("project-title").value.trim();
        const description = document.getElementById("project-description").value.trim();
        const github = document.getElementById("project-github").value.trim();
        const tag = document.getElementById("project-tag").value.trim();

        if (!title || !description || !github || !tag) {
            alert("Please fill all fields.");
            return;
        }

        try {
            await addDoc(collection(db, "projects"), {
                title,
                description,
                github,
                tag,
                ownerId: currentUserUid,
                ownerName: auth.currentUser?.displayName || null,
                contributors: [],
                createdAt: serverTimestamp()
            });
            addProjectForm.reset();
            projectModal?.classList.add("hidden");
        } catch (err) {
            console.error("Add project error:", err);
            alert("Error adding project: " + (err.message || err));
        }
    });
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (s) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[s]));
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
}
