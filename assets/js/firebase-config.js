/* =========================================================
   Firebase — pengaturan proyek

   Kunci di bawah ini MEMANG boleh terlihat publik. Pada aplikasi web,
   apiKey bukan kata sandi: fungsinya hanya menunjuk proyek mana yang
   dituju. Yang benar-benar menjaga data adalah aturan keamanan Firestore
   (lihat berkas firestore.rules), yang memastikan tiap akun cuma bisa
   membaca dan menulis datanya sendiri.
   ========================================================= */
(function (global) {
  'use strict';

  global.FIREBASE_CONFIG = {
    apiKey: 'AIzaSyC3M2-0TpWJCFChL4W_qAM58GBd9AkjmP8',
    authDomain: 'jalangkote-mama-gita.firebaseapp.com',
    projectId: 'jalangkote-mama-gita',
    storageBucket: 'jalangkote-mama-gita.firebasestorage.app',
    messagingSenderId: '617678756332',
    appId: '1:617678756332:web:d0c6ccf21701693d3a48c9'
  };
})(window);
