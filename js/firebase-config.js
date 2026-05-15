/**
 * Firebase 配置。
 * Realtime Database：建议规则限制为 auth.uid === $uid 时读写 users/$uid/**。
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA08FMntvqszNWtUDNJOjEiIP8VjCHXflU",
  authDomain: "japanese-study-dxj.firebaseapp.com",
  databaseURL: "https://japanese-study-dxj-default-rtdb.firebaseio.com",
  projectId: "japanese-study-dxj",
  storageBucket: "japanese-study-dxj.firebasestorage.app",
  messagingSenderId: "15102852500",
  appId: "1:15102852500:web:8781630790dc2750666381",
  measurementId: "G-SHLK2SVBBW",
};

function initFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  
  return {
    auth: firebase.auth(),
    db: firebase.database(),
  };
}

function defaultDisplayName(user) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split("@")[0];
  if (user.phoneNumber) return user.phoneNumber.slice(-4);
  return "学习者";
}

/**
 * 登录后同步用户根节点，并确保 profile 子节点存在（符合 users/{uid}/profile 结构）。
 */
function syncUserToRealtimeDatabase(user) {
  const { db } = initFirebase();
  const uid = user.uid;
  const ref = db.ref("users/" + uid);
  const rootPayload = {
    lastLoginAt: firebase.database.ServerValue.TIMESTAMP,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    displayName: user.displayName || null,
  };
  return ref
    .update(rootPayload)
    .then(function () {
      return ref.child("profile").once("value");
    })
    .then(function (snap) {
      if (snap.exists()) return null;
      return ref.child("profile").set({
        name: defaultDisplayName(user),
        phone: user.phoneNumber || null,
        bio: "",
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      });
    });
}
