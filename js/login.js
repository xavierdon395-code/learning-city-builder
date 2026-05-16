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
    if (code.indexOf("network-request-failed") >= 0) {
      return "网络连接失败：请检查手机网络/VPN，稍后再试。";
    }
    if (code.indexOf("invalid-credential") >= 0 || code.indexOf("wrong-password") >= 0) {
      return "邮箱或密码不正确，请检查后重试。";
    }
    if (code.indexOf("user-not-found") >= 0) {
      return "这个邮箱还没有注册，请先点击“没有账号？注册”。";
    }
    if (code.indexOf("too-many-requests") >= 0) {
      return "尝试次数过多，请稍后再试。";
    }
    if (code.indexOf("invalid-email") >= 0) {
      return "邮箱格式不正确。";
    }
    if (code.indexOf("weak-password") >= 0) {
      return "密码强度太低，请至少设置 6 位。";
    }
    return (err && err.message) || "登录失败，请稍后重试。";
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
    return (err && err.message) || "Apple 登录失败，请稍后重试。";
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
        return syncUserToRealtimeDatabase(userCredential.user).then(function () {
          return userCredential;
        });
      })
      .then(function () {
        setMessage("登录成功，正在进入应用…", "success");
        showRouteLoading("登录成功，正在进入 Lumi…");
        setTimeout(function () {
          window.location.href = "app/index.html";
        }, 250);
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
        setMessage(err.message || "发送验证码失败，请检查 Firebase 手机号登录配置。", "error");
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
        return syncUserToRealtimeDatabase(userCredential.user).then(function () {
          return userCredential;
        });
      })
      .then(function () {
        setMessage("登录成功，正在进入应用…", "success");
        showRouteLoading("登录成功，正在进入 Lumi…");
        setTimeout(function () {
          window.location.href = "app/index.html";
        }, 250);
      })
      .catch(function (err) {
        console.error(err);
        setMessage(err.message || "验证码错误。", "error");
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
      ? auth.createUserWithEmailAndPassword(email, password)
      : auth.signInWithEmailAndPassword(email, password);

    promise
      .then(function (userCredential) {
        return syncUserToRealtimeDatabase(userCredential.user).then(function () {
          return userCredential;
        });
      })
      .then(function () {
        setMessage("登录成功，正在进入应用…", "success");
        showRouteLoading("登录成功，正在进入 Lumi…");
        setTimeout(function () {
          window.location.href = "app/index.html";
        }, 250);
      })
      .catch(function (err) {
        console.error(err);
        setMessage(friendlyAuthError(err), "error");
      })
      .finally(function () {
        setEmailLoading(false);
      });
  }

  function toggleEmailMode() {
    emailIsRegister = !emailIsRegister;
    els.fieldConfirm.hidden = !emailIsRegister;
    els.passwordConfirm.value = "";
    els.emailModeToggle.textContent = emailIsRegister
      ? "已有账号？去登录"
      : "没有账号？注册";
    els.emailSubmit.textContent = emailIsRegister ? "注册并进入" : "登录";
    setMessage("");
  }

  function init() {
    showTab("email"); // force default email login
    initFirebase();
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
    if (els.appleLogin) els.appleLogin.addEventListener("click", onAppleLogin);
    if (els.emailModeToggle) els.emailModeToggle.addEventListener("click", toggleEmailMode);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
