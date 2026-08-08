import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDLgyp6_O-T9oHNUZM-mOj-lpKpE6rJ04E",
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

            currentUserData = { uid, fullName, nickname, location, birthDate, email, coupleSpaceId: null };
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
document.getElementById('btnCreateSpace')?.addEventListener('click', async () => {
    const code = "LOVE-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    await setDoc(doc(db, "couple_spaces", code), {
        spaceId: code,
        partner1_uid: currentUserData.uid,
        partner1_name: currentUserData.nickname,
        partner2_uid: null,
        partner2_name: null,
        status: "waiting",
        startDate: null,
        mochi: { hunger: 80, hygiene: 70, love: 90 },
        createdAt: new Date()
    });

    await updateDoc(doc(db, "users", currentUserData.uid), { coupleSpaceId: code });
    document.getElementById('generatedCodeDisplay').innerText = code;
    coupleCard.classList.add('hidden');
    codeDisplayCard.classList.remove('hidden');

    listenForPartner(code);
});

// JOIN COUPLE SPACE
document.getElementById('btnJoinSpace')?.addEventListener('click', async () => {
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

        await updateDoc(doc(db, "users", currentUserData.uid), { coupleSpaceId: inputCode });
        const data = spaceSnap.data();
        showSuccessScreen(data.partner1_name, currentUserData.nickname);
    } else {
        alert("Kode Space tidak ditemukan. Coba cek lagi ya!");
    }
});

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
document.getElementById('btnCopyCode')?.addEventListener('click', () => {
    const code = document.getElementById('generatedCodeDisplay').innerText;
    navigator.clipboard.writeText(code);
    alert("Kode berhasil disalin! Kirimkan ke Rama ya 🤍");
});

// ENTER HOME DASHBOARD
document.getElementById('btnEnterApp')?.addEventListener('click', () => {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) authContainer.classList.add('hidden');
    
    const homeScreen = document.getElementById('homeScreen');
    if (homeScreen) homeScreen.classList.remove('hidden');

    if (currentUserData) {
        document.getElementById('homeUserGreeting').innerText = currentUserData.nickname + " ❤️";
        updateTimeGreeting();
        updateUserPresence(currentUserData.coupleSpaceId);
        listenRealtimeNotifications(currentUserData.coupleSpaceId);
        listenStartDate(currentUserData.coupleSpaceId);
        listenMochiStats(currentUserData.coupleSpaceId);
    }
});

function updateTimeGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('timeGreeting');
    if (!greetingEl) return;

    if (hour >= 5 && hour < 12) {
        greetingEl.innerText = "Good Morning! ☀️";
    } else if (hour >= 12 && hour < 17) {
        greetingEl.innerText = "Good Afternoon! 🌤️";
    } else if (hour >= 17 && hour < 21) {
        greetingEl.innerText = "Good Evening! 🌙";
    } else {
        greetingEl.innerText = "Good Night! ✨";
    }
}

async function updateUserPresence(spaceId) {
    if (!spaceId) return;

    const userRef = doc(db, "users", currentUserData.uid);
    await updateDoc(userRef, { lastActive: serverTimestamp() });

    onSnapshot(doc(db, "couple_spaces", spaceId), async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        const partnerUid = data.partner1_uid === currentUserData.uid ? data.partner2_uid : data.partner1_uid;
        const partnerName = data.partner1_uid === currentUserData.uid ? data.partner2_name : data.partner1_name;

        if (!partnerUid) {
            document.getElementById('partnerActiveStatus').innerText = `⏳ Menunggu ${partnerName || 'Rama'}...`;
            return;
        }

        const partnerSnap = await getDoc(doc(db, "users", partnerUid));
        if (partnerSnap.exists() && partnerSnap.data().lastActive) {
            const lastActive = partnerSnap.data().lastActive.toDate();
            const now = new Date();
            const diffMinutes = Math.floor((now - lastActive) / 60000);

            const statusEl = document.getElementById('partnerActiveStatus');
            if (statusEl) {
                if (diffMinutes < 3) {
                    statusEl.innerText = `🟢 ${partnerName} Aktif sekarang`;
                } else if (diffMinutes < 60) {
                    statusEl.innerText = `🟡 ${partnerName} Aktif ${diffMinutes} mnt lalu`;
                } else {
                    const diffHours = Math.floor(diffMinutes / 60);
                    statusEl.innerText = `⚪ ${partnerName} Aktif ${diffHours} jam lalu`;
                }
            }
        }
    });
}

// START DATE COUNTER
const startDateInput = document.getElementById('startDateInput');

function listenStartDate(spaceId) {
    if (!spaceId) return;
    onSnapshot(doc(db, "couple_spaces", spaceId), (docSnap) => {
        if (docSnap.exists() && docSnap.data().startDate) {
            const savedDate = docSnap.data().startDate;
            startDateInput.value = savedDate;
            calculateDaysTogether(savedDate);
        }
    });
}

startDateInput?.addEventListener('change', async (e) => {
    const chosenDate = e.target.value;
    if (currentUserData && currentUserData.coupleSpaceId) {
        await updateDoc(doc(db, "couple_spaces", currentUserData.coupleSpaceId), { startDate: chosenDate });
        calculateDaysTogether(chosenDate);
    }
});

function calculateDaysTogether(startDateStr) {
    const start = new Date(startDateStr);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('daysTogetherCount').innerText = isNaN(diffDays) ? 0 : diffDays;
}

// MOCHI ROOM FULL-SCREEN SWITCHING
document.getElementById('btnPetModal')?.addEventListener('click', () => {
    document.getElementById('homeScreen')?.classList.add('hidden');
    document.getElementById('petScreen')?.classList.remove('hidden');
});

document.getElementById('btnBackFromPet')?.addEventListener('click', () => {
    document.getElementById('petScreen')?.classList.add('hidden');
    document.getElementById('homeScreen')?.classList.remove('hidden');
});

// REALTIME MOCHI GAME & DRAG DROP LOGIC
let activeToolType = null;

function listenMochiStats(spaceId) {
    if (!spaceId) return;
    onSnapshot(doc(db, "couple_spaces", spaceId), (docSnap) => {
        if (docSnap.exists()) {
            const mochi = docSnap.data().mochi || { hunger: 80, hygiene: 70, love: 90 };
            updateMochiUI(mochi);
        }
    });
}

function updateMochiUI(mochi) {
    document.getElementById('barHunger').style.width = mochi.hunger + '%';
    document.getElementById('txtHunger').innerText = mochi.hunger + '%';

    document.getElementById('barHygiene').style.width = mochi.hygiene + '%';
    document.getElementById('txtHygiene').innerText = mochi.hygiene + '%';

    document.getElementById('barLove').style.width = mochi.love + '%';
    document.getElementById('txtLove').innerText = mochi.love + '%';

    const bubble = document.getElementById('mochiBubble');
    if (mochi.hunger < 40) {
        bubble.innerText = '"Mochi lapar banget... minta makan dong! 🐟"';
    } else if (mochi.love > 85) {
        bubble.innerText = '"Mochi seneng banget disayang kalian! 💖"';
    } else {
        bubble.innerText = '"Meow! Rawat Mochi berdua ya! 🤍"';
    }
}

// PANGGIL ALAT DRAG & DROP
const draggableItem = document.getElementById('draggableItem');
const btnFeedTool = document.getElementById('btnFeedTool');
const btnBathTool = document.getElementById('btnBathTool');

btnFeedTool?.addEventListener('click', () => {
    activeToolType = 'feed';
    draggableItem.innerText = '🐟';
    draggableItem.classList.remove('hidden');
    draggableItem.style.top = '60px';
    draggableItem.style.left = '40px';
    document.getElementById('mochiBubble').innerText = '"Geser ikannya ke mulut Mochi yuk! 🐟"';
});

btnBathTool?.addEventListener('click', () => {
    activeToolType = 'bath';
    draggableItem.innerText = '🧽';
    draggableItem.classList.remove('hidden');
    draggableItem.style.top = '60px';
    draggableItem.style.left = '40px';
    document.getElementById('mochiBubble').innerText = '"Gosokkan sponsnya ke badan Mochi! 🧼"';
});

let isDragging = false;

draggableItem?.addEventListener('pointerdown', (e) => {
    isDragging = true;
    draggableItem.setPointerCapture(e.pointerId);
});

draggableItem?.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const playArea = document.getElementById('mochiPlayArea').getBoundingClientRect();
    let x = e.clientX - playArea.left - 20;
    let y = e.clientY - playArea.top - 20;

    draggableItem.style.left = `${x}px`;
    draggableItem.style.top = `${y}px`;

    const mochiRect = document.getElementById('mochiCharacter').getBoundingClientRect();
    const itemRect = draggableItem.getBoundingClientRect();

    if (
        itemRect.left < mochiRect.right &&
        itemRect.right > mochiRect.left &&
        itemRect.top < mochiRect.bottom &&
        itemRect.bottom > mochiRect.top
    ) {
        isDragging = false;
        draggableItem.classList.add('hidden');

        if (activeToolType === 'feed') {
            document.getElementById('mochiMouth').innerText = 'O';
            setTimeout(() => document.getElementById('mochiMouth').innerText = 'ω', 1000);
            updateMochiAction("feed", 25);
        } else if (activeToolType === 'bath') {
            document.getElementById('mochiBubble').innerText = '"Mochi wangi & segar! 🫧"';
            updateMochiAction("bath", 30);
        }
    }
});

draggableItem?.addEventListener('pointerup', () => { isDragging = false; });

// SENTUHAN KETUKAN LANGSUNG (PUK-PUK)
document.getElementById('mochiCharacter')?.addEventListener('click', () => {
    document.getElementById('mochiMouth').innerText = 'u';
    document.getElementById('mochiBubble').innerText = '"Purrr... Mochi sayang kalian! 💕"';
    setTimeout(() => document.getElementById('mochiMouth').innerText = 'ω', 1200);
    updateMochiAction("play", 15);
});

document.getElementById('btnPlayPet')?.addEventListener('click', () => {
    document.getElementById('mochiBubble').innerText = '"Sentuh/ketuk Mochi langsung untuk puk-puk! 💕"';
});

async function updateMochiAction(actionType, increaseAmount) {
    if (!currentUserData || !currentUserData.coupleSpaceId) return;

    const spaceRef = doc(db, "couple_spaces", currentUserData.coupleSpaceId);
    const docSnap = await getDoc(spaceRef);
    if (!docSnap.exists()) return;

    let mochi = docSnap.data().mochi || { hunger: 80, hygiene: 70, love: 90 };
    let msg = "";

    if (actionType === "feed") {
        mochi.hunger = Math.min(100, mochi.hunger + increaseAmount);
        msg = "menyuapkan ikan lezat ke mulut Mochi 🐟";
    } else if (actionType === "bath") {
        mochi.hygiene = Math.min(100, mochi.hygiene + increaseAmount);
        msg = "menggosokkan spons mandikan Mochi 🧼";
    } else if (actionType === "play") {
        mochi.love = Math.min(100, mochi.love + increaseAmount);
        msg = "mengelus & mempuk-puk Mochi 💖";
    }

    await updateDoc(spaceRef, { mochi });

    await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
        type: "mochi",
        senderUid: currentUserData.uid,
        senderName: currentUserData.nickname,
        message: msg,
        timestamp: new Date()
    });
}

// REALTIME NOTIFICATIONS & ACTIVITY LOG
function listenRealtimeNotifications(spaceId) {
    if (!spaceId) return;

    const notifRef = collection(db, "couple_spaces", spaceId, "notifications");
    const q = query(notifRef, orderBy("timestamp", "desc"), limit(15));

    let isInitialLoad = true;

    onSnapshot(q, (snapshot) => {
        const logContainer = document.getElementById('activityLogList');
        if (logContainer) logContainer.innerHTML = '';

        if (snapshot.empty) {
            logContainer.innerHTML = '<p class="empty-act">Belum ada aktivitas hari ini. Kirim Express Love yuk!</p>';
            return;
        }

        snapshot.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            const item = document.createElement('div');
            item.className = 'act-item';
            item.innerHTML = `<span class="act-user">${data.senderName}</span> ${data.message} <span class="act-time">${timeStr}</span>`;
            logContainer.appendChild(item);

            if (index === 0 && !isInitialLoad && data.senderUid !== currentUserData.uid) {
                showNotifBanner(data.type, data.senderName, data.message);
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
        });

        isInitialLoad = false;
    });
}

function showNotifBanner(type, sender, message) {
    const banner = document.getElementById('realtimeNotif');
    const iconEl = document.getElementById('notifIcon');
    const titleEl = document.getElementById('notifTitle');
    const msgEl = document.getElementById('notifMessage');

    if (iconEl && titleEl && msgEl && banner) {
        iconEl.innerText = type === "express" ? "💖" : (type === "mochi" ? "🐱" : "😊");
        titleEl.innerText = type === "express" ? "Express Love Masuk! 💖" : (type === "mochi" ? "Mochi Dirawat! 🐱" : "Mood Pasangan Update!");
        msgEl.innerText = `${sender}: ${message}`;

        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 5000);
    }
}

document.getElementById('closeNotifBtn')?.addEventListener('click', () => {
    document.getElementById('realtimeNotif')?.classList.add('hidden');
});

// MODAL CONTROLS POPUP
const hugModal = document.getElementById('hugModal');
const moodModal = document.getElementById('moodModal');

document.getElementById('btnHugModal')?.addEventListener('click', () => hugModal?.classList.remove('hidden'));
document.getElementById('closeHugModal')?.addEventListener('click', () => hugModal?.classList.add('hidden'));

document.getElementById('btnMoodModal')?.addEventListener('click', () => moodModal?.classList.remove('hidden'));
document.getElementById('closeMoodModal')?.addEventListener('click', () => moodModal?.classList.add('hidden'));

// SEND EXPRESS LOVE ACTION
document.querySelectorAll('.hug-opt-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const loveType = btn.getAttribute('data-type');
        hugModal?.classList.add('hidden');

        if (currentUserData && currentUserData.coupleSpaceId) {
            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                type: "express",
                senderUid: currentUserData.uid,
                senderName: currentUserData.nickname,
                message: `mengirimkan ${loveType}`,
                timestamp: new Date()
            });

            updateMochiAction("play", 15);
            alert(`Berhasil ngirim ${loveType} ke pasangan! 💖`);
        }
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

document.getElementById('btnSaveMood')?.addEventListener('click', async () => {
    const note = document.getElementById('moodNoteInput').value;
    moodModal?.classList.add('hidden');

    if (currentUserData && currentUserData.coupleSpaceId) {
        const msgText = note ? `Mood: ${selectedMood} ("${note}")` : `Mood: ${selectedMood}`;
        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
            type: "mood",
            senderUid: currentUserData.uid,
            senderName: currentUserData.nickname,
            message: msgText,
            timestamp: new Date()
        });
        alert(`Mood hari ini (${selectedMood}) tersimpan! 🤍`);
    }
});