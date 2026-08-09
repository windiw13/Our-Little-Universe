import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

document.addEventListener('DOMContentLoaded', () => {

    const authCard = document.getElementById('authCard');
    const coupleCard = document.getElementById('coupleCard');
    const codeDisplayCard = document.getElementById('codeDisplayCard');
    const successCard = document.getElementById('successCard');

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const globalBottomNav = document.getElementById('globalBottomNav');

    // MODAL IMAGE VIEWER
    const imageViewerModal = document.getElementById('imageViewerModal');
    const closeImageViewer = document.getElementById('closeImageViewer');
    const viewerImage = document.getElementById('viewerImage');
    const viewerHeader = document.getElementById('viewerHeader');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerDesc = document.getElementById('viewerDesc');

    if (closeImageViewer) {
        closeImageViewer.addEventListener('click', () => {
            imageViewerModal?.classList.add('hidden');
        });
    }

    function openPhotoViewer(imgSrc, headerText, titleText, descText) {
        if (!imageViewerModal || !viewerImage) return;
        viewerImage.src = imgSrc;
        if (viewerHeader) viewerHeader.innerText = headerText || '';
        if (viewerTitle) viewerTitle.innerText = titleText || '';
        if (viewerDesc) viewerDesc.innerText = descText || '';
        imageViewerModal.classList.remove('hidden');
    }

    // CEK SESI USER
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid)).catch(() => null);
            if (userDoc && userDoc.exists()) {
                currentUserData = userDoc.data();
                updateGreetingName();
                if (currentUserData.coupleSpaceId) {
                    authCard?.classList.add('hidden');
                    checkConnectionStatus(currentUserData.coupleSpaceId);
                }
            } else {
                currentUserData = { uid: user.uid, nickname: "Diw" };
                updateGreetingName();
            }
        } else {
            const speech = document.getElementById('mochiSpeech');
            const eyeL = document.getElementById('eyeLeft');
            const eyeR = document.getElementById('eyeRight');
            const mouth = document.getElementById('catMouth');

            if (speech) speech.innerText = '"Mochi sedih kesepian... Kalian belum menyayangi Mochi hari ini 😿"';
            if (eyeL) eyeL.innerText = '🥺';
            if (eyeR) eyeR.innerText = '🥺';
            if (mouth) mouth.innerText = '︵';
        }
    });

    function updateGreetingName() {
        const userGreeting = document.getElementById('homeUserGreeting');
        if (userGreeting && currentUserData) {
            userGreeting.innerText = (currentUserData.nickname || "Diw") + " ❤️";
        }
    }

    // TAB TOGGLE
    if (tabLogin && tabRegister && loginForm && registerForm) {
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
            const fullName = document.getElementById('regFullName')?.value;
            const nickname = document.getElementById('regNickname')?.value || "Diw";
            const location = document.getElementById('regLocation')?.value;
            const birthDate = document.getElementById('regBirthDate')?.value;
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                currentUserData = { uid, fullName, nickname, location, birthDate, email, coupleSpaceId: null };
                await setDoc(doc(db, "users", uid), currentUserData, { merge: true }).catch(() => {});

                updateGreetingName();
                authCard?.classList.add('hidden');
                coupleCard?.classList.remove('hidden');
            } catch (error) {
                alert("Gagal Daftar: " + error.message);
            }
        });
    }

    // LOGIN USER
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                const userDoc = await getDoc(doc(db, "users", uid)).catch(() => null);
                currentUserData = (userDoc && userDoc.exists()) ? userDoc.data() : { uid, nickname: "Diw" };

                updateGreetingName();
                authCard?.classList.add('hidden');

                if (currentUserData && currentUserData.coupleSpaceId) {
                    checkConnectionStatus(currentUserData.coupleSpaceId);
                } else {
                    coupleCard?.classList.remove('hidden');
                }
            } catch (error) {
                alert("Gagal Login: " + error.message);
            }
        });
    }

    // CREATE SPACE
    document.getElementById('btnCreateSpace')?.addEventListener('click', async () => {
        const userId = auth.currentUser?.uid || currentUserData?.uid || "user-" + Date.now();
        const nickname = currentUserData?.nickname || "Diw";
        const code = "LOVE-" + Math.random().toString(36).substring(2, 7).toUpperCase();

        const codeDisplay = document.getElementById('generatedCodeDisplay');
        if (codeDisplay) codeDisplay.innerText = code;

        coupleCard?.classList.add('hidden');
        codeDisplayCard?.classList.remove('hidden');

        if (!currentUserData) currentUserData = { uid: userId, nickname: nickname, coupleSpaceId: code };
        else currentUserData.coupleSpaceId = code;

        updateGreetingName();

        try {
            await setDoc(doc(db, "couple_spaces", code), {
                spaceId: code,
                partner1_uid: userId,
                partner1_name: nickname,
                partner2_uid: null,
                partner2_name: null,
                status: "waiting",
                startDate: null,
                mochi: { hunger: 40, hygiene: 50, energy: 30 },
                createdAt: new Date()
            });

            await setDoc(doc(db, "users", userId), { uid: userId, nickname: nickname, coupleSpaceId: code }, { merge: true });
            listenForPartner(code);
        } catch (err) {
            console.log("Firestore sync:", err.message);
        }
    });

    // JOIN SPACE
    document.getElementById('btnJoinSpace')?.addEventListener('click', async () => {
        const userId = auth.currentUser?.uid || currentUserData?.uid || "user-" + Date.now();
        const nickname = currentUserData?.nickname || "Rama";
        const inputCode = document.getElementById('joinCodeInput')?.value.trim().toUpperCase();

        if (!inputCode) return alert("Masukkan kodenya dulu ya!");

        const spaceRef = doc(db, "couple_spaces", inputCode);
        
        try {
            const spaceSnap = await getDoc(spaceRef);

            if (spaceSnap && spaceSnap.exists()) {
                await updateDoc(spaceRef, {
                    partner2_uid: userId,
                    partner2_name: nickname,
                    status: "connected"
                });

                await setDoc(doc(db, "users", userId), { uid: userId, nickname: nickname, coupleSpaceId: inputCode }, { merge: true });
                const data = spaceSnap.data();
                showSuccessScreen(data.partner1_name, nickname);
            } else {
                showSuccessScreen("Diw", nickname);
            }
        } catch (err) {
            showSuccessScreen("Diw", nickname);
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
                    const codeDisplay = document.getElementById('generatedCodeDisplay');
                    if (codeDisplay) codeDisplay.innerText = spaceId;
                    codeDisplayCard?.classList.remove('hidden');
                    listenForPartner(spaceId);
                }
            }
        }).catch(() => {
            codeDisplayCard?.classList.remove('hidden');
        });
    }

    function showSuccessScreen(p1, p2) {
        const p1El = document.getElementById('p1Name');
        const p2El = document.getElementById('p2Name');
        if (p1El) p1El.innerText = p1 || "Diw";
        if (p2El) p2El.innerText = p2 || "Rama";

        coupleCard?.classList.add('hidden');
        codeDisplayCard?.classList.add('hidden');
        successCard?.classList.remove('hidden');
    }

    // ENTER HOME DASHBOARD
    document.getElementById('btnEnterApp')?.addEventListener('click', () => {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) authContainer.classList.add('hidden');
        
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) homeScreen.classList.remove('hidden');
        if (globalBottomNav) globalBottomNav.classList.remove('hidden');

        if (!currentUserData) currentUserData = { nickname: "Diw", coupleSpaceId: "DEMO" };

        updateGreetingName();
        updateTimeGreeting();
        updateUserPresence(currentUserData.coupleSpaceId);
        listenRealtimeNotifications(currentUserData.coupleSpaceId);
        listenStartDate(currentUserData.coupleSpaceId);
        listenMochiStats(currentUserData.coupleSpaceId);
        listenWishlist(currentUserData.coupleSpaceId);
        listenJourneyPAP(currentUserData.coupleSpaceId);
        listenMemoriesAlbum(currentUserData.coupleSpaceId);
        listenHeartnotes(currentUserData.coupleSpaceId);
    });

    function updateTimeGreeting() {
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('timeGreeting');
        if (!greetingEl) return;

        if (hour >= 5 && hour < 12) greetingEl.innerText = "Good Morning! ☀️";
        else if (hour >= 12 && hour < 17) greetingEl.innerText = "Good Afternoon! 🌤️";
        else if (hour >= 17 && hour < 21) greetingEl.innerText = "Good Evening! 🌙";
        else greetingEl.innerText = "Good Night! ✨";
    }

    async function updateUserPresence(spaceId) {
        if (!spaceId || !currentUserData || !currentUserData.uid) return;

        const userRef = doc(db, "users", currentUserData.uid);
        await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true }).catch(() => {});

        onSnapshot(doc(db, "couple_spaces", spaceId), async (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            const partnerUid = data.partner1_uid === currentUserData.uid ? data.partner2_uid : data.partner1_uid;
            const partnerName = data.partner1_uid === currentUserData.uid ? data.partner2_name : data.partner1_name;

            const statusEl = document.getElementById('partnerActiveStatus');
            if (!partnerUid) {
                if (statusEl) statusEl.innerText = `⏳ Menunggu ${partnerName || 'Rama'}...`;
                return;
            }

            const partnerSnap = await getDoc(doc(db, "users", partnerUid)).catch(() => null);
            if (partnerSnap && partnerSnap.exists() && partnerSnap.data().lastActive) {
                const lastActive = partnerSnap.data().lastActive.toDate();
                const now = new Date();
                const diffMinutes = Math.floor((now - lastActive) / 60000);

                if (statusEl) {
                    if (diffMinutes < 3) statusEl.innerText = `🟢 ${partnerName} Aktif sekarang`;
                    else if (diffMinutes < 60) statusEl.innerText = `🟡 ${partnerName} Aktif ${diffMinutes} mnt lalu`;
                    else statusEl.innerText = `⚪ ${partnerName} Aktif ${Math.floor(diffMinutes / 60)} jam lalu`;
                }
            }
        });
    }

    // MODAL DIALOG CONTROLLERS
    const hugModal = document.getElementById('hugModal');
    const moodModal = document.getElementById('moodModal');
    const wishlistModal = document.getElementById('wishlistModal');

    document.getElementById('btnHugModal')?.addEventListener('click', () => hugModal?.classList.remove('hidden'));
    document.getElementById('closeHugModal')?.addEventListener('click', () => hugModal?.classList.add('hidden'));

    document.getElementById('btnMoodModal')?.addEventListener('click', () => moodModal?.classList.remove('hidden'));
    document.getElementById('closeMoodModal')?.addEventListener('click', () => moodModal?.classList.add('hidden'));

    document.getElementById('btnWishlistModal')?.addEventListener('click', () => wishlistModal?.classList.remove('hidden'));
    document.getElementById('closeWishlistModal')?.addEventListener('click', () => wishlistModal?.classList.add('hidden'));

    document.getElementById('btnPetModal')?.addEventListener('click', () => {
        document.getElementById('homeScreen')?.classList.add('hidden');
        document.getElementById('petScreen')?.classList.remove('hidden');
    });

    document.getElementById('btnBackFromPet')?.addEventListener('click', () => {
        document.getElementById('petScreen')?.classList.add('hidden');
        document.getElementById('homeScreen')?.classList.remove('hidden');
    });

    // EXPRESS LOVE SEND
    document.querySelectorAll('.express-sticker').forEach(sticker => {
        sticker.addEventListener('click', async () => {
            const loveType = sticker.getAttribute('data-type');
            hugModal?.classList.add('hidden');

            if (currentUserData && currentUserData.coupleSpaceId) {
                await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                    type: "express",
                    senderUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                    senderName: currentUserData.nickname || "User",
                    message: `mengirimkan ${loveType}`,
                    timestamp: serverTimestamp()
                });

                alert(`Berhasil mengirimkan ${loveType}! 💖`);
            }
        });
    });

    // DAILY CHECK IN
    let selectedMood = "😄 Happy";
    document.querySelectorAll('.mood-sticker').forEach(sticker => {
        sticker.addEventListener('click', () => {
            document.querySelectorAll('.mood-sticker').forEach(b => b.classList.remove('selected'));
            sticker.classList.add('selected');
            selectedMood = sticker.getAttribute('data-mood');
        });
    });

    document.getElementById('btnSaveMood')?.addEventListener('click', async () => {
        const note = document.getElementById('moodNoteInput')?.value;
        moodModal?.classList.add('hidden');

        if (currentUserData && currentUserData.coupleSpaceId) {
            const msgText = note ? `Mood Check-In: ${selectedMood} ("${note}")` : `Mood Check-In: ${selectedMood}`;
            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                type: "mood",
                senderUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                senderName: currentUserData.nickname || "User",
                message: msgText,
                timestamp: serverTimestamp()
            });
            alert(`Mood hari ini (${selectedMood}) tersimpan! 🤍`);
        }
    });

    // SYSTEM MOCHI: STIKER ITEM DIGESER LANGSUNG KE MOCHI
    const stage = document.getElementById('mochiGameStage');
    const speech = document.getElementById('mochiSpeech');
    const eyeL = document.getElementById('eyeLeft');
    const eyeR = document.getElementById('eyeRight');
    const mouth = document.getElementById('catMouth');
    const soapOverlay = document.getElementById('soapOverlay');
    const nightOverlay = document.getElementById('nightOverlay');

    const groupDining = document.getElementById('groupDining');
    const groupBath = document.getElementById('groupBath');
    const groupBed = document.getElementById('groupBed');

    const btnSwitchDining = document.getElementById('btnSwitchDining');
    const btnSwitchBath = document.getElementById('btnSwitchBath');
    const btnSwitchBed = document.getElementById('btnSwitchBed');

    function switchMochiRoom(mode) {
        stage.className = `mochi-game-stage mode-${mode}`;
        [groupDining, groupBath, groupBed].forEach(t => t?.classList.add('hidden'));
        [btnSwitchDining, btnSwitchBath, btnSwitchBed].forEach(b => b?.classList.remove('active'));

        if (mode === 'dining') {
            groupDining?.classList.remove('hidden');
            btnSwitchDining?.classList.add('active');
            if (speech) speech.innerText = '"Tarik / klik makanan ke Mochi ya! 🥣"';
        } else if (mode === 'bath') {
            groupBath?.classList.remove('hidden');
            btnSwitchBath?.classList.add('active');
            if (speech) speech.innerText = '"Geser sabun/shower ke Mochi! 🧼"';
        } else if (mode === 'bed') {
            groupBed?.classList.remove('hidden');
            btnSwitchBed?.classList.add('active');
            if (speech) speech.innerText = '"Klik/geser lampu atau tangan pat-pat! 😴"';
        }
    }

    btnSwitchDining?.addEventListener('click', () => switchMochiRoom('dining'));
    btnSwitchBath?.addEventListener('click', () => switchMochiRoom('bath'));
    btnSwitchBed?.addEventListener('click', () => switchMochiRoom('bed'));

    // INTERAKSI REALTIME TOUCH & DRAG ITEM UNTUK STIKER POLOS
    document.querySelectorAll('.sticker-item').forEach(sticker => {
        let isDragging = false;

        sticker.addEventListener('click', () => {
            handleItemUse(sticker);
        });

        sticker.addEventListener('touchstart', (e) => {
            isDragging = true;
        });

        sticker.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            sticker.style.position = 'fixed';
            sticker.style.left = `${touch.clientX - 25}px`;
            sticker.style.top = `${touch.clientY - 25}px`;
            sticker.style.zIndex = '99';
        });

        sticker.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                sticker.style.position = 'static';
                handleItemUse(sticker);
            }
        });
    });

    let isNight = false;

    async function handleItemUse(sticker) {
        const action = sticker.getAttribute('data-action');

        if (action === 'food') {
            const addVal = parseInt(sticker.getAttribute('data-add')) || 20;
            if (eyeL) eyeL.innerText = '😸';
            if (eyeR) eyeR.innerText = '😸';
            if (mouth) mouth.innerText = ' Nom-Nom! ';
            if (speech) speech.innerText = '"Nyam nyam lezat sekali! Mochi senang! ❤️"';

            setTimeout(() => {
                if (eyeL) eyeL.innerText = '●';
                if (eyeR) eyeR.innerText = '●';
                if (mouth) mouth.innerText = 'ω';
            }, 2000);

            updateMochiPercentage('hunger', addVal);

            if (currentUserData?.coupleSpaceId) {
                await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                    type: "mochi",
                    senderUid: currentUserData.uid || "anon",
                    senderName: currentUserData.nickname || "User",
                    message: "memberi makan lezat ke Mochi 🥣",
                    timestamp: serverTimestamp()
                });
            }
        } else if (action === 'soap') {
            soapOverlay?.classList.remove('hidden');
            if (speech) speech.innerText = '"Badan Mochi penuh busa sabun wangi! 🧼"';
            if (eyeL) eyeL.innerText = '😸';
            if (eyeR) eyeR.innerText = '😸';
        } else if (action === 'water') {
            soapOverlay?.classList.add('hidden');
            if (speech) speech.innerText = '"Byuur! Sabunnya hilang, Mochi wangi & bersih! ✨"';
            if (eyeL) eyeL.innerText = '✨';
            if (eyeR) eyeR.innerText = '✨';

            setTimeout(() => {
                if (eyeL) eyeL.innerText = '●';
                if (eyeR) eyeR.innerText = '●';
            }, 2000);

            updateMochiPercentage('hygiene', 30);

            if (currentUserData?.coupleSpaceId) {
                await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                    type: "mochi",
                    senderUid: currentUserData.uid || "anon",
                    senderName: currentUserData.nickname || "User",
                    message: "memandikan Mochi sampai bersih 🧼",
                    timestamp: serverTimestamp()
                });
            }
        } else if (action === 'lamp') {
            isNight = !isNight;
            nightOverlay?.classList.toggle('hidden', !isNight);
            if (isNight) {
                if (speech) speech.innerText = '"Lampu mati... Mochi bobo nyenyak yaa 💤"';
                if (eyeL) eyeL.innerText = '￣';
                if (eyeR) eyeR.innerText = '￣';
            } else {
                if (speech) speech.innerText = '"Lampu menyala! Mochi bangun lagi! ☀️"';
                if (eyeL) eyeL.innerText = '●';
                if (eyeR) eyeR.innerText = '●';
            }
        } else if (action === 'pat') {
            if (speech) speech.innerText = '"Purrr... Dipuk-puk hangat banget! 💖"';
            if (eyeL) eyeL.innerText = '🥰';
            if (eyeR) eyeR.innerText = '🥰';

            setTimeout(() => {
                if (eyeL) eyeL.innerText = '●';
                if (eyeR) eyeR.innerText = '●';
            }, 2000);

            updateMochiPercentage('energy', 20);

            if (currentUserData?.coupleSpaceId) {
                await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                    type: "mochi",
                    senderUid: currentUserData.uid || "anon",
                    senderName: currentUserData.nickname || "User",
                    message: "mempuk-puk Mochi 🖐️",
                    timestamp: serverTimestamp()
                });
            }
        }
    }

    async function updateMochiPercentage(type, amount) {
        if (!currentUserData || !currentUserData.coupleSpaceId) return;
        const spaceRef = doc(db, "couple_spaces", currentUserData.coupleSpaceId);

        getDoc(spaceRef).then(async (snap) => {
            if (snap.exists()) {
                let m = snap.data().mochi || { hunger: 40, hygiene: 50, energy: 30 };
                m[type] = Math.min(100, (m[type] || 30) + amount);
                await updateDoc(spaceRef, { mochi: m });
            }
        });
    }

    function listenMochiStats(spaceId) {
        if (!spaceId) return;
        onSnapshot(doc(db, "couple_spaces", spaceId), (docSnap) => {
            if (docSnap.exists()) {
                const mochi = docSnap.data().mochi || { hunger: 40, hygiene: 50, energy: 30 };
                const pH = document.getElementById('pctHunger');
                const pHy = document.getElementById('pctHygiene');
                const pE = document.getElementById('pctEnergy');

                if (pH) pH.innerText = (mochi.hunger || 40) + '%';
                if (pHy) pHy.innerText = (mochi.hygiene || 50) + '%';
                if (pE) pE.innerText = (mochi.energy || 30) + '%';
            }
        });
    }

    // SCREEN SWITCHING
    const homeScreen = document.getElementById('homeScreen');
    const journeyScreen = document.getElementById('journeyScreen');
    const memoriesScreen = document.getElementById('memoriesScreen');
    const heartnotesScreen = document.getElementById('heartnotesScreen');
    const petScreen = document.getElementById('petScreen');

    function showSubScreen(screenToShow, activeNavId) {
        [homeScreen, journeyScreen, memoriesScreen, heartnotesScreen, petScreen].forEach(s => s?.classList.add('hidden'));
        screenToShow?.classList.remove('hidden');

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        if (activeNavId) document.getElementById(activeNavId)?.classList.add('active');
    }

    document.getElementById('navHome')?.addEventListener('click', () => showSubScreen(homeScreen, 'navHome'));
    document.getElementById('navJourney')?.addEventListener('click', () => showSubScreen(journeyScreen, 'navJourney'));
    document.getElementById('navMemories')?.addEventListener('click', () => showSubScreen(memoriesScreen, 'navMemories'));
    document.getElementById('navHeartnotes')?.addEventListener('click', () => showSubScreen(heartnotesScreen, 'navHeartnotes'));

    // OUR JOURNEY
    let journeyBase64Img = "";

    document.getElementById('btnOpenAddJourney')?.addEventListener('click', () => {
        document.getElementById('addJourneyForm')?.classList.toggle('hidden');
    });

    document.getElementById('journeyCameraInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (event) => {
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    journeyBase64Img = canvas.toDataURL('image/jpeg', 0.7);

                    const prevImg = document.getElementById('journeyPreviewImg');
                    if (prevImg) prevImg.src = journeyBase64Img;
                    document.getElementById('journeyPreviewContainer')?.classList.remove('hidden');
                };
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('addJourneyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('journeyDescInput')?.value.trim() || '';

        if (!journeyBase64Img) return alert("Ambil atau pilih foto PAP terlebih dahulu ya!");
        if (!currentUserData || !currentUserData.coupleSpaceId) return alert("Space belum terhubung.");

        try {
            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "journey_pap"), {
                imgData: journeyBase64Img,
                desc: desc,
                author: currentUserData.nickname || "User",
                authorUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                type: "pap",
                senderUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                senderName: currentUserData.nickname || "User",
                message: `mengirimkan PAP di Our Journey 📸`,
                timestamp: serverTimestamp()
            });

            journeyBase64Img = "";
            const descInput = document.getElementById('journeyDescInput');
            if (descInput) descInput.value = '';
            document.getElementById('journeyPreviewContainer')?.classList.add('hidden');
            document.getElementById('addJourneyForm')?.classList.add('hidden');
            alert("PAP berhasil dikirim! 📸");
        } catch (err) {
            alert("Gagal mengirim PAP: " + err.message);
        }
    });

    function listenJourneyPAP(spaceId) {
        if (!spaceId) return;
        const ref = collection(db, "couple_spaces", spaceId, "journey_pap");
        const q = query(ref, orderBy("createdAt", "asc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('journeyTimelineContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada PAP di Our Journey. Kirim foto kegiatanmu yuk!</p>';
                return;
            }

            const myUid = currentUserData?.uid || auth.currentUser?.uid;
            let lastDateStr = "";

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
                const dateHeaderStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (dateHeaderStr !== lastDateStr) {
                    const divider = document.createElement('div');
                    divider.className = 'date-divider';
                    divider.innerHTML = `<span>${dateHeaderStr}</span>`;
                    container.appendChild(divider);
                    lastDateStr = dateHeaderStr;
                }

                const isMyMessage = data.authorUid === myUid || data.author === currentUserData?.nickname;
                const bubbleClass = isMyMessage ? 'sent' : 'received';

                const card = document.createElement('div');
                card.className = `journey-bubble ${bubbleClass}`;
                card.innerHTML = `
                    <div class="journey-header">
                        <span class="journey-user">${isMyMessage ? 'Kamu' : data.author}</span>
                        <span class="journey-time">${timeStr}</span>
                    </div>
                    <img src="${data.imgData}" alt="PAP" class="journey-img">
                    ${data.desc ? `<div class="journey-desc">${data.desc}</div>` : ''}
                `;

                const imgEl = card.querySelector('.journey-img');
                imgEl.addEventListener('click', () => {
                    openPhotoViewer(data.imgData, `PAP dari ${isMyMessage ? 'Kamu' : data.author} • ${timeStr}`, '', data.desc);
                });

                container.appendChild(card);
            });

            container.scrollTop = container.scrollHeight;
        });
    }

    // MEMORIES ALBUM
    let memBase64Img = "";

    document.getElementById('btnOpenAddMemory')?.addEventListener('click', () => {
        document.getElementById('addMemoryForm')?.classList.toggle('hidden');
    });

    document.getElementById('memCameraInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (event) => {
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    memBase64Img = canvas.toDataURL('image/jpeg', 0.7);

                    const prevImg = document.getElementById('memPreviewImg');
                    if (prevImg) prevImg.src = memBase64Img;
                    document.getElementById('memPreviewContainer')?.classList.remove('hidden');
                };
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('addMemoryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('memDateInput')?.value;
        const title = document.getElementById('memTitleInput')?.value.trim();
        const desc = document.getElementById('memDescInput')?.value.trim();

        if (!memBase64Img) return alert("Pilih / ambil foto album terlebih dahulu!");
        if (!currentUserData || !currentUserData.coupleSpaceId) return;

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "memories"), {
            imgData: memBase64Img,
            date, title, desc,
            author: currentUserData.nickname || "Diw",
            createdAt: serverTimestamp()
        });

        memBase64Img = "";
        const titleIn = document.getElementById('memTitleInput');
        const descIn = document.getElementById('memDescInput');
        if (titleIn) titleIn.value = '';
        if (descIn) descIn.value = '';
        document.getElementById('memPreviewContainer')?.classList.add('hidden');
        document.getElementById('addMemoryForm')?.classList.add('hidden');
    });

    function listenMemoriesAlbum(spaceId) {
        if (!spaceId) return;
        const ref = collection(db, "couple_spaces", spaceId, "memories");
        const q = query(ref, orderBy("date", "desc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('memoriesGridContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada album kenangan. Tambahkan momen spesial kalian!</p>';
                return;
            }

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = 'mem-card-feed';
                card.innerHTML = `
                    <div class="mem-frame-box">
                        <img src="${data.imgData}" alt="${data.title}">
                    </div>
                    <div class="mem-info-box">
                        <span class="mem-date-badge">📅 ${data.date}</span>
                        <div class="mem-feed-title">${data.title}</div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    openPhotoViewer(data.imgData, `📅 ${data.date} • Oleh ${data.author || 'Diw/Rama'}`, data.title, data.desc);
                });

                container.appendChild(card);
            });
        });
    }

    // HEARTNOTES
    document.getElementById('btnOpenAddNote')?.addEventListener('click', () => {
        document.getElementById('addNoteForm')?.classList.toggle('hidden');
    });

    document.getElementById('addNoteForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('noteTitleInput')?.value.trim();
        const content = document.getElementById('noteContentInput')?.value.trim();

        if (!currentUserData || !currentUserData.coupleSpaceId) return alert("Space belum terhubung.");

        try {
            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "heartnotes"), {
                title: title || '',
                content,
                author: currentUserData.nickname || "User",
                authorUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                type: "note",
                senderUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                senderName: currentUserData.nickname || "User",
                message: `menulis Heartnote baru`,
                timestamp: serverTimestamp()
            });

            const titleIn = document.getElementById('noteTitleInput');
            const contentIn = document.getElementById('noteContentInput');
            if (titleIn) titleIn.value = '';
            if (contentIn) contentIn.value = '';
            document.getElementById('addNoteForm')?.classList.add('hidden');
        } catch (err) {
            alert("Gagal mengirim Heartnote: " + err.message);
        }
    });

    function listenHeartnotes(spaceId) {
        if (!spaceId) return;
        const ref = collection(db, "couple_spaces", spaceId, "heartnotes");
        const q = query(ref, orderBy("createdAt", "asc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('notesContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada Heartnotes. Tulis ucapan manis untuk pasanganmu!</p>';
                return;
            }

            const myUid = currentUserData?.uid || auth.currentUser?.uid;

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const isMyMessage = data.authorUid === myUid || data.author === currentUserData?.nickname;
                const bubbleClass = isMyMessage ? 'sent' : 'received';

                const card = document.createElement('div');
                card.className = `note-card ${bubbleClass}`;
                card.innerHTML = `
                    <div class="note-header">
                        <span class="note-author">${isMyMessage ? 'Kamu' : data.author}</span>
                        <span class="note-date">${timeStr}</span>
                    </div>
                    ${data.title ? `<div class="note-title">${data.title}</div>` : ''}
                    <div class="note-content">${data.content}</div>
                `;
                container.appendChild(card);
            });

            container.scrollTop = container.scrollHeight;
        });
    }

    // TANGGAL BERSAMA
    const startDateInput = document.getElementById('startDateInput');

    function listenStartDate(spaceId) {
        if (!spaceId) return;
        onSnapshot(doc(db, "couple_spaces", spaceId), (docSnap) => {
            if (docSnap.exists() && docSnap.data().startDate && startDateInput) {
                const savedDate = docSnap.data().startDate;
                startDateInput.value = savedDate;
                calculateDaysTogether(savedDate);
            }
        });
    }

    startDateInput?.addEventListener('change', async (e) => {
        const chosenDate = e.target.value;
        if (currentUserData && currentUserData.coupleSpaceId) {
            await setDoc(doc(db, "couple_spaces", currentUserData.coupleSpaceId), { startDate: chosenDate }, { merge: true });
            calculateDaysTogether(chosenDate);
        }
    });

    function calculateDaysTogether(startDateStr) {
        const start = new Date(startDateStr);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const countEl = document.getElementById('daysTogetherCount');
        if (countEl) countEl.innerText = isNaN(diffDays) ? 0 : diffDays;
    }

    // WISHLIST
    const btnOpenAddWish = document.getElementById('btnOpenAddWish');
    const addWishForm = document.getElementById('addWishForm');

    btnOpenAddWish?.addEventListener('click', () => addWishForm?.classList.toggle('hidden'));

    addWishForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('wishTitleInput')?.value.trim();
        const category = document.getElementById('wishCategorySelect')?.value;

        if (!title || !currentUserData || !currentUserData.coupleSpaceId) return;

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "wishlists"), {
            title, category, author: currentUserData.nickname || "Diw", authorUid: currentUserData.uid || "anon", isDone: false, createdAt: serverTimestamp()
        });

        const titleIn = document.getElementById('wishTitleInput');
        if (titleIn) titleIn.value = '';
        addWishForm?.classList.add('hidden');
    });

    function listenWishlist(spaceId) {
        if (!spaceId) return;
        const wishRef = collection(db, "couple_spaces", spaceId, "wishlists");
        const q = query(wishRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('wishlistContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada wishlist. Yuk buat impian pertama kalian!</p>';
                return;
            }

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const id = docSnap.id;

                const card = document.createElement('div');
                card.className = `wish-card ${data.isDone ? 'done' : ''}`;
                card.innerHTML = `
                    <div class="wish-info">
                        <span class="wish-cat">${data.category}</span>
                        <div class="wish-title">${data.title}</div>
                        <div class="wish-author">Oleh: ${data.author}</div>
                    </div>
                    <button class="btn-toggle-wish" data-id="${id}" data-done="${data.isDone}">
                        ${data.isDone ? '🎉 Terwujud' : '⏳ Tandai'}
                    </button>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.btn-toggle-wish').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const wishId = e.target.getAttribute('data-id');
                    const currentDone = e.target.getAttribute('data-done') === 'true';
                    const docRef = doc(db, "couple_spaces", spaceId, "wishlists", wishId);
                    await setDoc(docRef, { isDone: !currentDone }, { merge: true });
                });
            });
        });
    }

    // RIWAYAT AKTIVITAS
    function listenRealtimeNotifications(spaceId) {
        if (!spaceId) return;
        const notifRef = collection(db, "couple_spaces", spaceId, "notifications");
        const q = query(notifRef, orderBy("timestamp", "desc"), limit(15));

        onSnapshot(q, (snapshot) => {
            const logContainer = document.getElementById('activityLogList');
            if (logContainer) logContainer.innerHTML = '';

            if (snapshot.empty) {
                if (logContainer) logContainer.innerHTML = '<p class="empty-act">Belum ada aktivitas hari ini.</p>';
                return;
            }

            const myUid = currentUserData?.uid || auth.currentUser?.uid;

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const isMine = data.senderUid === myUid || data.senderName === currentUserData?.nickname;
                const senderClass = isMine ? 'diw' : 'rama';

                const bubble = document.createElement('div');
                bubble.className = `act-bubble ${senderClass}`;
                bubble.innerHTML = `
                    <div class="act-header">
                        <span class="act-sender ${senderClass}">${isMine ? 'Kamu (' + data.senderName + ')' : data.senderName}</span>
                        <span class="act-time">${timeStr}</span>
                    </div>
                    <div class="act-body">${data.message}</div>
                `;
                if (logContainer) logContainer.appendChild(bubble);
            });
        });
    }

});