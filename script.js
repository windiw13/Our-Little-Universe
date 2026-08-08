// MODAL CONTROLS
const hugModal = document.getElementById('hugModal');
const moodModal = document.getElementById('moodModal');

document.getElementById('btnHugModal')?.addEventListener('click', () => hugModal.classList.remove('hidden'));
document.getElementById('closeHugModal')?.addEventListener('click', () => hugModal.classList.add('hidden'));

document.getElementById('btnMoodModal')?.addEventListener('click', () => moodModal.classList.remove('hidden'));
document.getElementById('closeMoodModal')?.addEventListener('click', () => moodModal.classList.add('hidden'));

// SEND HUG ACTION
document.querySelectorAll('.hug-opt-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const hugType = btn.getAttribute('data-type');
        alert(`Berhasil ngirim ${hugType} ke Rama! 🤍`);
        hugModal.classList.add('hidden');
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
    const note = document.getElementById('moodNoteInput').value;
    alert(`Mood hari ini (${selectedMood}) tersimpan! 🤍`);
    moodModal.classList.add('hidden');
});