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

    // MODAL IMAGE VIEWER (FULLSCREEN FOTO)
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
                if (currentUserData.coupleSpaceId) {
                    authCard?.classList.add('hidden');
                    checkConnectionStatus(currentUserData.coupleSpaceId);
                }
            } else {
                currentUserData = { uid: user.uid, nickname: "Diw" };
            }
        }
    });

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
            const nickname = document.getElementById('regNickname')?.value;
            const location = document.getElementById('regLocation')?.value;
            const birthDate = document.getElementById('regBirthDate')?.value;
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                currentUserData = { uid, fullName, nickname, location, birthDate, email, coupleSpaceId: null };
                await setDoc(doc(db, "users", uid), currentUserData, { merge: true }).catch(() => {});

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

    // CREATE COUPLE SPACE
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

        try {
            await setDoc(doc(db, "couple_spaces", code), {
                spaceId: code,
                partner1_uid: userId,
                partner1_name: nickname,
                partner2_uid: null,
                partner2_name: null,
                status: "waiting",
                startDate: null,
                mochi: { hunger: 80, hygiene: 70, love: 90 },
                createdAt: new Date()
            });

            await setDoc(doc(db, "users", userId), { 
                uid: userId, 
                nickname: nickname, 
                coupleSpaceId: code 
            }, { merge: true });

            listenForPartner(code);
        } catch (err) {
            console.log("Firestore background sync note:", err.message);
        }
    });

    // JOIN COUPLE SPACE
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

                await setDoc(doc(db, "users", userId), { 
                    uid: userId, 
                    nickname: nickname, 
                    coupleSpaceId: inputCode 
                }, { merge: true });

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

        if (!currentUserData) currentUserData = { nickname: "Diw", coupleSpaceId: "DEMO" };

        const userGreeting = document.getElementById('homeUserGreeting');
        if (userGreeting) userGreeting.innerText = currentUserData.nickname + " ❤️";

        updateTimeGreeting();
        updateUserPresence(currentUserData.coupleSpaceId);
        listenRealtimeNotifications(currentUserData.coupleSpaceId);
        listenStartDate(currentUserData.coupleSpaceId);
        listenMochiStats(currentUserData.coupleSpaceId);
        listenWishlist(currentUserData.coupleSpaceId);
        checkOnThisDayMemoriesOnly(currentUserData.coupleSpaceId);
        listenJourneyPAP(currentUserData.coupleSpaceId);
        listenMemoriesAlbum(currentUserData.coupleSpaceId);
        listenHeartnotes(currentUserData.coupleSpaceId);
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

    // SCREEN SWITCHING
    const homeScreen = document.getElementById('homeScreen');
    const journeyScreen = document.getElementById('journeyScreen');
    const memoriesScreen = document.getElementById('memoriesScreen');
    const heartnotesScreen = document.getElementById('heartnotesScreen');

    function showSubScreen(screenToShow) {
        [homeScreen, journeyScreen, memoriesScreen, heartnotesScreen].forEach(s => s?.classList.add('hidden'));
        screenToShow?.classList.remove('hidden');
    }

    document.querySelectorAll('[id^="navHome"]').forEach(btn => btn.addEventListener('click', () => showSubScreen(homeScreen)));
    document.querySelectorAll('[id^="navJourney"]').forEach(btn => btn.addEventListener('click', () => showSubScreen(journeyScreen)));
    document.querySelectorAll('[id^="navMemories"]').forEach(btn => btn.addEventListener('click', () => showSubScreen(memoriesScreen)));
    document.querySelectorAll('[id^="navHeartnotes"]').forEach(btn => btn.addEventListener('click', () => showSubScreen(heartnotesScreen)));

    // OUR JOURNEY PAP
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
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
                type: "pap",
                senderUid: currentUserData.uid || auth.currentUser?.uid || "anon",
                senderName: currentUserData.nickname || "User",
                message: `mengirimkan PAP keseharian baru 📸`,
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
        const q = query(ref, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('journeyTimelineContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada PAP keseharian. Kirim foto kegiatanmu yuk!</p>';
                return;
            }

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeStr = dateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

                const item = document.createElement('div');
                item.className = 'pap-card';
                item.innerHTML = `
                    <div class="pap-header">
                        <span class="pap-user">📸 ${data.author}</span>
                        <span class="pap-time">${timeStr}</span>
                    </div>
                    <img src="${data.imgData}" alt="PAP Keseharian" class="pap-img">
                    ${data.desc ? `<div class="pap-desc">${data.desc}</div>` : ''}
                `;

                const imgEl = item.querySelector('.pap-img');
                imgEl.addEventListener('click', () => {
                    openPhotoViewer(data.imgData, `PAP dari ${data.author} • ${timeStr}`, '', data.desc);
                });

                container.appendChild(item);
            });
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
            author: currentUserData.nickname,
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
                card.className = 'mem-card';
                card.innerHTML = `
                    <img src="${data.imgData}" alt="${data.title}">
                    <span class="mem-date">📅 ${data.date}</span>
                    <div class="mem-title">${data.title}</div>
                    ${data.desc ? `<div class="mem-desc">"${data.desc}"</div>` : ''}
                `;

                const imgEl = card.querySelector('img');
                imgEl.addEventListener('click', () => {
                    openPhotoViewer(data.imgData, `📅 ${data.date} • Oleh ${data.author || 'Diw/Rama'}`, data.title, data.desc);
                });

                container.appendChild(card);
            });
        });
    }

    // HEARTNOTES (CHAT BUBBLE STYLE)
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

    function checkOnThisDayMemoriesOnly(spaceId) {
        if (!spaceId) return;
        const today = new Date();
        const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const memRef = collection(db, "couple_spaces", spaceId, "memories");
        onSnapshot(memRef, (snapshot) => {
            const widget = document.getElementById('onThisDayWidget');
            let matchFound = false;

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.date) {
                    const memDate = new Date(data.date);
                    const memMonthDay = `${String(memDate.getMonth() + 1).padStart(2, '0')}-${String(memDate.getDate()).padStart(2, '0')}`;

                    if (memMonthDay === currentMonthDay && memDate.getFullYear() < today.getFullYear()) {
                        matchFound = true;
                        const yearsAgo = today.getFullYear() - memDate.getFullYear();

                        const titleEl = document.getElementById('otdTitle');
                        const capEl = document.getElementById('otdCaption');
                        if (titleEl) titleEl.innerText = `${yearsAgo} Tahun Lalu Hari Ini ✨`;
                        if (capEl) capEl.innerText = `"${data.title}" ${data.desc ? '- ' + data.desc : ''}`;

                        const imgEl = document.getElementById('otdImage');
                        if (data.imgData && imgEl) {
                            imgEl.src = data.imgData;
                            imgEl.classList.remove('hidden');
                            imgEl.onclick = () => openPhotoViewer(data.imgData, `${yearsAgo} Tahun Lalu Hari Ini ✨`, data.title, data.desc);
                        }

                        widget?.classList.remove('hidden');
                    }
                }
            });

            if (!matchFound) widget?.classList.add('hidden');
        });
    }

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
        const barH = document.getElementById('barHunger');
        const txtH = document.getElementById('txtHunger');
        if (barH) barH.style.width = mochi.hunger + '%';
        if (txtH) txtH.innerText = mochi.hunger + '%';

        const barHy = document.getElementById('barHygiene');
        const txtHy = document.getElementById('txtHygiene');
        if (barHy) barHy.style.width = mochi.hygiene + '%';
        if (txtHy) txtHy.innerText = mochi.hygiene + '%';

        const barL = document.getElementById('barLove');
        const txtL = document.getElementById('txtLove');
        if (barL) barL.style.width = mochi.love + '%';
        if (txtL) txtL.innerText = mochi.love + '%';
    }

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

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const item = document.createElement('div');
                item.className = 'act-item';
                item.innerHTML = `<span class="act-user">${data.senderName}</span> ${data.message} <span class="act-time">${timeStr}</span>`;
                if (logContainer) logContainer.appendChild(item);
            });
        });
    }

});