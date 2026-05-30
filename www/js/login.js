(function () {
  "use strict";

  const PHONE_PREFIX = "+86";

  const els = {
    tabPhone: document.getElementById("tab-phone"),
    tabEmail: document.getElementById("tab-email"),
    sectionPhone: document.getElementById("section-phone"),
    sectionEmail: document.getElementById("section-email"),
    phoneInput: document.getElementById("phone-input"),
    sendCode: document.getElementById("send-code"),
    smsCode: document.getElementById("sms-code"),
    phoneLogin: document.getElementById("phone-login"),
    emailInput: document.getElementById("email-input"),
    passwordInput: document.getElementById("password-input"),
    passwordConfirm: document.getElementById("password-confirm"),
    emailSubmit: document.getElementById("email-submit"),
    emailModeToggle: document.getElementById("email-mode-toggle"),
    fieldConfirm: document.getElementById("field-confirm"),
    forgotPasswordWrap: document.getElementById("login-forgot-wrap"),
    forgotPassword: document.getElementById("forgot-password"),
    appleLoginWrap: document.getElementById("apple-login-wrap"),
    appleLogin: document.getElementById("apple-login"),
    appleLoginLabel: document.getElementById("apple-login-label"),
    msg: document.getElementById("auth-message"),
    recaptcha: document.getElementById("recaptcha-container"),
  };

  let recaptchaVerifier = null;
  let confirmationResult = null;
  let emailIsRegister = false;
  let applePluginRef = null;
  let applePluginResolved = false;

  function setMessage(text, type) {
    els.msg.textContent = text || "";
    els.msg.className = "msg" + (type ? " " + type : "");
  }

  function friendlyAuthError(err) {
    var code = err && err.code ? String(err.code) : "";
    if (code.indexOf("email-already-in-use") >= 0) {
      return "该邮箱已注册，请直接登录。";
    }
    if (code.indexOf("network-request-failed") >= 0) {
      return "网络连接失败：请检查手机网络/VPN，稍后再试。";
    }
    if (code.indexOf("invalid-credential") >= 0 || code.indexOf("wrong-password") >= 0) {
      return "邮箱或密码不正确。";
    }
    if (code.indexOf("user-not-found") >= 0) {
      return "该邮箱尚未注册，请先注册。";
    }
    if (code.indexOf("too-many-requests") >= 0) {
      return "请求过于频繁，请稍后再试。";
    }
    if (code.indexOf("invalid-email") >= 0) {
      return "邮箱格式不正确。";
    }
    if (code.indexOf("invalid-phone-number") >= 0) {
      return "手机号格式不正确。";
    }
    if (code.indexOf("invalid-verification-code") >= 0) {
      return "验证码不正确，请重新输入。";
    }
    if (code.indexOf("weak-password") >= 0) {
      return "密码强度太低，请至少设置 6 位。";
    }
    return "登录失败，请稍后重试。";
  }

  function friendlyPasswordResetError(err) {
    var code = err && err.code ? String(err.code) : "";
    if (code.indexOf("user-not-found") >= 0) {
      return "该邮箱尚未注册";
    }
    if (code.indexOf("invalid-email") >= 0) {
      return "邮箱格式不正确";
    }
    if (code.indexOf("too-many-requests") >= 0) {
      return "请求过于频繁，请稍后再试";
    }
    if (code.indexOf("network-request-failed") >= 0) {
      return "网络连接失败，请检查网络/VPN";
    }
    return "密码重置邮件发送失败，请稍后再试";
  }

  function waitAuthPersistenceReady(auth) {
    if (!auth || !firebase || !firebase.auth || !firebase.auth.Auth || !firebase.auth.Auth.Persistence) {
      return Promise.resolve();
    }
    return auth
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch(function (error) {
        console.warn("[auth] set LOCAL persistence failed:", error);
      });
  }

  function trySendEmailVerification(user) {
    if (!user || typeof user.sendEmailVerification !== "function") return Promise.resolve(false);
    return user
      .sendEmailVerification()
      .then(function () {
        return true;
      })
      .catch(function (error) {
        console.warn("[auth] send verify email failed:", error);
        return false;
      });
  }

  function setEmailLoading(isLoading, text) {
    if (!els.emailSubmit) return;
    els.emailSubmit.disabled = !!isLoading;
    els.emailSubmit.textContent = isLoading ? (text || "正在登录…") : (emailIsRegister ? "注册并进入" : "登录");
  }

  function setAppleLoading(isLoading) {
    if (!els.appleLogin) return;
    els.appleLogin.disabled = !!isLoading;
    els.appleLogin.classList.toggle("is-loading", !!isLoading);
    if (els.appleLoginLabel) {
      els.appleLoginLabel.textContent = isLoading ? "正在请求 Apple 授权…" : "Sign in with Apple";
    }
  }

  function setAppleVisibility(visible) {
    if (els.appleLoginWrap) els.appleLoginWrap.hidden = !visible;
    if (els.appleLogin) els.appleLogin.hidden = !visible;
  }

  function showRouteLoading(text) {
    var old = document.getElementById("route-loading-mask");
    if (old) old.remove();

    var mask = document.createElement("div");
    mask.id = "route-loading-mask";
    mask.innerHTML =
      '<div class="route-loading-card">' +
      '<div class="route-loading-spinner"></div>' +
      '<div class="route-loading-text">' + (text || "正在进入 Lumi…") + '</div>' +
      '</div>';
    document.body.appendChild(mask);
  }

  function logAuthStateChanged(user) {
    console.log(
      "[auth] auth state changed:",
      user ? "user" : "null",
      user ? "uid=" + user.uid : ""
    );
  }

  function logLoginUser(user) {
    console.log("[auth] login success user.uid:", user && user.uid ? user.uid : "");
    console.log("[auth] user.email:", user && user.email ? user.email : "");
    console.log("[auth] user.emailVerified:", !!(user && user.emailVerified));
  }

  function waitForAuthUser(auth, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("等待认证状态超时，请稍后重试。"));
      }, timeoutMs || 8000);
      var unsubscribe = auth.onAuthStateChanged(
        function (user) {
          logAuthStateChanged(user);
          if (!user) return;
          cleanup();
          resolve(user);
        },
        function (error) {
          cleanup();
          reject(error);
        }
      );

      function cleanup() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (typeof unsubscribe === "function") unsubscribe();
      }
    });
  }

  function completeLoginFlow(auth, userCredential, options) {
    var user = userCredential && userCredential.user;
    if (!user) {
      return Promise.reject(new Error("登录成功但未拿到用户信息。"));
    }

    logLoginUser(user);
    var showEmailTip = !!(options && options.showEmailVerifyTip);

    return syncUserToRealtimeDatabase(user)
      .then(function () {
        if (showEmailTip && user.email && !user.emailVerified) {
          setMessage("登录成功。建议完成邮箱验证，以便找回账号。", "info");
        } else {
          setMessage("登录成功，正在进入应用…", "success");
        }
        showRouteLoading("登录成功，正在进入 Lumi…");
        return waitForAuthUser(auth, 10000);
      })
      .then(function (authUser) {
        logLoginUser(authUser);
        window.location.href = "app/index.html";
      });
  }

  function getCapacitorRuntime() {
    if (typeof window === "undefined") return null;
    return window.Capacitor || null;
  }

  function isIOSNativeRuntime() {
    const cap = getCapacitorRuntime();
    return !!(
      cap &&
      typeof cap.isNativePlatform === "function" &&
      cap.isNativePlatform() &&
      typeof cap.getPlatform === "function" &&
      cap.getPlatform() === "ios"
    );
  }

  function getApplePlugin() {
    const cap = getCapacitorRuntime();
    if (!cap) return null;
    if (applePluginResolved) return applePluginRef;

    applePluginResolved = true;

    if (typeof cap.registerPlugin === "function") {
      try {
        const registered = cap.registerPlugin("SignInWithApple");
        if (registered) {
          applePluginRef = registered;
          return applePluginRef;
        }
      } catch (error) {
        console.warn("SignInWithApple registerPlugin failed:", error);
      }
    }

    if (cap.Plugins) {
      applePluginRef = cap.Plugins.SignInWithApple || cap.Plugins.SignInWithApplePlugin || null;
    } else {
      applePluginRef = null;
    }
    return applePluginRef;
  }

  function isAppleCancelError(err) {
    const code = err && err.code ? String(err.code).toLowerCase() : "";
    const message = err && err.message ? String(err.message).toLowerCase() : "";
    return (
      code.indexOf("cancel") >= 0 ||
      code.indexOf("canceled") >= 0 ||
      code.indexOf("1200") >= 0 ||
      message.indexOf("cancel") >= 0 ||
      message.indexOf("canceled") >= 0
    );
  }

  function friendlyAppleAuthError(err) {
    var code = err && err.code ? String(err.code).toLowerCase() : "";
    if (code.indexOf("invalid-credential") >= 0) {
      return "Apple 登录凭证无效，请重新尝试授权登录。";
    }
    if (code.indexOf("missing-or-invalid-nonce") >= 0 || code.indexOf("invalid_nonce") >= 0) {
      return "Apple 登录安全校验失败（nonce 无效），请重试。";
    }
    if (code.indexOf("account-exists-with-different-credential") >= 0) {
      return "该邮箱已绑定其他登录方式，请使用原方式登录后再处理账号绑定。";
    }
    if (code.indexOf("network-request-failed") >= 0) {
      return "网络连接失败：请检查手机网络/VPN，稍后再试。";
    }
    return "Apple 登录失败，请稍后重试。";
  }

  function onAppleLogin() {
    setMessage("");
    if (!isIOSNativeRuntime()) {
      setMessage("Apple 原生插件未就绪", "error");
      return;
    }

    const applePlugin = getApplePlugin();
    if (!applePlugin || typeof applePlugin.signIn !== "function") {
      setMessage("Apple 原生插件未就绪", "error");
      return;
    }

    setMessage("正在请求 Apple 授权…", "info");
    setAppleLoading(true);

    applePlugin
      .signIn({})
      .then(function (nativeResult) {
        const identityToken = nativeResult && (nativeResult.identityToken || nativeResult.idToken);
        const rawNonce = nativeResult && nativeResult.rawNonce;
        if (!identityToken) {
          throw new Error("未收到 identityToken");
        }
        if (!rawNonce) {
          throw new Error("未收到 rawNonce");
        }

        const firebaseContext = initFirebase();
        const auth = firebaseContext.auth;
        const provider = new firebase.auth.OAuthProvider("apple.com");
        const credential = provider.credential({
          idToken: identityToken,
          rawNonce: rawNonce,
        });

        setMessage("Apple 授权成功，正在登录…", "info");
        return auth.signInWithCredential(credential);
      })
      .then(function (userCredential) {
        return completeLoginFlow(initFirebase().auth, userCredential, {
          showEmailVerifyTip: true,
        });
      })
      .catch(function (err) {
        console.error(err);
        if (isAppleCancelError(err)) {
          setMessage("已取消登录", "info");
          return;
        }
        setMessage(friendlyAppleAuthError(err), "error");
      })
      .finally(function () {
        setAppleLoading(false);
      });
  }

  function showTab(which) {
    const isPhone = which === "phone";
    els.tabPhone.setAttribute("aria-selected", isPhone);
    els.tabEmail.setAttribute("aria-selected", !isPhone);
    els.sectionPhone.hidden = !isPhone;
    els.sectionEmail.hidden = isPhone;
    setMessage("");
  }

  function getE164Phone() {
    const raw = (els.phoneInput.value || "").replace(/\D/g, "");
    if (raw.length < 11) return null;
    return PHONE_PREFIX + raw.slice(-11);
  }

  function ensureRecaptcha() {
    if (recaptchaVerifier) return recaptchaVerifier;
    initFirebase();
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(els.recaptcha, {
      size: "invisible",
      callback: function () {},
    });
    recaptchaVerifier.render().catch(function (e) {
      console.error(e);
      setMessage("人机验证加载失败，请刷新页面重试。", "error");
    });
    return recaptchaVerifier;
  }

  function onSendCode() {
    setMessage("");
    const phone = getE164Phone();
    if (!phone) {
      setMessage("请输入有效的 11 位中国大陆手机号。", "error");
      return;
    }
    const { auth } = initFirebase();
    const appVerifier = ensureRecaptcha();
    els.sendCode.disabled = true;
    auth
      .signInWithPhoneNumber(phone, appVerifier)
      .then(function (result) {
        confirmationResult = result;
        setMessage("验证码已发送，请查收短信。", "success");
      })
      .catch(function (err) {
        console.error(err);
        setMessage(friendlyAuthError(err), "error");
        try {
          if (recaptchaVerifier) recaptchaVerifier.reset();
        } catch (_) {}
      })
      .finally(function () {
        els.sendCode.disabled = false;
      });
  }

  function onPhoneLogin() {
    setMessage("");
    if (!confirmationResult) {
      setMessage("请先获取验证码。", "error");
      return;
    }
    const code = (els.smsCode.value || "").trim();
    if (!code) {
      setMessage("请输入短信验证码。", "error");
      return;
    }
    els.phoneLogin.disabled = true;
    confirmationResult
      .confirm(code)
      .then(function (userCredential) {
        return completeLoginFlow(initFirebase().auth, userCredential, {
          showEmailVerifyTip: false,
        });
      })
      .catch(function (err) {
        console.error(err);
        setMessage(friendlyAuthError(err), "error");
      })
      .finally(function () {
        els.phoneLogin.disabled = false;
      });
  }

  function onEmailSubmit() {
    setMessage("");
    const email = (els.emailInput.value || "").trim();
    const password = els.passwordInput.value || "";
    if (!email || !password) {
      setMessage("请填写邮箱和密码。", "error");
      return;
    }
    if (emailIsRegister) {
      const confirm = els.passwordConfirm.value || "";
      if (password !== confirm) {
        setMessage("两次输入的密码不一致。", "error");
        return;
      }
      if (password.length < 6) {
        setMessage("密码长度至少 6 位。", "error");
        return;
      }
    }

    const { auth } = initFirebase();
    setMessage(emailIsRegister ? "正在注册账号…" : "正在登录，请稍候…", "info");
    setEmailLoading(true, emailIsRegister ? "正在注册…" : "正在登录…");

    const promise = emailIsRegister
      ? auth
          .createUserWithEmailAndPassword(email, password)
          .then(function (userCredential) {
            return trySendEmailVerification(userCredential && userCredential.user).then(function (sent) {
              if (sent) {
                setMessage("注册成功，验证邮件已发送。正在进入应用…", "info");
              } else {
                setMessage("注册成功。建议稍后在个人资料中完成邮箱验证。", "info");
              }
              return userCredential;
            });
          })
      : auth.signInWithEmailAndPassword(email, password);

    promise
      .then(function (userCredential) {
        return completeLoginFlow(auth, userCredential, {
          showEmailVerifyTip: true,
        });
      })
      .catch(function (err) {
        console.error(err);
        setMessage(friendlyAuthError(err), "error");
      })
      .finally(function () {
        setEmailLoading(false);
      });
  }

  function onForgotPassword() {
    const email = (els.emailInput.value || "").trim();
    if (!email) {
      setMessage("请先输入邮箱地址", "error");
      return;
    }

    const { auth } = initFirebase();
    setMessage("正在发送密码重置邮件…", "info");
    if (els.forgotPassword) els.forgotPassword.disabled = true;

    auth
      .sendPasswordResetEmail(email)
      .then(function () {
        setMessage("密码重置邮件已发送，请检查收件箱、垃圾邮件或推广邮件。", "success");
      })
      .catch(function (err) {
        console.error(err);
        setMessage(friendlyPasswordResetError(err), "error");
      })
      .finally(function () {
        if (els.forgotPassword) els.forgotPassword.disabled = false;
      });
  }

  function toggleEmailMode() {
    emailIsRegister = !emailIsRegister;
    els.fieldConfirm.hidden = !emailIsRegister;
    if (els.forgotPasswordWrap) els.forgotPasswordWrap.hidden = emailIsRegister;
    els.passwordConfirm.value = "";
    els.emailModeToggle.textContent = emailIsRegister
      ? "已有账号？去登录"
      : "没有账号？注册";
    els.emailSubmit.textContent = emailIsRegister ? "注册并进入" : "登录";
    setMessage("");
  }

  function restoreSessionAndMaybeRedirect(auth) {
    return new Promise(function (resolve) {
      var settled = false;
      var unsubscribe = auth.onAuthStateChanged(
        function (user) {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(user || null);
        },
        function () {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(auth.currentUser || null);
        }
      );
    }).then(function (user) {
      if (!user) return;
      setMessage("已恢复登录状态，正在进入应用…", "info");
      showRouteLoading("欢迎回来，正在进入 Lumi…");
      window.location.href = "app/index.html";
    });
  }

  function init() {
    showTab("email"); // force default email login
    const firebaseContext = initFirebase();
    waitAuthPersistenceReady(firebaseContext.auth)
      .then(function () {
        return restoreSessionAndMaybeRedirect(firebaseContext.auth);
      })
      .catch(function (error) {
        console.warn("[auth] restore session failed:", error);
      });
    setAppleVisibility(true);

    if (els.tabPhone) els.tabPhone.addEventListener("click", function () {
      showTab("phone");
    });
    if (els.tabEmail) els.tabEmail.addEventListener("click", function () {
      showTab("email");
    });

    if (els.sendCode) els.sendCode.addEventListener("click", onSendCode);
    if (els.phoneLogin) els.phoneLogin.addEventListener("click", onPhoneLogin);
    if (els.emailSubmit) els.emailSubmit.addEventListener("click", onEmailSubmit);
    if (els.forgotPassword) els.forgotPassword.addEventListener("click", onForgotPassword);
    if (els.appleLogin) els.appleLogin.addEventListener("click", onAppleLogin);
    if (els.emailModeToggle) els.emailModeToggle.addEventListener("click", toggleEmailMode);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
