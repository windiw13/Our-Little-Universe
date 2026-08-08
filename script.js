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

// TUNGGU HALAMAN SIAP SEBELUM MEMANGGIL ELEMEN
document.addEventListener('DOMContentLoaded', () => {

    const authCard = document.getElementById('authCard');
    const coupleCard = document.getElementById('coupleCard');
    const codeDisplayCard = document.getElementById('codeDisplayCard');
    const successCard = document.getElementById('successCard');

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

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
                await setDoc(doc(db, "users", uid), currentUserData);

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

                const userDoc = await getDoc(doc(db, "users", uid));
                currentUserData = userDoc.data();

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
        const codeDisplay = document.getElementById('generatedCodeDisplay');
        if (codeDisplay) codeDisplay.innerText = code;
        coupleCard?.classList.add('hidden');
        codeDisplayCard?.classList.remove('hidden');

        listenForPartner(code);
    });

    // JOIN COUPLE SPACE
    document.getElementById('btnJoinSpace')?.addEventListener('click', async () => {
        const inputCode = document.getElementById('joinCodeInput')?.value.trim().toUpperCase();
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
                    const codeDisplay = document.getElementById('generatedCodeDisplay');
                    if (codeDisplay) codeDisplay.innerText = spaceId;
                    codeDisplayCard?.classList.remove('hidden');
                    listenForPartner(spaceId);
                }
            }
        });
    }

    function showSuccessScreen(p1, p2) {
        const p1El = document.getElementById('p1Name');
        const p2El = document.getElementById('p2Name');
        if (p1El) p1El.innerText = p1;
        if (p2El) p2El.innerText = p2;

        coupleCard?.classList.add('hidden');
        codeDisplayCard?.classList.add('hidden');
        successCard?.classList.remove('hidden');
    }

    // COPY CODE BUTTON
    document.getElementById('btnCopyCode')?.addEventListener('click', () => {
        const code = document.getElementById('generatedCodeDisplay')?.innerText;
        if (code) {
            navigator.clipboard.writeText(code);
            alert("Kode berhasil disalin! Kirimkan ke Rama ya 🤍");
        }
    });

    // ENTER HOME DASHBOARD
    document.getElementById('btnEnterApp')?.addEventListener('click', () => {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) authContainer.classList.add('hidden');
        
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) homeScreen.classList.remove('hidden');

        if (currentUserData) {
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

            const statusEl = document.getElementById('partnerActiveStatus');
            if (!partnerUid) {
                if (statusEl) statusEl.innerText = `⏳ Menunggu ${partnerName || 'Rama'}...`;
                return;
            }

            const partnerSnap = await getDoc(doc(db, "users", partnerUid));
            if (partnerSnap.exists() && partnerSnap.data().lastActive) {
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
                        } else if (imgEl) {
                            imgEl.classList.add('hidden');
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
            await updateDoc(doc(db, "couple_spaces", currentUserData.coupleSpaceId), { startDate: chosenDate });
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
            const reader = new FileReader();
            reader.onload = (event) => {
                journeyBase64Img = event.target.result;
                const prevImg = document.getElementById('journeyPreviewImg');
                if (prevImg) prevImg.src = journeyBase64Img;
                document.getElementById('journeyPreviewContainer')?.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('addJourneyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('journeyDescInput')?.value.trim();

        if (!journeyBase64Img) return alert("Ambil foto PAP terlebih dahulu ya!");
        if (!currentUserData || !currentUserData.coupleSpaceId) return;

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "journey_pap"), {
            imgData: journeyBase64Img,
            desc,
            author: currentUserData.nickname,
            createdAt: new Date()
        });

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
            type: "pap",
            senderUid: currentUserData.uid,
            senderName: currentUserData.nickname,
            message: `mengirimkan PAP keseharian baru 📸`,
            timestamp: new Date()
        });

        journeyBase64Img = "";
        const descInput = document.getElementById('journeyDescInput');
        if (descInput) descInput.value = '';
        document.getElementById('journeyPreviewContainer')?.classList.add('hidden');
        document.getElementById('addJourneyForm')?.classList.add('hidden');
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
                const timeStr = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

                const item = document.createElement('div');
                item.className = 'pap-card';
                item.innerHTML = `
                    <div class="pap-header">
                        <span class="pap-user">${data.author}</span>
                        <span class="pap-time">${timeStr}</span>
                    </div>
                    <img src="${data.imgData}" alt="PAP Keseharian" class="pap-img">
                    <div class="pap-desc">${data.desc}</div>
                `;
                container.appendChild(item);
            });
        });
    }

    // MEMORIES
    let memBase64Img = "";

    document.getElementById('btnOpenAddMemory')?.addEventListener('click', () => {
        document.getElementById('addMemoryForm')?.classList.toggle('hidden');
    });

    document.getElementById('memCameraInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                memBase64Img = event.target.result;
                const prevImg = document.getElementById('memPreviewImg');
                if (prevImg) prevImg.src = memBase64Img;
                document.getElementById('memPreviewContainer')?.classList.remove('hidden');
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
            createdAt: new Date()
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

        if (!currentUserData || !currentUserData.coupleSpaceId) return;

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "heartnotes"), {
            title, content, author: currentUserData.nickname, createdAt: new Date()
        });

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "notifications"), {
            type: "note",
            senderUid: currentUserData.uid,
            senderName: currentUserData.nickname,
            message: `menulis Heartnote baru: "${title}"`,
            timestamp: new Date()
        });

        const titleIn = document.getElementById('noteTitleInput');
        const contentIn = document.getElementById('noteContentInput');
        if (titleIn) titleIn.value = '';
        if (contentIn) contentIn.value = '';
        document.getElementById('addNoteForm')?.classList.add('hidden');
    });

    function listenHeartnotes(spaceId) {
        if (!spaceId) return;
        const ref = collection(db, "couple_spaces", spaceId, "heartnotes");
        const q = query(ref, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('notesContainer');
            if (!container) return;
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-act">Belum ada Heartnotes. Tulis ucapan manis untuk pasanganmu!</p>';
                return;
            }

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const timeStr = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '';

                const card = document.createElement('div');
                card.className = 'note-card';
                card.innerHTML = `
                    <div class="note-header">
                        <span class="note-author">Dari: ${data.author}</span>
                        <span class="note-date">${timeStr}</span>
                    </div>
                    <div class="note-title">${data.title}</div>
                    <div class="note-content">${data.content}</div>
                `;
                container.appendChild(card);
            });
        });
    }

    // WISHLIST
    const wishlistModal = document.getElementById('wishlistModal');
    const btnOpenAddWish = document.getElementById('btnOpenAddWish');
    const addWishForm = document.getElementById('addWishForm');

    document.getElementById('btnWishlistModal')?.addEventListener('click', () => wishlistModal?.classList.remove('hidden'));
    document.getElementById('closeWishlistModal')?.addEventListener('click', () => wishlistModal?.classList.add('hidden'));

    btnOpenAddWish?.addEventListener('click', () => addWishForm?.classList.toggle('hidden'));

    addWishForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('wishTitleInput')?.value.trim();
        const category = document.getElementById('wishCategorySelect')?.value;

        if (!title || !currentUserData || !currentUserData.coupleSpaceId) return;

        await addDoc(collection(db, "couple_spaces", currentUserData.coupleSpaceId, "wishlists"), {
            title, category, author: currentUserData.nickname, authorUid: currentUserData.uid, isDone: false, createdAt: new Date()
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
                    await updateDoc(docRef, { isDone: !currentDone });
                });
            });
        });
    }

    // MOCHI ROOM SWITCHING
    document.getElementById('btnPetModal')?.addEventListener('click', () => {
        document.getElementById('homeScreen')?.classList.add('hidden');
        document.getElementById('petScreen')?.classList.remove('hidden');
    });

    document.getElementById('btnBackFromPet')?.addEventListener('click', () => {
        document.getElementById('petScreen')?.classList.add('hidden');
        document.getElementById('homeScreen')?.classList.remove('hidden');
    });

    // MOCHI GAME
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

        const bubble = document.getElementById('mochiBubble');
        if (bubble) {
            if (mochi.hunger < 40) {
                bubble.innerText = '"Mochi lapar banget... minta makan dong! 🐟"';
            } else if (mochi.love > 85) {
                bubble.innerText = '"Mochi seneng banget disayang kalian! 💖"';
            } else {
                bubble.innerText = '"Meow! Rawat Mochi berdua ya! 🤍"';
            }
        }
    }

    const draggableItem = document.getElementById('draggableItem');
    const btnFeedTool = document.getElementById('btnFeedTool');
    const btnBathTool = document.getElementById('btnBathTool');

    btnFeedTool?.addEventListener('click', () => {
        activeToolType = 'feed';
        if (draggableItem) {
            draggableItem.innerText = '🐟';
            draggableItem.classList.remove('hidden');
            draggableItem.style.top = '60px';
            draggableItem.style.left = '40px';
        }
        const bubble = document.getElementById('mochiBubble');
        if (bubble) bubble.innerText = '"Geser ikannya ke mulut Mochi yuk! 🐟"';
    });

    btnBathTool?.addEventListener('click', () => {
        activeToolType = 'bath';
        if (draggableItem) {
            draggableItem.innerText = '🧽';
            draggableItem.classList.remove('hidden');
            draggableItem.style.top = '60px';
            draggableItem.style.left = '40px';
        }
        const bubble = document.getElementById('mochiBubble');
        if (bubble) bubble.innerText = '"Gosokkan sponsnya ke badan Mochi! 🧼"';
    });

    let isDragging = false;

    draggableItem?.addEventListener('pointerdown', (e) => {
        isDragging = true;
        draggableItem.setPointerCapture(e.pointerId);
    });

    draggableItem?.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const playArea = document.getElementById('mochiPlayArea')?.getBoundingClientRect();
        if (!playArea) return;

        let x = e.clientX - playArea.left - 20;
        let y = e.clientY - playArea.top - 20;

        draggableItem.style.left = `${x}px`;
        draggableItem.style.top = `${y}px`;

        const mochiChar = document.getElementById('mochiCharacter');
        if (!mochiChar) return;

        const mochiRect = mochiChar.getBoundingClientRect();
        const itemRect = draggableItem.getBoundingClientRect();

        if (
            itemRect.left < mochiRect.right &&
            itemRect.right > mochiRect.left &&
            itemRect.top < mochiRect.bottom &&
            itemRect.bottom > mochiRect.top
        ) {
            isDragging = false;
            draggableItem.classList.add('hidden');

            const mouth = document.getElementById('mochiMouth');
            const bubble = document.getElementById('mochiBubble');

            if (activeToolType === 'feed') {
                if (mouth) mouth.innerText = 'O';
                if (bubble) bubble.innerText = '"Nom nom! Ikan lezat! 😋"';
                mochiChar.classList.add('happy-eat');

                setTimeout(() => {
                    if (mouth) mouth.innerText = 'ω';
                    mochiChar.classList.remove('happy-eat');
                }, 1500);

                updateMochiAction("feed", 25);
            } else if (activeToolType === 'bath') {
                if (bubble) bubble.innerText = '"Mochi wangi & segar! 🫧"';
                mochiChar.classList.add('babbing-soap');

                setTimeout(() => {
                    mochiChar.classList.remove('babbing-soap');
                }, 1800);

                updateMochiAction("bath", 30);
            }
        }
    });

    draggableItem?.addEventListener('pointerup', () => { isDragging = false; });

    document.getElementById('mochiCharacter')?.addEventListener('click', () => {
        const mouth = document.getElementById('mochiMouth');
        const bubble = document.getElementById('mochiBubble');
        if (mouth) mouth.innerText = 'u';
        if (bubble) bubble.innerText = '"Purrr... Mochi sayang kalian! 💕"';
        setTimeout(() => { if (mouth) mouth.innerText = 'ω'; }, 1200);
        updateMochiAction("play", 15);
    });

    document.getElementById('btnPlayPet')?.addEventListener('click', () => {
        const bubble = document.getElementById('mochiBubble');
        if (bubble) bubble.innerText = '"Sentuh/ketuk Mochi langsung untuk puk-puk! 💕"';
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

    function listenRealtimeNotifications(spaceId) {
        if (!spaceId) return;

        const notifRef = collection(db, "couple_spaces", spaceId, "notifications");
        const q = query(notifRef, orderBy("timestamp", "desc"), limit(15));

        let isInitialLoad = true;

        onSnapshot(q, (snapshot) => {
            const logContainer = document.getElementById('activityLogList');
            if (logContainer) logContainer.innerHTML = '';

            if (snapshot.empty) {
                if (logContainer) logContainer.innerHTML = '<p class="empty-act">Belum ada aktivitas hari ini. Kirim Express Love yuk!</p>';
                return;
            }

            snapshot.docs.forEach((docSnap, index) => {
                const data = docSnap.data();
                const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                const item = document.createElement('div');
                item.className = 'act-item';
                item.innerHTML = `<span class="act-user">${data.senderName}</span> ${data.message} <span class="act-time">${timeStr}</span>`;
                if (logContainer) logContainer.appendChild(item);

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
            iconEl.innerText = type === "express" ? "💖" : (type === "mochi" ? "🐱" : (type === "pap" ? "📸" : (type === "note" ? "💌" : "😊")));
            titleEl.innerText = type === "express" ? "Express Love Masuk! 💖" : (type === "mochi" ? "Mochi Dirawat! 🐱" : (type === "pap" ? "PAP Baru Masuk! 📸" : (type === "note" ? "Heartnotes Baru! 💌" : "Mood Pasangan Update!")));
            msgEl.innerText = `${sender}: ${message}`;

            banner.classList.remove('hidden');
            setTimeout(() => banner.classList.add('hidden'), 5000);
        }
    }

    document.getElementById('closeNotifBtn')?.addEventListener('click', () => {
        document.getElementById('realtimeNotif')?.classList.add('hidden');
    });

    const hugModal = document.getElementById('hugModal');
    const moodModal = document.getElementById('moodModal');

    document.getElementById('btnHugModal')?.addEventListener('click', () => hugModal?.classList.remove('hidden'));
    document.getElementById('closeHugModal')?.addEventListener('click', () => hugModal?.classList.add('hidden'));

    document.getElementById('btnMoodModal')?.addEventListener('click', () => moodModal?.classList.remove('hidden'));
    document.getElementById('closeMoodModal')?.addEventListener('click', () => moodModal?.classList.add('hidden'));

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

    let selectedMood = "😊 Bahagia";
    document.querySelectorAll('.mood-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMood = btn.getAttribute('data-mood');
        });
    });

    document.getElementById('btnSaveMood')?.addEventListener('click', async () => {
        const note = document.getElementById('moodNoteInput')?.value;
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

});