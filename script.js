import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLgyp6_0-T9oHNUZM-mOj-lpKpE6rJ04E",
    authDomain: "our-little-universe-0209.firebaseapp.com",
    projectId: "our-little-universe-0209",
    storageBucket: "our-little-universe-0209.firebasestorage.app",
    messagingSenderId: "924945430782",
    appId: "1:924945430782:web:9dcab9bd35b5595c480daf",
    measurementId: "G-Y7FSMN5NJP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserData = null;

// DOM Elements
const authCard = document.getElementById('authCard');
const coupleCard = document.getElementById('coupleCard');
const codeDisplayCard = document.getElementById('codeDisplayCard');
const successCard = document.getElementById('successCard');

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

// Tab Toggle
if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

// REGISTER USER
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value;
        const nickname = document.getElementById('regNickname').value;
        const location = document.getElementById('regLocation').value;
        const birthDate = document.getElementById('regBirthDate').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            currentUserData = {
                uid,
                fullName,
                nickname,
                location,
                birthDate,
                email,
                coupleSpaceId: null
            };

            await setDoc(doc(db, "users", uid), currentUserData);

            authCard.classList.add('hidden');
            coupleCard.classList.remove('hidden');
        } catch (error) {
            alert("Gagal Daftar: " + error.message);
        }
    });
}

// LOGIN USER
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const userDoc = await getDoc(doc(db, "users", uid));
            currentUserData = userDoc.data();

            authCard.classList.add('hidden');

            if (currentUserData.coupleSpaceId) {
                checkConnectionStatus(currentUserData.coupleSpaceId);
            } else {
                coupleCard.classList.remove('hidden');
            }
        } catch (error) {
            alert("Gagal Login: " + error.message);
        }
    });
}

// CREATE COUPLE SPACE
const btnCreateSpace = document.getElementById('btnCreateSpace');
if (btnCreateSpace) {
    btnCreateSpace.addEventListener('click', async () => {
        const code = "LOVE-" + Math.random().toString(36).substring(2, 7).toUpperCase();
        
        await setDoc(doc(db, "couple_spaces", code), {
            spaceId: code,
            partner1_uid: currentUserData.uid,
            partner1_name: currentUserData.nickname,
            partner2_uid: null,
            partner2_name: null,
            status: "waiting",
            createdAt: new Date()
        });

        await updateDoc(doc(db, "users", currentUserData.uid), {
            coupleSpaceId: code
        });

        document.getElementById('generatedCodeDisplay').innerText = code;
        coupleCard.classList.add('hidden');
        codeDisplayCard.classList.remove('hidden');

        listenForPartner(code);
    });
}

// JOIN COUPLE SPACE
const btnJoinSpace = document.getElementById('btnJoinSpace');
if (btnJoinSpace) {
    btnJoinSpace.addEventListener('click', async () => {
        const inputCode = document.getElementById('joinCodeInput').value.trim().toUpperCase();
        if (!inputCode) return alert("Masukkan kodenya dulu ya!");

        const spaceRef = doc(db, "couple_spaces", inputCode);
        const spaceSnap = await getDoc(spaceRef);

        if (spaceSnap.exists()) {
            await updateDoc(spaceRef, {
                partner2_uid: currentUserData.uid,
                partner2_name: currentUserData.nickname,
                status: "connected"
            });

            await updateDoc(doc(db, "users", currentUserData.uid), {
                coupleSpaceId: inputCode
            });

            const data = spaceSnap.data();
            showSuccessScreen(data.partner1_name, currentUserData.nickname);
        } else {
            alert("Kode Space tidak ditemukan. Coba cek lagi ya!");
        }
    });
}

function listenForPartner(spaceId) {
    onSnapshot(doc(db, "couple_spaces", spaceId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === "connected") {
                showSuccessScreen(data.partner1_name, data.partner2_name);
            }
        }
    });
}

function checkConnectionStatus(spaceId) {
    getDoc(doc(db, "couple_spaces", spaceId)).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === "connected") {
                showSuccessScreen(data.partner1_name, data.partner2_name);
            } else {
                document.getElementById('generatedCodeDisplay').innerText = spaceId;
                codeDisplayCard.classList.remove('hidden');
                listenForPartner(spaceId);
            }
        }
    });
}

function showSuccessScreen(p1, p2) {
    document.getElementById('p1Name').innerText = p1;
    document.getElementById('p2Name').innerText = p2;

    coupleCard.classList.add('hidden');
    codeDisplayCard.classList.add('hidden');
    successCard.classList.remove('hidden');
}

// COPY CODE BUTTON
const btnCopyCode = document.getElementById('btnCopyCode');
if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
        const code = document.getElementById('generatedCodeDisplay').innerText;
        navigator.clipboard.writeText(code);
        alert("Kode berhasil disalin! Kirimkan ke Rama ya 🤍");
    });
}

// ENTER HOME DASHBOARD
const btnEnterApp = document.getElementById('btnEnterApp');
if (btnEnterApp) {
    btnEnterApp.addEventListener('click', () => {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) authContainer.classList.add('hidden');
        
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) homeScreen.classList.remove('hidden');

        if (currentUserData) {
            const greetingEl = document.getElementById('homeUserGreeting');
            if (greetingEl) greetingEl.innerText = currentUserData.nickname + " ❤️";
        }
    });
}

// MODAL CONTROLS
const hugModal = document.getElementById('hugModal');
const moodModal = document.getElementById('moodModal');

document.getElementById('btnHugModal')?.addEventListener('click', () => hugModal?.classList.remove('hidden'));
document.getElementById('closeHugModal')?.addEventListener('click', () => hugModal?.classList.add('hidden'));

document.getElementById('btnMoodModal')?.addEventListener('click', () => moodModal?.classList.remove('hidden'));
document.getElementById('closeMoodModal')?.addEventListener('click', () => moodModal?.classList.add('hidden'));

// SEND HUG ACTION
document.querySelectorAll('.hug-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const hugType = btn.getAttribute('data-type');
        alert(`Berhasil ngirim ${hugType} ke Rama! 🤍`);
        hugModal?.classList.add('hidden');
    });
});

// SELECT MOOD ACTION
let selectedMood = "😊 Bahagia";
document.querySelectorAll('.mood-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMood = btn.getAttribute('data-mood');
    });
});

document.getElementById('btnSaveMood')?.addEventListener('click', () => {
    alert(`Mood hari ini (${selectedMood}) tersimpan! 🤍`);
    moodModal?.classList.add('hidden');
});